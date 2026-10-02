-- ═══════════════════════════════════════════════════════════════════
-- Partidas de juego validadas por la base (puntos 14, 15 y 21)
--
-- El cliente inserta su partida y la política solo controlaba que fuera
-- él. `intento` y `descuento_otorgado` los mandaba la aplicación, y
-- `calcular_cuenta` aplica ese porcentaje tal cual: una partida con
-- descuento 100 dejaba la cuenta en cero.
--
-- Ahora la base decide:
-- - se juega desde la propia estadía activa y con un pedido ya
--   confirmado por el mozo (punto 14: «puede acceder a juegos»);
-- - el número de intento lo cuenta la base;
-- - el descuento es el del juego (10, 15 o 20 %), solo si gana en el
--   primer intento y si la estadía todavía no tiene uno (no acumulativo).
-- Si gana o no lo sigue diciendo la aplicación: el juego corre ahí.
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.validar_partida()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_porcentaje numeric;
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

  new.intento := 1 + (
    select count(*) from public.partidas_juego
     where sesion_mesa_id = new.sesion_mesa_id and juego_id = new.juego_id
  );
  new.descuento_otorgado := case
    when new.gano
     and new.intento = 1
     and not exists (
       select 1 from public.partidas_juego
        where sesion_mesa_id = new.sesion_mesa_id and descuento_otorgado > 0
     )
    then v_porcentaje
    else 0
  end;
  new.jugado_en := now();
  return new;
end $$;

drop trigger if exists trg_validar_partida on public.partidas_juego;
create trigger trg_validar_partida
  before insert on public.partidas_juego
  for each row execute function public.validar_partida();

revoke execute on function public.validar_partida() from public, anon, authenticated;
