-- ═══════════════════════════════════════════════════════════════════
-- Puntos 16, 17 y 18 contra la base: RLS, triggers y aviso al mozo.
--
-- SOLO PARA LA BASE LOCAL. Se corre con
--
--   npx supabase start
--   npx supabase test db
--
-- y `supabase test db` apunta a la base local de Docker, nunca al
-- proyecto enlazado. Todo pasa dentro de una transacción que termina en
-- ROLLBACK: los usuarios, pedidos y secretos de prueba no sobreviven al
-- test. Los avisos encolados en pg_net tampoco salen, porque pg_net solo
-- envía lo que se confirmó.
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select no_plan();

-- ───────────────────────────────────────────────────────────────────
-- Personas: el trigger de auth.users arma cada perfil.
-- ───────────────────────────────────────────────────────────────────
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-000000000001', 'cocina.prueba@tumbo.test',
   '{"perfil":"cocinero"}', '{"nombres":"Cocina","apellidos":"Prueba","dni":"30111222","cuil":"20301112220"}'),
  ('00000000-0000-4000-8000-000000000002', 'bar.prueba@tumbo.test',
   '{"perfil":"cantinero"}', '{"nombres":"Bar","apellidos":"Prueba","dni":"30111223","cuil":"20301112239"}'),
  ('00000000-0000-4000-8000-000000000003', 'mozo.prueba@tumbo.test',
   '{"perfil":"mozo"}', '{"nombres":"Mozo","apellidos":"Prueba","dni":"30111224","cuil":"20301112247"}'),
  ('00000000-0000-4000-8000-000000000004', 'cliente.prueba@tumbo.test',
   '{"perfil":"cliente_registrado","estado":"aprobado"}', '{"nombres":"Cliente","apellidos":"Prueba","dni":"30111225"}');

-- Una estadía en la mesa 1 y los productos de cada sector.
insert into public.sesiones_mesa (id, mesa_id, cliente_id)
select '10000000-0000-4000-8000-000000000001', id, '00000000-0000-4000-8000-000000000004'
  from public.mesas where numero = 1;

create temp table producto_de (sector text, n int, id uuid) on commit drop;
insert into producto_de
select sector::text, row_number() over (partition by sector order by nombre), id
  from public.productos;
grant select on producto_de to authenticated;

-- P1: cocina (2 ítems) y bar (1), confirmado por el mozo.
-- P2: sin confirmar todavía.  P3: solo bar.  P4: borrador del cliente.
-- P5: solo cocina, para probar el caso sin secretos de Vault.
insert into public.pedidos (id, sesion_mesa_id, estado) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'confirmado'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'pendiente_confirmacion'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'confirmado'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'borrador'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'confirmado');

insert into public.pedido_items (pedido_id, producto_id, cantidad)
select '20000000-0000-4000-8000-000000000001'::uuid, id, 2 from producto_de where sector = 'cocina' and n <= 2
union all
select '20000000-0000-4000-8000-000000000001'::uuid, id, 1 from producto_de where sector = 'bar' and n = 1
union all
select '20000000-0000-4000-8000-000000000002'::uuid, id, 1 from producto_de where sector = 'cocina' and n = 1
union all
select '20000000-0000-4000-8000-000000000003'::uuid, id, 3 from producto_de where sector = 'bar' and n = 2
union all
select '20000000-0000-4000-8000-000000000005'::uuid, id, 1 from producto_de where sector = 'cocina' and n = 3;

select is(
  (select array_agg(distinct sector::text order by sector::text) from public.pedido_items
    where pedido_id = '20000000-0000-4000-8000-000000000001'),
  array['bar', 'cocina'],
  'el sector de cada ítem lo pone la base según el producto'
);

-- ───────────────────────────────────────────────────────────────────
-- Realtime
-- ───────────────────────────────────────────────────────────────────
select ok(
  exists (select 1 from pg_publication_tables
           where pubname = 'supabase_realtime' and tablename = 'pedidos'),
  'pedidos está en realtime: la cocina se entera sin recargar'
);
select ok(
  exists (select 1 from pg_publication_tables
           where pubname = 'supabase_realtime' and tablename = 'pedido_items'),
  'pedido_items está en realtime: el cliente ve cada sector sin recargar'
);

select is(
  (select array_agg(tablename::text order by tablename) from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'),
  array['cuentas', 'lista_espera', 'mensajes', 'mesas', 'pedido_items', 'pedidos', 'producto_fotos',
        'productos', 'usuarios'],
  'todas las tablas que la aplicación escucha en su canal están publicadas'
);

-- Secretos de Vault LOCALES. La dirección es un puerto cerrado del
-- propio contenedor: aunque algo se confirmara, no llegaría a ningún lado.
delete from vault.secrets where name in ('tumbo_url_funciones', 'tumbo_firma_webhook');
select vault.create_secret('http://127.0.0.1:9/functions/v1', 'tumbo_url_funciones');
select vault.create_secret('firma-solo-local', 'tumbo_firma_webhook');

create temp table cola_inicial on commit drop as
  select coalesce(max(id), 0) as id from net.http_request_queue;
grant select on cola_inicial to authenticated;

-- ───────────────────────────────────────────────────────────────────
-- Cocina (punto 16)
-- ───────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.pedidos
    where estado in ('confirmado', 'en_preparacion')
      and sesion_mesa_id = '10000000-0000-4000-8000-000000000001'),
  3,
  'el cocinero ve los pedidos confirmados de todas las mesas'
);

update public.pedido_items set estado = 'en_preparacion'
 where pedido_id = '20000000-0000-4000-8000-000000000001' and sector = 'cocina';

select is(
  (select estado::text from public.pedidos where id = '20000000-0000-4000-8000-000000000001'),
  'en_preparacion',
  'apenas la cocina empieza, el pedido pasa a «en preparación»'
);

update public.pedido_items set estado = 'listo'
 where pedido_id = '20000000-0000-4000-8000-000000000001' and sector = 'bar';
select is(
  (select estado::text from public.pedido_items
    where pedido_id = '20000000-0000-4000-8000-000000000001' and sector = 'bar'),
  'pendiente',
  'el cocinero no puede marcar los ítems del bar'
);

select throws_ok(
  $$ update public.pedido_items set cantidad = 9
      where pedido_id = '20000000-0000-4000-8000-000000000001' and sector = 'cocina' $$,
  '42501',
  'El sector solo puede cambiar el estado de sus ítems.',
  'el cocinero no puede cambiar la cantidad'
);

select throws_ok(
  $$ update public.pedido_items set estado = 'pendiente'
      where pedido_id = '20000000-0000-4000-8000-000000000001' and sector = 'cocina' $$,
  '42501',
  'Un ítem no puede volver a un estado anterior.',
  'un ítem no vuelve atrás'
);

select throws_ok(
  $$ update public.pedido_items set estado = 'listo'
      where pedido_id = '20000000-0000-4000-8000-000000000002' and sector = 'cocina' $$,
  '42501',
  'El pedido no está en preparación.',
  'un pedido sin confirmar por el mozo no se puede preparar'
);

update public.pedido_items set estado = 'listo', listo_en = '2000-01-01'
 where pedido_id = '20000000-0000-4000-8000-000000000001' and sector = 'cocina';

select is(
  (select estado::text from public.pedidos where id = '20000000-0000-4000-8000-000000000001'),
  'en_preparacion',
  'con la cocina lista y el bar pendiente, el pedido sigue en preparación'
);
select ok(
  (select bool_and(listo_en > now() - interval '1 minute') from public.pedido_items
    where pedido_id = '20000000-0000-4000-8000-000000000001' and sector = 'cocina'),
  'la hora de listo la pone la base, no el reloj del teléfono'
);
select is(
  (select count(*)::int from net.http_request_queue where id > (select id from cola_inicial)),
  0,
  'todavía no se avisó al mozo'
);

-- ───────────────────────────────────────────────────────────────────
-- Bar (punto 17) y pedido completo (punto 18)
-- ───────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

update public.pedido_items set estado = 'listo'
 where pedido_id = '20000000-0000-4000-8000-000000000001' and sector = 'bar';

select is(
  (select estado::text from public.pedidos where id = '20000000-0000-4000-8000-000000000001'),
  'listo',
  'cuando el último sector termina, el pedido queda listo'
);
select isnt(
  (select listo_en from public.pedidos where id = '20000000-0000-4000-8000-000000000001'),
  null,
  'el pedido guarda cuándo quedó completo'
);

reset role;
select is(
  (select count(*)::int from net.http_request_queue where id > (select id from cola_inicial)),
  1,
  'el mozo recibe exactamente un aviso'
);
select is(
  (select url from net.http_request_queue where id > (select id from cola_inicial)),
  'http://127.0.0.1:9/functions/v1/avisar-push',
  'el aviso va a avisar-push, con la dirección de Vault'
);
select is(
  (select convert_from(body, 'utf8')::jsonb from net.http_request_queue
    where id > (select id from cola_inicial)),
  '{"type":"UPDATE","table":"pedidos","record":{"id":"20000000-0000-4000-8000-000000000001","estado":"listo"}}'::jsonb,
  'el aviso dice qué pedido quedó listo'
);
select is(
  (select headers ->> 'x-tumbo-firma' from net.http_request_queue
    where id > (select id from cola_inicial)),
  'firma-solo-local',
  'el aviso va firmado con la firma de Vault'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
-- Así repite la aplicación un toque doble: solo sobre lo que no está listo.
update public.pedido_items set estado = 'listo'
 where pedido_id = '20000000-0000-4000-8000-000000000001' and sector = 'bar'
   and estado in ('pendiente', 'en_preparacion');
select throws_ok(
  $$ update public.pedido_items set estado = 'listo'
      where pedido_id = '20000000-0000-4000-8000-000000000001' and sector = 'bar' $$,
  '42501',
  'El pedido no está en preparación.',
  'un pedido ya completo no se vuelve a tocar desde el sector'
);
reset role;
select is(
  (select count(*)::int from net.http_request_queue where id > (select id from cola_inicial)),
  1,
  'repetir el «listo» no vuelve a avisar'
);

-- Un pedido de solo bebidas no espera a la cocina.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
update public.pedido_items set estado = 'listo'
 where pedido_id = '20000000-0000-4000-8000-000000000003';
select is(
  (select estado::text from public.pedidos where id = '20000000-0000-4000-8000-000000000003'),
  'listo',
  'un pedido de solo bebidas queda listo cuando termina el bar'
);
reset role;
select is(
  (select count(*)::int from net.http_request_queue where id > (select id from cola_inicial)),
  2,
  'y también avisa al mozo'
);

-- ───────────────────────────────────────────────────────────────────
-- El cliente no puede tocar el estado de preparación
-- ───────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

update public.pedido_items set estado = 'listo'
 where pedido_id = '20000000-0000-4000-8000-000000000005';
select is(
  (select estado::text from public.pedido_items
    where pedido_id = '20000000-0000-4000-8000-000000000005'),
  'pendiente',
  'el cliente no puede marcar listo un pedido confirmado'
);

insert into public.pedido_items (pedido_id, producto_id, cantidad, estado, listo_en)
select '20000000-0000-4000-8000-000000000004'::uuid, id, 1, 'listo', now()
  from producto_de where sector = 'cocina' and n = 1;
select is(
  (select estado::text from public.pedido_items where pedido_id = '20000000-0000-4000-8000-000000000004'),
  'pendiente',
  'un ítem que el cliente agrega nace pendiente aunque diga otra cosa'
);
select throws_ok(
  $$ update public.pedido_items set estado = 'listo'
      where pedido_id = '20000000-0000-4000-8000-000000000004' $$,
  '42501',
  'El estado de preparación lo cambian cocina y bar.',
  'el cliente no puede dejar su ítem como preparado'
);
select lives_ok(
  $$ update public.pedido_items set cantidad = 2
      where pedido_id = '20000000-0000-4000-8000-000000000004' $$,
  'el cliente sigue pudiendo cambiar la cantidad de su borrador'
);

-- ───────────────────────────────────────────────────────────────────
-- Sin secretos de Vault, el pedido queda listo igual y no se avisa
-- ───────────────────────────────────────────────────────────────────
reset role;
delete from vault.secrets where name in ('tumbo_url_funciones', 'tumbo_firma_webhook');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
update public.pedido_items set estado = 'listo'
 where pedido_id = '20000000-0000-4000-8000-000000000005';
select is(
  (select estado::text from public.pedidos where id = '20000000-0000-4000-8000-000000000005'),
  'listo',
  'sin secretos el pedido queda listo igual'
);
reset role;
select is(
  (select count(*)::int from net.http_request_queue where id > (select id from cola_inicial)),
  2,
  'sin secretos no se encola ningún aviso: una base local nunca llama a producción'
);

select * from finish();
rollback;
