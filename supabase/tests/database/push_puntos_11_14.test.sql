-- ═══════════════════════════════════════════════════════════════════
-- Push de los puntos 11 a 14 contra la base: qué avisos se encolan
-- cuando el cliente pide, el mozo rechaza o confirma, y en la consulta.
--
-- SOLO PARA LA BASE LOCAL (`npx supabase test db`), con ROLLBACK. La
-- URL de Vault apunta a un puerto cerrado: nada sale de la máquina.
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000051', 'cliente14.prueba@tumbo.test',
   '{"perfil":"cliente_registrado","estado":"aprobado"}', '{"nombres":"Ana","apellidos":"Prueba","dni":"30111251"}'),
  ('00000000-0000-4000-8000-000000000052', 'mozo14.prueba@tumbo.test',
   '{"perfil":"mozo"}', '{"nombres":"Mozo","apellidos":"Prueba","dni":"30111224","cuil":"20301112247"}');
insert into public.sesiones_mesa (id, mesa_id, cliente_id)
select '51000000-0000-4000-8000-000000000001', id, '00000000-0000-4000-8000-000000000051'
  from public.mesas where numero = 4;

create temp table producto_de on commit drop as
  select nombre, id::text as id from public.productos;
grant select on producto_de to authenticated;
create function pg_temp.item(p_nombre text, p_cantidad int) returns jsonb language sql as $$
  select jsonb_build_object('producto_id', (select id from producto_de where nombre = p_nombre), 'cantidad', p_cantidad)
$$;

delete from vault.secrets where name in ('tumbo_url_funciones', 'tumbo_firma_webhook');
select vault.create_secret('http://127.0.0.1:9/functions/v1', 'tumbo_url_funciones');
select vault.create_secret('firma-solo-local', 'tumbo_firma_webhook');
create temp table cola on commit drop as select coalesce(max(id), 0) as id from net.http_request_queue;
grant select on cola to authenticated;
create temp view avisos as
  select convert_from(body, 'utf8')::jsonb as cuerpo from net.http_request_queue
   where id > (select id from cola);
create function pg_temp.avisos_de(p_tabla text) returns setof text language sql as $$
  select (cuerpo->>'type') || ':' || coalesce(cuerpo->'record'->>'estado', cuerpo->'record'->>'tipo')
    from avisos where cuerpo->>'table' = p_tabla order by 1
$$;
create function pg_temp.reiniciar_cola() returns void language sql as $$
  update cola set id = (select coalesce(max(id), 0) from net.http_request_queue)
$$;

select ok(
  not has_function_privilege('authenticated', 'public.avisar_cambio_de_pedido()', 'execute')
  and not has_function_privilege('anon', 'public.avisar_mensaje()', 'execute'),
  'nadie puede disparar los avisos a mano'
);

-- ── 12: el cliente envía el pedido ─────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000051","role":"authenticated"}', true);
select public.enviar_pedido(jsonb_build_array(pg_temp.item('Bife de chorizo', 2), pg_temp.item('Café espresso', 1)));
reset role;

create temp table el_pedido on commit drop as
  select id from public.pedidos where sesion_mesa_id = '51000000-0000-4000-8000-000000000001';
grant select on el_pedido to authenticated;

select results_eq($$ select pg_temp.avisos_de('pedidos') $$, $$ values ('INSERT:pendiente_confirmacion') $$,
  '12 · enviar el pedido encola un solo aviso para los mozos');
select is((select cuerpo->'record'->>'id' from avisos where cuerpo->>'table' = 'pedidos'),
  (select id::text from el_pedido), '12 · el aviso nombra a ese pedido');
select is((select count(*)::int from avisos where cuerpo->>'table' = 'pedido_items'), 0,
  '12 · los ítems no generan avisos sueltos');

-- ── 13: el mozo lo rechaza con motivo ──────────────────────────────
select pg_temp.reiniciar_cola();
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000052","role":"authenticated"}', true);
update public.pedidos set estado = 'rechazado', motivo_rechazo = 'No queda bife de chorizo'
 where id = (select id from el_pedido) and estado = 'pendiente_confirmacion';
reset role;
select results_eq($$ select pg_temp.avisos_de('pedidos') $$, $$ values ('UPDATE:rechazado') $$,
  '13 · rechazar encola el aviso al cliente');

-- El cliente corrige y vuelve a enviar: un pedido nuevo, un aviso nuevo a los mozos.
select pg_temp.reiniciar_cola();
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000051","role":"authenticated"}', true);
select public.enviar_pedido(jsonb_build_array(pg_temp.item('Café espresso', 2)));
reset role;
select results_eq($$ select pg_temp.avisos_de('pedidos') $$, $$ values ('INSERT:pendiente_confirmacion') $$,
  '13 · el pedido reenviado vuelve a avisar a los mozos');

-- ── 14: el mozo confirma ───────────────────────────────────────────
select pg_temp.reiniciar_cola();
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000052","role":"authenticated"}', true);
update public.pedidos set estado = 'confirmado', confirmado_en = now(), mozo_id = '00000000-0000-4000-8000-000000000052'
 where sesion_mesa_id = '51000000-0000-4000-8000-000000000001' and estado = 'pendiente_confirmacion';
reset role;
select results_eq($$ select pg_temp.avisos_de('pedidos') $$, $$ values ('UPDATE:confirmado') $$,
  '14 · confirmar encola un aviso para derivar a cocina y bar');

-- Cambios que no son del circuito no avisan de nuevo.
select pg_temp.reiniciar_cola();
update public.pedidos set confirmado_en = now()
 where sesion_mesa_id = '51000000-0000-4000-8000-000000000001' and estado = 'confirmado';
select is((select count(*)::int from avisos where cuerpo->>'table' = 'pedidos'), 0,
  'tocar otra columna del pedido no repite el aviso');

-- ── 11: consulta y respuesta ───────────────────────────────────────
select pg_temp.reiniciar_cola();
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000051","role":"authenticated"}', true);
insert into public.mensajes (sesion_mesa_id, autor_id, tipo, cuerpo)
values ('51000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', 'consulta', '¿Tienen opciones sin TACC?');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000052","role":"authenticated"}', true);
insert into public.mensajes (sesion_mesa_id, autor_id, tipo, cuerpo)
values ('51000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000052', 'respuesta', 'Sí, el flan.');
reset role;
select results_eq($$ select pg_temp.avisos_de('mensajes') $$, $$ values ('INSERT:consulta'), ('INSERT:respuesta') $$,
  '11 · la consulta y la respuesta encolan un aviso cada una');

-- ── Interruptor del historial ──────────────────────────────────────
select pg_temp.reiniciar_cola();
select set_config('tumbo.sin_avisos', 'si', true);
insert into public.mensajes (sesion_mesa_id, autor_id, tipo, cuerpo)
values ('51000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000051', 'consulta', 'Histórico');
select is((select count(*)::int from avisos), 0, 'con tumbo.sin_avisos no se encola nada (carga del historial)');

select * from finish();
rollback;
