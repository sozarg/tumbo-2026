-- ═══════════════════════════════════════════════════════════════════
-- Punto 12: el cliente envía su pedido.
--
-- La aplicación creaba el pedido ya «pendiente de confirmación» y
-- después le insertaba los ítems. Pero la política `items_cliente_edita`
-- solo deja al cliente escribir ítems con el pedido en borrador o
-- rechazado: la base rechazaba los ítems y el pedido quedaba vacío. En
-- la base real ningún pedido de un cliente llegaba nunca al mozo, y con
-- eso se cortaba todo lo que sigue (puntos 13 a 22).
--
-- `enviar_pedido` crea el pedido y sus ítems juntos, en una sola
-- transacción. El precio lo pone la base (`completar_datos_item`): el
-- teléfono solo dice qué producto y cuántos.
--
-- Un pedido rechazado (punto 13) se corrige mandando uno nuevo: el
-- rechazado queda en el historial y `calcular_cuenta` no lo cobra.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.enviar_pedido(p_items jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_sesion public.sesiones_mesa := public.mi_estadia_en_curso();
  v_item jsonb;
  v_cantidad int;
  v_pedido uuid;
begin
  if public.perfil_actual() is null
     or public.perfil_actual() not in ('cliente_registrado', 'cliente_anonimo')
     or not public.esta_habilitado() then
    raise exception 'El pedido lo hace el cliente desde su mesa.' using errcode = '42501';
  end if;
  if v_sesion.id is null then
    raise exception 'No tenés una mesa en curso.' using errcode = '42501';
  end if;
  if v_sesion.estado <> 'activa' then
    raise exception 'Ya pediste la cuenta: no se pueden agregar pedidos.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Agregá productos antes de enviar el pedido.' using errcode = '22023';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item -> 'cantidad') is distinct from 'number' then
      raise exception 'Cada producto tiene que tener una cantidad.' using errcode = '22023';
    end if;
    v_cantidad := (v_item ->> 'cantidad')::numeric;
    if v_cantidad::numeric <> (v_item ->> 'cantidad')::numeric or v_cantidad < 1 or v_cantidad > 20 then
      raise exception 'La cantidad de cada producto va de 1 a 20.' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.productos
       where id::text = v_item ->> 'producto_id' and activo
    ) then
      raise exception 'Hay un producto que ya no está en la carta.' using errcode = '22023';
    end if;
  end loop;

  if (select count(distinct e ->> 'producto_id') from jsonb_array_elements(p_items) e)
     <> jsonb_array_length(p_items) then
    raise exception 'Un producto aparece repetido en el pedido.' using errcode = '22023';
  end if;

  insert into public.pedidos (sesion_mesa_id, estado, enviado_en)
  values (v_sesion.id, 'pendiente_confirmacion', now())
  returning id into v_pedido;

  -- Sin precio ni sector: los completa `completar_datos_item` desde la carta.
  insert into public.pedido_items (pedido_id, producto_id, cantidad)
  select v_pedido, (e ->> 'producto_id')::uuid, (e ->> 'cantidad')::int
    from jsonb_array_elements(p_items) e;

  return v_pedido;
end $$;

revoke execute on function public.enviar_pedido(jsonb) from public, anon;
grant execute on function public.enviar_pedido(jsonb) to authenticated;
