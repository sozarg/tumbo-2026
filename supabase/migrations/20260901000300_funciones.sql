-- migrations/20260901000300_funciones.sql

-- ─────────────────────────────────────────────────────────────
-- Helpers de perfil.
-- SECURITY DEFINER es imprescindible: sin él, consultar la tabla
-- usuarios desde una política RLS sobre usuarios causa recursión.
-- ─────────────────────────────────────────────────────────────
create or replace function public.perfil_actual()
returns perfil_usuario
language sql stable security definer set search_path = public
as $$ select perfil from public.usuarios where id = auth.uid() $$;

create or replace function public.es_gerencia()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.perfil_actual() in ('dueno','supervisor') $$;

create or replace function public.es_staff()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.perfil_actual() in
     ('dueno','supervisor','metre','mozo','cocinero','cantinero') $$;

create or replace function public.es_cliente()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.perfil_actual() in
     ('cliente_registrado','cliente_anonimo') $$;

-- ─────────────────────────────────────────────────────────────
-- actualizado_en automático
-- ─────────────────────────────────────────────────────────────
create or replace function public.tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create trigger trg_usuarios_actualizado before update on public.usuarios
  for each row execute function public.tocar_actualizado_en();
create trigger trg_mesas_actualizado before update on public.mesas
  for each row execute function public.tocar_actualizado_en();
create trigger trg_productos_actualizado before update on public.productos
  for each row execute function public.tocar_actualizado_en();

-- ─────────────────────────────────────────────────────────────
-- El sector del ítem se hereda del producto, no lo manda el cliente
-- ─────────────────────────────────────────────────────────────
create or replace function public.completar_datos_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p record;
begin
  select precio, sector into p from public.productos where id = new.producto_id;
  new.precio_unitario := coalesce(new.precio_unitario, p.precio);
  new.sector := p.sector;
  return new;
end $$;

create trigger trg_item_completar before insert on public.pedido_items
  for each row execute function public.completar_datos_item();

-- ─────────────────────────────────────────────────────────────
-- Cuando TODOS los ítems quedan listos, el pedido pasa a 'listo'.
-- Implementa el punto 18: "solo se informará cuando el pedido, en
-- los sectores intervinientes, esté completo".
-- ─────────────────────────────────────────────────────────────
create or replace function public.evaluar_pedido_listo()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pendientes integer;
begin
  select count(*) into pendientes
    from public.pedido_items
   where pedido_id = new.pedido_id and estado <> 'listo';

  if pendientes = 0 then
    update public.pedidos
       set estado = 'listo', listo_en = now()
     where id = new.pedido_id and estado <> 'listo';
  elsif new.estado = 'en_preparacion' then
    update public.pedidos
       set estado = 'en_preparacion'
     where id = new.pedido_id and estado = 'confirmado';
  end if;

  return new;
end $$;

create trigger trg_evaluar_pedido after update of estado on public.pedido_items
  for each row execute function public.evaluar_pedido_listo();

-- ─────────────────────────────────────────────────────────────
-- Cálculo de la cuenta. Vive en la base para que el número del
-- cliente y el del mozo sean SIEMPRE el mismo (punto 21).
-- ─────────────────────────────────────────────────────────────
create or replace function public.calcular_cuenta(p_sesion_id uuid)
returns table (
  subtotal numeric, descuento_pct numeric, descuento_monto numeric,
  base numeric
)
language sql stable security definer set search_path = public as $$
  with items as (
    select coalesce(sum(i.cantidad * i.precio_unitario), 0) as st
      from public.pedido_items i
      join public.pedidos p on p.id = i.pedido_id
     where p.sesion_mesa_id = p_sesion_id
       and p.estado in ('confirmado','en_preparacion','listo','entregado','pagado')
  ),
  desc_juego as (
    select coalesce(max(descuento_otorgado), 0) as pct
      from public.partidas_juego
     where sesion_mesa_id = p_sesion_id
  )
  select
    items.st,
    desc_juego.pct,
    round(items.st * desc_juego.pct / 100, 2),
    round(items.st - (items.st * desc_juego.pct / 100), 2)
  from items, desc_juego;
$$;

-- ─────────────────────────────────────────────────────────────
-- Al confirmar el pago, la mesa vuelve a estar libre (punto 22)
-- ─────────────────────────────────────────────────────────────
create or replace function public.liberar_mesa_al_confirmar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'confirmada' and old.estado <> 'confirmada' then
    update public.sesiones_mesa
       set estado = 'cerrada', cerrada_en = now()
     where id = new.sesion_mesa_id;

    update public.mesas m
       set estado = 'libre'
      from public.sesiones_mesa s
     where s.id = new.sesion_mesa_id and m.id = s.mesa_id;
  end if;
  return new;
end $$;

create trigger trg_liberar_mesa after update on public.cuentas
  for each row execute function public.liberar_mesa_al_confirmar();
