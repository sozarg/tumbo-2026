-- ═══════════════════════════════════════════════════════════════════
-- Partidas de juego validadas por la base (puntos 14, 15 y 21).
-- SOLO PARA LA BASE LOCAL, con ROLLBACK.
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000151', 'juega15.prueba@tumbo.test',
   '{"perfil":"cliente_registrado","estado":"aprobado"}', '{"nombres":"Ana","apellidos":"Prueba","dni":"30111151"}'),
  ('00000000-0000-4000-8000-000000000152', 'otra15.prueba@tumbo.test',
   '{"perfil":"cliente_registrado","estado":"aprobado"}', '{"nombres":"Bea","apellidos":"Prueba","dni":"30111152"}');
insert into public.sesiones_mesa (id, mesa_id, cliente_id)
select '15000000-0000-4000-8000-000000000001', id, '00000000-0000-4000-8000-000000000151' from public.mesas where numero = 4;
insert into public.sesiones_mesa (id, mesa_id, cliente_id)
select '15000000-0000-4000-8000-000000000002', id, '00000000-0000-4000-8000-000000000152' from public.mesas where numero = 5;

create temp table j on commit drop as
  select id, porcentaje_descuento as pct, row_number() over (order by porcentaje_descuento) as n
    from public.juegos where activo;
grant select on j to authenticated;
create function pg_temp.jugar(p_sesion uuid, p_cliente uuid, p_n int, p_gano boolean, p_intento int, p_desc numeric)
returns void language sql as $$
  insert into public.partidas_juego (juego_id, sesion_mesa_id, cliente_id, intento, gano, descuento_otorgado)
  values ((select id from j where n = p_n), p_sesion, p_cliente, p_intento, p_gano, p_desc)
$$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000151","role":"authenticated"}', true);

select throws_ok(
  $$ select pg_temp.jugar('15000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000151', 1, true, 1, 100) $$,
  '42501', 'Los juegos se habilitan cuando el mozo confirma tu pedido.',
  'sin pedido confirmado no se juega');

reset role;
insert into public.pedidos (sesion_mesa_id, estado) values ('15000000-0000-4000-8000-000000000001', 'confirmado');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000151","role":"authenticated"}', true);

select throws_ok(
  $$ select pg_temp.jugar('15000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000151', 1, true, 1, 20) $$,
  '42501', 'Solo podés jugar desde tu mesa en curso.',
  'no se juega desde la mesa de otro cliente');

-- Pierde el primer intento del juego 1, aunque mande descuento 100.
select lives_ok(
  $$ select pg_temp.jugar('15000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000151', 1, false, 1, 100) $$,
  'pierde el primer intento');
-- Gana el segundo intento del mismo juego, mandando intento 1.
select lives_ok(
  $$ select pg_temp.jugar('15000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000151', 1, true, 1, 100) $$,
  'gana el segundo intento');
-- Gana el primer intento del juego 3 mandando 100: recibe el del juego.
select lives_ok(
  $$ select pg_temp.jugar('15000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000151', 3, true, 7, 100) $$,
  'gana el primer intento de otro juego');
-- Y gana también el juego 2 al primer intento: no se acumula.
select lives_ok(
  $$ select pg_temp.jugar('15000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000151', 2, true, 1, 100) $$,
  'gana el primer intento de un tercer juego');
reset role;

select results_eq(
  $$ select j.n::int, p.intento, p.gano, p.descuento_otorgado
       from public.partidas_juego p join j on j.id = p.juego_id
      where p.sesion_mesa_id = '15000000-0000-4000-8000-000000000001'
      order by j.n, p.intento $$,
  -- El 3 se ganó antes que el 2: se queda con el descuento y el 2 no suma.
  $$ values (1, 1, false, 0::numeric), (1, 2, true, 0::numeric),
            (2, 1, true, 0::numeric), (3, 1, true, (select pct from j where n = 3)) $$,
  'la base cuenta el intento y da solo el descuento del juego, al primer intento y una vez'
);
select is(
  (select descuento_pct from public.calcular_cuenta('15000000-0000-4000-8000-000000000001')),
  (select pct from j where n = 3),
  'la cuenta aplica el porcentaje del juego, no el que mandó la aplicación'
);

select * from finish();
rollback;
