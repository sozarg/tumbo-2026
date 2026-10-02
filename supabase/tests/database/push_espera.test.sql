-- ═══════════════════════════════════════════════════════════════════
-- Push de la lista de espera (puntos 9 y 10) y realtime de las
-- notificaciones. SOLO PARA LA BASE LOCAL, con ROLLBACK.
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000091', 'espera9.prueba@tumbo.test',
   '{"perfil":"cliente_registrado","estado":"aprobado"}', '{"nombres":"Lía","apellidos":"Prueba","dni":"30111291"}'),
  ('00000000-0000-4000-8000-000000000092', 'metre9.prueba@tumbo.test',
   '{"perfil":"metre"}', '{"nombres":"Metre","apellidos":"Prueba","dni":"30111224","cuil":"20301112247"}');

delete from vault.secrets where name in ('tumbo_url_funciones', 'tumbo_firma_webhook');
select vault.create_secret('http://127.0.0.1:9/functions/v1', 'tumbo_url_funciones');
select vault.create_secret('firma-solo-local', 'tumbo_firma_webhook');
create temp table cola on commit drop as select coalesce(max(id), 0) as id from net.http_request_queue;
grant select on cola to authenticated;
create temp view avisos as
  select convert_from(body, 'utf8')::jsonb as cuerpo from net.http_request_queue
   where id > (select id from cola) and convert_from(body, 'utf8')::jsonb ->> 'table' = 'lista_espera';

select ok(
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notificaciones'),
  'notificaciones está en realtime: sin ella Realtime rechaza el canal entero de la aplicación'
);
select ok(not has_function_privilege('authenticated', 'public.avisar_espera()', 'execute'),
  'nadie puede disparar el aviso de la espera a mano');

-- 9: el cliente se anota (como lo hace la aplicación, con su sesión).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000091","role":"authenticated"}', true);
insert into public.lista_espera (id, cliente_id)
values ('91000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000091');
reset role;
select results_eq($$ select cuerpo->>'type' || ':' || (cuerpo->'record'->>'estado') from avisos $$,
  $$ values ('INSERT:esperando') $$, '9 · anotarse en la espera encola el aviso al metre');

-- 10: el metre asigna la mesa con la función de la rama del punto 10.
update cola set id = (select coalesce(max(id), 0) from net.http_request_queue);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000092","role":"authenticated"}', true);
select public.asignar_mesa_a_cliente('91000000-0000-4000-8000-000000000001',
  (select id from public.mesas where numero = 5));
reset role;
select results_eq($$ select cuerpo->>'type' || ':' || (cuerpo->'record'->>'estado') from avisos $$,
  $$ values ('UPDATE:asignado') $$, '10 · asignar la mesa encola el aviso al cliente');

-- Quitar a alguien de la lista no avisa a nadie.
update cola set id = (select coalesce(max(id), 0) from net.http_request_queue);
update public.lista_espera set estado = 'eliminado', mesa_id = null, asignado_en = null
 where id = '91000000-0000-4000-8000-000000000001';
select is((select count(*)::int from avisos), 0, 'quitar a alguien de la espera no manda push');

select * from finish();
rollback;
