-- ═══════════════════════════════════════════════════════════════════
-- Punto 12 contra la base: el cliente envía su pedido con enviar_pedido.
-- SOLO PARA LA BASE LOCAL (`npx supabase test db`), con ROLLBACK.
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000041', 'cliente12.prueba@tumbo.test',
   '{"perfil":"cliente_registrado","estado":"aprobado"}', '{"nombres":"Ana","apellidos":"Prueba","dni":"30111241"}'),
  ('00000000-0000-4000-8000-000000000042', 'sinmesa12.prueba@tumbo.test',
   '{"perfil":"cliente_registrado","estado":"aprobado"}', '{"nombres":"Beto","apellidos":"Prueba","dni":"30111242"}'),
  ('00000000-0000-4000-8000-000000000043', 'mozo12.prueba@tumbo.test',
   '{"perfil":"mozo"}', '{"nombres":"Mozo","apellidos":"Prueba","dni":"30111224","cuil":"20301112247"}');
insert into public.sesiones_mesa (id, mesa_id, cliente_id)
select '41000000-0000-4000-8000-000000000001', id, '00000000-0000-4000-8000-000000000041'
  from public.mesas where numero = 4;

create temp table producto_de on commit drop as
  select nombre, id::text as id, precio from public.productos;
grant select on producto_de to authenticated;
create function pg_temp.item(p_nombre text, p_cantidad numeric) returns jsonb language sql as $$
  select jsonb_build_object('producto_id', (select id from producto_de where nombre = p_nombre), 'cantidad', p_cantidad)
$$;

select ok(not has_function_privilege('anon', 'public.enviar_pedido(jsonb)', 'execute'),
  'un visitante sin sesión no puede enviar pedidos');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000042","role":"authenticated"}', true);
select throws_ok($$ select public.enviar_pedido(jsonb_build_array(pg_temp.item('Bife de chorizo', 1))) $$,
  '42501', 'No tenés una mesa en curso.', 'sin mesa no hay pedido');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000043","role":"authenticated"}', true);
select throws_ok($$ select public.enviar_pedido(jsonb_build_array(pg_temp.item('Bife de chorizo', 1))) $$,
  '42501', 'El pedido lo hace el cliente desde su mesa.', 'el personal no envía pedidos como cliente');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000041","role":"authenticated"}', true);
select throws_ok($$ select public.enviar_pedido('[]'::jsonb) $$, '22023',
  'Agregá productos antes de enviar el pedido.', 'un pedido vacío se rechaza');
select throws_ok($$ select public.enviar_pedido(jsonb_build_array(pg_temp.item('Bife de chorizo', 0))) $$, '22023',
  'La cantidad de cada producto va de 1 a 20.', 'cantidad cero se rechaza');
select throws_ok($$ select public.enviar_pedido(jsonb_build_array(pg_temp.item('Bife de chorizo', 2.5))) $$, '22023',
  'La cantidad de cada producto va de 1 a 20.', 'cantidad fraccionaria se rechaza');
select throws_ok($$ select public.enviar_pedido('[{"producto_id":"00000000-0000-0000-0000-000000000000","cantidad":1}]'::jsonb) $$,
  '22023', 'Hay un producto que ya no está en la carta.', 'un producto inexistente se rechaza');
select throws_ok($$ select public.enviar_pedido(jsonb_build_array(pg_temp.item('Bife de chorizo', 1), pg_temp.item('Bife de chorizo', 2))) $$,
  '22023', 'Un producto aparece repetido en el pedido.', 'un producto repetido se rechaza');

select lives_ok(
  $$ select public.enviar_pedido(jsonb_build_array(pg_temp.item('Bife de chorizo', 2), pg_temp.item('Café espresso', 1))) $$,
  'el cliente con mesa envía su pedido');

reset role;
select results_eq(
  $$ select p.estado::text, count(i.*)::int, sum(i.cantidad * i.precio_unitario),
            bool_and(i.estado = 'pendiente'), p.enviado_en is not null
       from public.pedidos p join public.pedido_items i on i.pedido_id = p.id
      where p.sesion_mesa_id = '41000000-0000-4000-8000-000000000001'
      group by p.id $$,
  $$ values ('pendiente_confirmacion', 2,
             (select 2 * precio + (select precio from producto_de where nombre = 'Café espresso') from producto_de where nombre = 'Bife de chorizo'),
             true, true) $$,
  'el pedido queda pendiente de confirmación, con sus ítems pendientes y el precio de la carta'
);
select is(
  (select array_agg(sector::text order by sector::text) from public.pedido_items i
     join public.pedidos p on p.id = i.pedido_id where p.sesion_mesa_id = '41000000-0000-4000-8000-000000000001'),
  array['bar', 'cocina'], 'cada ítem va a su sector'
);

-- Con la cuenta pedida ya no se agregan pedidos.
update public.sesiones_mesa set estado = 'cuenta_solicitada' where id = '41000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000041","role":"authenticated"}', true);
select throws_ok($$ select public.enviar_pedido(jsonb_build_array(pg_temp.item('Bife de chorizo', 1))) $$,
  '42501', 'Ya pediste la cuenta: no se pueden agregar pedidos.', 'con la cuenta pedida no se agregan pedidos');

reset role;
select * from finish();
rollback;
