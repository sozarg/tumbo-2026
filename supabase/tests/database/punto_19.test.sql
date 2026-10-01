-- ═══════════════════════════════════════════════════════════════════
-- Punto 19 contra la base: entrega del mozo, recepción del cliente y
-- lo que se habilita después (encuesta y cuenta).
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
  ('00000000-0000-4000-8000-000000000011', 'cocina19.prueba@tumbo.test',
   '{"perfil":"cocinero"}', '{"nombres":"Cocina","apellidos":"Prueba","dni":"30111222","cuil":"20301112220"}'),
  ('00000000-0000-4000-8000-000000000013', 'mozo19.prueba@tumbo.test',
   '{"perfil":"mozo"}', '{"nombres":"Mozo","apellidos":"Prueba","dni":"30111224","cuil":"20301112247"}'),
  ('00000000-0000-4000-8000-000000000014', 'clientea.prueba@tumbo.test',
   '{"perfil":"cliente_registrado","estado":"aprobado"}', '{"nombres":"Ana","apellidos":"Prueba","dni":"30111225"}'),
  ('00000000-0000-4000-8000-000000000015', 'clienteb.prueba@tumbo.test',
   '{"perfil":"cliente_registrado","estado":"aprobado"}', '{"nombres":"Beto","apellidos":"Prueba","dni":"30111226"}');

-- A en la mesa 1, B en la mesa 3.
insert into public.sesiones_mesa (id, mesa_id, cliente_id)
select '11000000-0000-4000-8000-00000000000a', id, '00000000-0000-4000-8000-000000000014'
  from public.mesas where numero = 1;
insert into public.sesiones_mesa (id, mesa_id, cliente_id)
select '11000000-0000-4000-8000-00000000000b', id, '00000000-0000-4000-8000-000000000015'
  from public.mesas where numero = 3;

-- P1 (A) listo · P2 (A) confirmado · P3 (B) listo · P4 (A) borrador.
insert into public.pedidos (id, sesion_mesa_id, estado) values
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-00000000000a', 'listo'),
  ('21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-00000000000a', 'confirmado'),
  ('21000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-00000000000b', 'listo'),
  ('21000000-0000-4000-8000-000000000004', '11000000-0000-4000-8000-00000000000a', 'borrador');

select has_column('public', 'pedidos', 'recibido_en', 'existe pedidos.recibido_en');
select ok(
  not has_function_privilege('anon', 'public.confirmar_recepcion(uuid)', 'execute'),
  'un visitante sin sesión no puede llamar a confirmar_recepcion'
);

-- ───────────────────────────────────────────────────────────────────
-- Entrega
-- ───────────────────────────────────────────────────────────────────
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000011","role":"authenticated"}', true);
select throws_ok(
  $$ update public.pedidos set estado = 'entregado' where id = '21000000-0000-4000-8000-000000000001' $$,
  '42501', 'El pedido lo entrega el mozo.',
  'la cocina no puede marcar un pedido entregado'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000014","role":"authenticated"}', true);
update public.pedidos set estado = 'entregado' where id = '21000000-0000-4000-8000-000000000001';
select is(
  (select estado::text from public.pedidos where id = '21000000-0000-4000-8000-000000000001'),
  'listo',
  'el cliente no puede marcarse el pedido como entregado'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000013","role":"authenticated"}', true);
select throws_ok(
  $$ update public.pedidos set estado = 'entregado' where id = '21000000-0000-4000-8000-000000000002' $$,
  '42501', 'Solo se puede entregar un pedido listo.',
  'el mozo no puede entregar un pedido que no está listo'
);

update public.pedidos set estado = 'entregado', entregado_en = '2000-01-01'
 where id = '21000000-0000-4000-8000-000000000001';
select is(
  (select estado::text from public.pedidos where id = '21000000-0000-4000-8000-000000000001'),
  'entregado',
  'el mozo entrega un pedido listo'
);
select ok(
  (select entregado_en > now() - interval '1 minute' from public.pedidos
    where id = '21000000-0000-4000-8000-000000000001'),
  'la hora de entrega la pone la base'
);

select throws_ok(
  $$ update public.pedidos set recibido_en = now() where id = '21000000-0000-4000-8000-000000000001' $$,
  '42501', 'La recepción la confirma el cliente desde su pedido.',
  'el mozo no puede confirmar la recepción por el cliente'
);
select throws_ok(
  $$ select public.confirmar_recepcion('21000000-0000-4000-8000-000000000001') $$,
  '42501', 'Ese pedido no es de tu mesa.',
  'tampoco con la función: el pedido no es suyo'
);

-- ───────────────────────────────────────────────────────────────────
-- Antes de la recepción: ni encuesta ni cuenta
-- ───────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000014","role":"authenticated"}', true);

select throws_ok(
  $$ insert into public.encuestas (sesion_mesa_id, cliente_id)
     values ('11000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000014') $$,
  '42501', null,
  'sin recepción no se puede responder la encuesta'
);
select throws_ok(
  $$ insert into public.cuentas (sesion_mesa_id) values ('11000000-0000-4000-8000-00000000000a') $$,
  '42501', null,
  'sin recepción no se puede pedir la cuenta'
);
select throws_ok(
  $$ update public.pedidos set recibido_en = now() where id = '21000000-0000-4000-8000-000000000004' $$,
  '42501', 'La recepción la confirma el cliente desde su pedido.',
  'el cliente no puede escribir recibido_en a mano, ni en su borrador'
);

-- ───────────────────────────────────────────────────────────────────
-- Recepción
-- ───────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000015","role":"authenticated"}', true);
select throws_ok(
  $$ select public.confirmar_recepcion('21000000-0000-4000-8000-000000000001') $$,
  '42501', 'Ese pedido no es de tu mesa.',
  'otro cliente no puede confirmar un pedido ajeno'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000014","role":"authenticated"}', true);
select throws_ok(
  $$ select public.confirmar_recepcion('21000000-0000-4000-8000-000000000002') $$,
  '42501', 'El mozo todavía no entregó este pedido.',
  'no se confirma un pedido que no se entregó'
);
select lives_ok(
  $$ select public.confirmar_recepcion('21000000-0000-4000-8000-000000000001') $$,
  'el cliente confirma la recepción de su pedido entregado'
);
select ok(
  (select recibido_en is not null from public.pedidos where id = '21000000-0000-4000-8000-000000000001'),
  'queda guardado cuándo lo recibió'
);
select throws_ok(
  $$ select public.confirmar_recepcion('21000000-0000-4000-8000-000000000001') $$,
  '42501', 'Ya confirmaste que recibiste este pedido.',
  'la recepción se confirma una sola vez'
);

-- ───────────────────────────────────────────────────────────────────
-- Después de la recepción: encuesta y cuenta, solo de la estadía propia
-- ───────────────────────────────────────────────────────────────────
select throws_ok(
  $$ insert into public.encuestas (sesion_mesa_id, cliente_id)
     values ('11000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-000000000014') $$,
  '42501', null,
  'no se responde la encuesta de una estadía ajena'
);
select lives_ok(
  $$ insert into public.encuestas (sesion_mesa_id, cliente_id)
     values ('11000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000014') $$,
  'con el pedido recibido se habilita la encuesta'
);
select lives_ok(
  $$ insert into public.cuentas (sesion_mesa_id) values ('11000000-0000-4000-8000-00000000000a') $$,
  'con el pedido recibido se habilita pedir la cuenta'
);

-- B no recibió nada: sigue bloqueado.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000015","role":"authenticated"}', true);
select throws_ok(
  $$ insert into public.cuentas (sesion_mesa_id) values ('11000000-0000-4000-8000-00000000000b') $$,
  '42501', null,
  'la recepción de otro cliente no le habilita la cuenta a B'
);

reset role;
select * from finish();
rollback;
