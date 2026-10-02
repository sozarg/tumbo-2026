-- ═══════════════════════════════════════════════════════════════════
-- Avisos del registro (puntos 5 a 8) y permisos de las funciones.
-- SOLO PARA LA BASE LOCAL (`npx supabase test db`), con ROLLBACK. La
-- URL de Vault apunta a un puerto cerrado: nada sale de la máquina.
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

delete from vault.secrets where name in ('tumbo_url_funciones', 'tumbo_firma_webhook');
select vault.create_secret('http://127.0.0.1:9/functions/v1/', 'tumbo_url_funciones');
select vault.create_secret('firma-solo-local', 'tumbo_firma_webhook');
create temp table cola on commit drop as select coalesce(max(id), 0) as id from net.http_request_queue;
create temp view avisos as
  select url, headers, convert_from(body, 'utf8')::jsonb as cuerpo from net.http_request_queue
   where id > (select id from cola);

-- ── Punto 6: alguien se registra ───────────────────────────────────
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000061', 'registro6.prueba@tumbo.test',
   '{"perfil":"cliente_registrado","estado":"pendiente"}', '{"nombres":"Rita","apellidos":"Prueba","dni":"30111261"}');

select is((select estado::text from public.usuarios where id = '00000000-0000-4000-8000-000000000061'),
  'pendiente', 'el registro crea el usuario pendiente (el trigger de auth sigue andando sin EXECUTE público)');
select results_eq(
  $$ select url, headers->>'x-tumbo-firma', cuerpo->>'table', cuerpo->'record'->>'estado' from avisos $$,
  $$ values ('http://127.0.0.1:9/functions/v1/avisar-push', 'firma-solo-local', 'usuarios', 'pendiente') $$,
  '6 · un registro encola una push a gerencia con la dirección y la firma de Vault'
);

-- ── Puntos 7 y 8: se resuelve el registro ──────────────────────────
update cola set id = (select coalesce(max(id), 0) from net.http_request_queue);
update public.usuarios set estado = 'aprobado' where id = '00000000-0000-4000-8000-000000000061';
select results_eq(
  $$ select url, headers->>'x-tumbo-firma', cuerpo->'record'->>'estado', cuerpo->'old_record'->>'estado' from avisos $$,
  $$ values ('http://127.0.0.1:9/functions/v1/avisar-cliente', 'firma-solo-local', 'aprobado', 'pendiente') $$,
  '8 · aprobar encola el correo al cliente'
);

update cola set id = (select coalesce(max(id), 0) from net.http_request_queue);
update public.usuarios set nombres = 'Rita Ana' where id = '00000000-0000-4000-8000-000000000061';
select is((select count(*)::int from avisos), 0, 'cambiar otro dato del cliente no manda correo');

-- Un empleado nuevo no le avisa a gerencia como si fuera un cliente.
update cola set id = (select coalesce(max(id), 0) from net.http_request_queue);
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000062', 'mozo6.prueba@tumbo.test',
   '{"perfil":"mozo"}', '{"nombres":"Mozo","apellidos":"Prueba","dni":"30111224","cuil":"20301112247"}');
select is((select count(*)::int from avisos where cuerpo->>'table' = 'usuarios'), 0,
  'el alta de un empleado no avisa como cliente pendiente');

-- ── Sin secretos no sale nada ──────────────────────────────────────
delete from vault.secrets where name = 'tumbo_firma_webhook';
update cola set id = (select coalesce(max(id), 0) from net.http_request_queue);
update public.usuarios set estado = 'rechazado' where id = '00000000-0000-4000-8000-000000000061';
select is((select count(*)::int from avisos), 0, 'sin la firma en Vault el aviso no sale (y el cambio se guarda igual)');
select is((select estado::text from public.usuarios where id = '00000000-0000-4000-8000-000000000061'),
  'rechazado', 'el rechazo quedó guardado');

-- ── Permisos ───────────────────────────────────────────────────────
select ok(
  not has_function_privilege('anon', 'public.avisar_cliente_pendiente()', 'execute')
  and not has_function_privilege('authenticated', 'public.avisar_registro_cliente()', 'execute')
  and not has_function_privilege('anon', 'public.manejar_usuario_nuevo()', 'execute')
  and not has_function_privilege('anon', 'public.completar_datos_item()', 'execute')
  and not has_function_privilege('anon', 'public.evaluar_pedido_listo()', 'execute')
  and not has_function_privilege('anon', 'public.proteger_columnas_de_autorizacion()', 'execute')
  and not has_function_privilege('authenticated', 'public.encolar_a(text, jsonb)', 'execute'),
  'las funciones de trigger y de envío no se pueden llamar por la API'
);
select ok(
  not has_function_privilege('anon', 'public.calcular_cuenta(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.calcular_cuenta(uuid)', 'execute'),
  'calcular_cuenta: sin sesión no, con sesión sí'
);
select ok(
  has_function_privilege('anon', 'public.resultados_encuesta()', 'execute')
  and not has_function_privilege('anon', 'public.responder_encuesta(jsonb)', 'execute'),
  'puntos 9 y 22: sin cuenta se consultan los resultados, pero no se responde la encuesta'
);
select ok(
  (select proconfig::text like '%search_path=public%' from pg_proc where proname = 'tocar_actualizado_en'),
  'tocar_actualizado_en tiene search_path fijo'
);

select * from finish();
rollback;
