-- ═══════════════════════════════════════════════════════════════════
-- Puntos 20, 21 y 22 contra la base: cuenta, pago, liberación de la
-- mesa, avisos y encuesta.
--
-- SOLO PARA LA BASE LOCAL (`npx supabase test db`). Todo pasa dentro de
-- una transacción que termina en ROLLBACK.
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-4000-8000-000000000021', 'cocina22.prueba@tumbo.test',
   '{"perfil":"cocinero"}', '{"nombres":"Cocina","apellidos":"Prueba","dni":"30111222","cuil":"20301112220"}'),
  ('00000000-0000-4000-8000-000000000023', 'mozo22.prueba@tumbo.test',
   '{"perfil":"mozo"}', '{"nombres":"Mozo","apellidos":"Prueba","dni":"30111224","cuil":"20301112247"}'),
  ('00000000-0000-4000-8000-000000000024', 'clientea22.prueba@tumbo.test',
   '{"perfil":"cliente_registrado","estado":"aprobado"}', '{"nombres":"Ana","apellidos":"Prueba","dni":"30111225"}'),
  ('00000000-0000-4000-8000-000000000025', 'clienteb22.prueba@tumbo.test',
   '{"perfil":"cliente_registrado","estado":"aprobado"}', '{"nombres":"Beto","apellidos":"Prueba","dni":"30111226"}'),
  ('00000000-0000-4000-8000-000000000026', 'clientec22.prueba@tumbo.test',
   '{"perfil":"cliente_registrado","estado":"aprobado"}', '{"nombres":"Ceci","apellidos":"Prueba","dni":"30111227"}');

-- A en la mesa 1 (pedido recibido) · B en la mesa 3 (pedido entregado, sin recibir).
insert into public.lista_espera (id, cliente_id, estado, mesa_id, asignado_en)
select '31000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000024', 'asignado', id, now()
  from public.mesas where numero = 1;
insert into public.sesiones_mesa (id, mesa_id, cliente_id)
select '32000000-0000-4000-8000-00000000000a', id, '00000000-0000-4000-8000-000000000024'
  from public.mesas where numero = 1;
insert into public.sesiones_mesa (id, mesa_id, cliente_id)
select '32000000-0000-4000-8000-00000000000b', id, '00000000-0000-4000-8000-000000000025'
  from public.mesas where numero = 3;

insert into public.pedidos (id, sesion_mesa_id, estado, recibido_en) values
  ('33000000-0000-4000-8000-00000000000a', '32000000-0000-4000-8000-00000000000a', 'entregado', now()),
  ('33000000-0000-4000-8000-00000000000b', '32000000-0000-4000-8000-00000000000b', 'entregado', null);
insert into public.pedido_items (pedido_id, producto_id, cantidad)
select '33000000-0000-4000-8000-00000000000a', id, 2 from public.productos where nombre = 'Bife de chorizo';

delete from vault.secrets where name in ('tumbo_url_funciones', 'tumbo_firma_webhook');
select vault.create_secret('http://127.0.0.1:9/functions/v1', 'tumbo_url_funciones');
select vault.create_secret('firma-solo-local', 'tumbo_firma_webhook');
create temp table cola on commit drop as select coalesce(max(id), 0) as id from net.http_request_queue;
grant select on cola to authenticated;
create temp view avisos as
  select convert_from(body, 'utf8')::jsonb as cuerpo from net.http_request_queue
   where id > (select id from cola);

select ok(
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'cuentas'),
  'cuentas está en realtime: el mozo ve una cuenta pedida sin recargar'
);
select ok(
  not has_function_privilege('anon', 'public.solicitar_cuenta()', 'execute')
  and not has_function_privilege('anon', 'public.responder_encuesta(jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.encolar_aviso(jsonb)', 'execute'),
  'las funciones nuevas no están abiertas a visitantes y el envío de avisos es interno'
);

-- ───────────────────────────────────────────────────────────────────
-- Punto 21: pedir la cuenta
-- ───────────────────────────────────────────────────────────────────
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000025","role":"authenticated"}', true);
select throws_ok($$ select public.solicitar_cuenta() $$, '42501',
  'Confirmá que recibiste tu pedido para pedir la cuenta.',
  'sin recibir el pedido no se pide la cuenta');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000026","role":"authenticated"}', true);
select throws_ok($$ select public.solicitar_cuenta() $$, '42501', 'No tenés una mesa en curso.',
  'sin mesa no hay cuenta');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000024","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.cuentas (sesion_mesa_id) values ('32000000-0000-4000-8000-00000000000a') $$,
  '42501', null, 'el cliente no puede crear la cuenta a mano');

select lives_ok($$ select public.solicitar_cuenta() $$, 'el cliente con el pedido recibido pide la cuenta');
select is((select count(*)::int from public.cuentas where sesion_mesa_id = '32000000-0000-4000-8000-00000000000a'), 1, 'queda una cuenta pendiente');
select lives_ok($$ select public.solicitar_cuenta() $$, 'pedirla de nuevo no falla');
select is((select count(*)::int from public.cuentas where sesion_mesa_id = '32000000-0000-4000-8000-00000000000a'), 1, 'y no crea otra');

reset role;
select is(
  (select estado::text from public.sesiones_mesa where id = '32000000-0000-4000-8000-00000000000a'),
  'cuenta_solicitada', 'la estadía pasa a «cuenta solicitada»');
select is(
  (select count(*)::int from avisos where cuerpo ->> 'table' = 'cuentas' and cuerpo ->> 'type' = 'INSERT'),
  1, 'al pedir la cuenta se avisa una vez al mozo');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000024","role":"authenticated"}', true);

-- ───────────────────────────────────────────────────────────────────
-- Punto 21: propina por QR, detalle y pago
-- ───────────────────────────────────────────────────────────────────
select throws_ok($$ select public.pagar_cuenta() $$, '42501', 'Escaneá un QR de propina antes de pagar.',
  'sin propina no se paga');
select throws_ok($$ select public.generar_cuenta('TUMBO://mesa/tumbo-mesa-1') $$, '22023',
  'Ese código no es un QR de propina.', 'un QR que no es de propina se rechaza');

select lives_ok($$ select public.generar_cuenta('TUMBO://propina/10') $$, 'el QR de propina genera la cuenta');
select results_eq(
  $$ select subtotal, propina_pct, propina_monto, total from public.cuentas
      where sesion_mesa_id = '32000000-0000-4000-8000-00000000000a' $$,
  $$ select 37000::numeric, 10::numeric, 3700::numeric, 40700::numeric $$,
  'la base calcula subtotal, propina y total (2 × $18.500 + 10 %)'
);
select lives_ok($$ select public.generar_cuenta('20') $$, 'se puede cambiar la propina antes de pagar');
select is((select total from public.cuentas where sesion_mesa_id = '32000000-0000-4000-8000-00000000000a'), 44400::numeric, 'con 20 % el total pasa a $44.400');

update public.cuentas set total = 1, estado = 'confirmada'
 where sesion_mesa_id = '32000000-0000-4000-8000-00000000000a';
select is((select total from public.cuentas where sesion_mesa_id = '32000000-0000-4000-8000-00000000000a'), 44400::numeric,
  'un UPDATE directo del cliente no cambia nada: ya no tiene permiso');

select lives_ok($$ select public.pagar_cuenta() $$, 'el cliente paga');
select throws_ok($$ select public.generar_cuenta('5') $$, '42501', 'La cuenta ya fue pagada.',
  'pagada, ya no se cambia la propina');
select throws_ok(
  $$ select public.confirmar_pago((select id from public.cuentas where sesion_mesa_id = '32000000-0000-4000-8000-00000000000a')) $$, '42501',
  'El pago lo confirma el mozo.', 'el cliente no puede confirmar su propio pago');

reset role;
select is((select estado::text from public.cuentas where sesion_mesa_id = '32000000-0000-4000-8000-00000000000a'), 'pagada', 'la cuenta queda pagada');
select is((select count(*)::int from avisos where cuerpo -> 'record' ->> 'estado' = 'pagada'),
  1, 'al pagar se avisa una vez');

-- ───────────────────────────────────────────────────────────────────
-- Punto 22: confirmar el pago y liberar la mesa
-- ───────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000021","role":"authenticated"}', true);
select throws_ok(
  $$ select public.confirmar_pago((select id from public.cuentas where sesion_mesa_id = '32000000-0000-4000-8000-00000000000a')) $$, '42501',
  'El pago lo confirma el mozo.', 'la cocina no confirma pagos');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000023","role":"authenticated"}', true);
select lives_ok($$ select public.confirmar_pago((select id from public.cuentas where sesion_mesa_id = '32000000-0000-4000-8000-00000000000a')) $$, 'el mozo confirma el pago');
select throws_ok(
  $$ select public.confirmar_pago((select id from public.cuentas where sesion_mesa_id = '32000000-0000-4000-8000-00000000000a')) $$, '42501',
  'Esa cuenta todavía no fue pagada.', 'no se confirma dos veces');

reset role;
select results_eq(
  $$ select (select estado::text from public.cuentas where sesion_mesa_id = '32000000-0000-4000-8000-00000000000a'),
            (select estado::text from public.sesiones_mesa where id = '32000000-0000-4000-8000-00000000000a'),
            (select estado::text from public.mesas where numero = 1),
            (select estado::text from public.pedidos where id = '33000000-0000-4000-8000-00000000000a'),
            (select estado::text || ' sin mesa: ' || (mesa_id is null) from public.lista_espera
              where id = '31000000-0000-4000-8000-00000000000a') $$,
  $$ values ('confirmada', 'cerrada', 'libre', 'pagado', 'finalizado sin mesa: true') $$,
  'confirmar el pago cierra la estadía, libera la mesa, salda el pedido y termina la espera'
);
select ok(
  (select mozo_id = '00000000-0000-4000-8000-000000000023' from public.cuentas where sesion_mesa_id = '32000000-0000-4000-8000-00000000000a'),
  'queda registrado qué mozo confirmó'
);
select is((select count(*)::int from avisos where cuerpo -> 'record' ->> 'estado' = 'confirmada'),
  1, 'al confirmar se avisa una vez a gerencia');

-- La mesa liberada se puede volver a asignar y el que pagó no se re-vincula.
insert into public.lista_espera (id, cliente_id, estado)
values ('31000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-000000000026', 'esperando');
select lives_ok(
  $$ update public.lista_espera
        set estado = 'asignado', asignado_en = now(), mesa_id = (select id from public.mesas where numero = 1)
      where id = '31000000-0000-4000-8000-00000000000c' $$,
  'la mesa liberada se puede asignar a otra persona'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000024","role":"authenticated"}', true);
select throws_ok(
  $$ select public.vincular_mesa_asignada('tumbo-mesa-1') $$, 'P0001', null,
  'quien ya pagó no puede volver a sentarse escaneando el QR'
);

-- ───────────────────────────────────────────────────────────────────
-- Punto 20: encuesta
-- ───────────────────────────────────────────────────────────────────
reset role;
-- Una estadía nueva de C, con el pedido recibido, para responder.
insert into public.sesiones_mesa (id, mesa_id, cliente_id)
select '32000000-0000-4000-8000-00000000000c', id, '00000000-0000-4000-8000-000000000026'
  from public.mesas where numero = 1;
insert into public.pedidos (sesion_mesa_id, estado, recibido_en)
values ('32000000-0000-4000-8000-00000000000c', 'entregado', now());

create temp table pregunta_de on commit drop as select tipo::text as tipo, id::text as id from public.preguntas_encuesta;
grant select on pregunta_de to authenticated;
create function pg_temp.respuestas(p_cambios jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object(
    (select id from pregunta_de where tipo = 'estrellas'), 5,
    (select id from pregunta_de where tipo = 'radio'), 'Rápido',
    (select id from pregunta_de where tipo = 'checkbox'), jsonb_build_array('La comida', 'El ambiente'),
    (select id from pregunta_de where tipo = 'select'), 'Redes sociales',
    (select id from pregunta_de where tipo = 'rango'), 8,
    (select id from pregunta_de where tipo = 'interruptor'), true,
    (select id from pregunta_de where tipo = 'texto_largo'), 'Excelente.'
  ) || p_cambios
$$;

create temp table antes on commit drop as select public.resultados_encuesta() as r;
grant select on antes to authenticated;
create function pg_temp.cantidad(p_r jsonb, p_grafico text, p_etiqueta text) returns int language sql as $$
  select (d ->> 'cantidad')::int from jsonb_array_elements(p_r -> p_grafico -> 'datos') d
   where d ->> 'etiqueta' = p_etiqueta
$$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000025","role":"authenticated"}', true);
select throws_ok($$ select public.responder_encuesta(pg_temp.respuestas()) $$, '42501',
  'Confirmá que recibiste tu pedido para responder la encuesta.', 'sin recepción no hay encuesta');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000026","role":"authenticated"}', true);
select throws_ok(
  $$ select public.responder_encuesta(pg_temp.respuestas(jsonb_build_object((select id from pregunta_de where tipo = 'estrellas'), 6))) $$,
  '22023', null, 'estrellas fuera de 1 a 5 se rechaza');
select throws_ok(
  $$ select public.responder_encuesta(pg_temp.respuestas(jsonb_build_object((select id from pregunta_de where tipo = 'radio'), 'Inventada'))) $$,
  '22023', null, 'una opción que no existe se rechaza');
select throws_ok(
  $$ select public.responder_encuesta(pg_temp.respuestas(jsonb_build_object((select id from pregunta_de where tipo = 'checkbox'), '["La comida","La comida"]'::jsonb))) $$,
  '22023', null, 'opciones repetidas se rechazan');
select throws_ok(
  $$ select public.responder_encuesta(pg_temp.respuestas(jsonb_build_object((select id from pregunta_de where tipo = 'interruptor'), 'si'))) $$,
  '22023', null, 'el interruptor tiene que ser sí o no');
select throws_ok(
  $$ select public.responder_encuesta(pg_temp.respuestas() - (select id from pregunta_de where tipo = 'select')) $$,
  '22023', null, 'una pregunta requerida sin responder se rechaza');
select throws_ok(
  $$ insert into public.encuestas (sesion_mesa_id, cliente_id)
     values ('32000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-000000000026') $$,
  '42501', null, 'no se puede crear la encuesta a mano, salteando la validación');

select ok(not public.encuesta_respondida(), 'antes de responder figura pendiente');
select lives_ok(
  $$ select public.responder_encuesta(pg_temp.respuestas() - (select id from pregunta_de where tipo = 'texto_largo')) $$,
  'una encuesta válida se guarda (las opcionales pueden faltar)');
select ok(public.encuesta_respondida(), 'después figura respondida');
select is(
  (select count(*)::int from public.respuestas_encuesta r join public.encuestas e on e.id = r.encuesta_id
    where e.sesion_mesa_id = '32000000-0000-4000-8000-00000000000c'),
  6, 'se guardan las seis respuestas dadas');
select throws_ok($$ select public.responder_encuesta(pg_temp.respuestas()) $$, '42501',
  'Ya respondiste la encuesta de esta estadía.', 'una sola encuesta por estadía');

select is(
  pg_temp.cantidad(public.resultados_encuesta(), 'torta', 'Rápido')
    - pg_temp.cantidad((select r from antes), 'torta', 'Rápido'),
  1, 'el gráfico de torta suma la respuesta nueva'
);
select is(
  pg_temp.cantidad(public.resultados_encuesta(), 'barras', 'La comida')
    - pg_temp.cantidad((select r from antes), 'barras', 'La comida'),
  1, 'el gráfico de barras suma cada opción marcada'
);
select is(
  (public.resultados_encuesta() ->> 'total')::int - ((select r from antes) ->> 'total')::int,
  1, 'el total de encuestas suma una'
);
select isnt(
  public.resultados_encuesta() -> 'linea' -> 'datos' -> 3 ->> 'promedio', null,
  'la línea tiene el promedio de la semana actual'
);

reset role;
select * from finish();
rollback;
