-- ═══════════════════════════════════════════════════════════════════
-- EL DESCUENTO LO DECIDE LA PRIMERA PARTIDA DE LA VISITA (punto 15)
--
-- QUÉ ESTABA MAL
--
-- `intento` se contaba POR JUEGO: cada juego tenía su propio «primer
-- intento». Así que quien perdía la primera partida de la memoria
-- —10 %— se iba a piedra, papel o tijera, jugaba su «primer intento» y
-- se llevaba el 20 %. Perder no costaba nada: alcanzaba con ir
-- probando juegos hasta ganar uno, y encima el de mayor porcentaje.
--
-- QUÉ DICE EL PUNTO
--
-- «Solo se aplica el primer beneficio ganado en el primer intento.»
-- El profesor lo precisó: el primer intento es uno solo por visita, no
-- uno por juego. La PRIMERA partida que la persona juega en su estadía
-- es la que define todo:
--
-- - si la gana, se lleva el porcentaje de ESE juego;
-- - si la pierde, esta visita no tiene descuento, juegue lo que juegue
--   después.
--
-- Seguir jugando sigue permitido —«una vez obtenido, puede acceder
-- libremente a todos los juegos»—, solo que ya no paga.
--
-- QUÉ CAMBIA
--
-- `intento` pasa a contar las partidas de la VISITA y no las de cada
-- juego. Con eso la regla queda legible en la propia fila: hay
-- descuento si y solo si `intento = 1 and gano`. El único
-- `(sesion_mesa_id, juego_id, intento)` sigue valiendo: numerando por
-- visita los valores son distintos entre sí dentro de la estadía.
--
-- Las validaciones de mesa y de pedido confirmado quedan igual.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.validar_partida()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_porcentaje numeric;
  v_previas integer;
begin
  if not exists (
    select 1 from public.sesiones_mesa s
     where s.id = new.sesion_mesa_id and s.cliente_id = new.cliente_id and s.estado = 'activa'
  ) then
    raise exception 'Solo podés jugar desde tu mesa en curso.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.pedidos p
     where p.sesion_mesa_id = new.sesion_mesa_id
       and p.estado in ('confirmado', 'en_preparacion', 'listo', 'entregado')
  ) then
    raise exception 'Los juegos se habilitan cuando el mozo confirma tu pedido.' using errcode = '42501';
  end if;

  select porcentaje_descuento into v_porcentaje
    from public.juegos where id = new.juego_id and activo;
  if not found then
    raise exception 'Ese juego no está disponible.' using errcode = '22023';
  end if;

  -- Todas las partidas de la visita, de cualquier juego.
  select count(*) into v_previas
    from public.partidas_juego
   where sesion_mesa_id = new.sesion_mesa_id;

  new.intento := v_previas + 1;

  /*
   * Sin `not exists (... descuento_otorgado > 0)`: ya no hace falta.
   * Esa condición existía para que no se acumularan dos descuentos, y
   * con una sola partida habilitada por visita no hay forma de que
   * haya dos. La regla entra entera en una línea.
   */
  new.descuento_otorgado := case
    when new.gano and v_previas = 0 then v_porcentaje
    else 0
  end;

  new.jugado_en := now();
  return new;
end $$;

comment on function public.validar_partida() is
  'Numera las partidas de la visita y otorga descuento solo a la primera, si se ganó (punto 15).';
