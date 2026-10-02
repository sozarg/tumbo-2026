-- ═══════════════════════════════════════════════════════════════════
-- Ingreso rápido: la vista pública solo muestra cuentas de demostración.
-- SOLO PARA LA BASE LOCAL, con ROLLBACK.
-- ═══════════════════════════════════════════════════════════════════
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000171', 'clienta.real@gmail.com',
   '{"perfil":"cliente_registrado","estado":"aprobado"}', '{"nombres":"Real","apellidos":"Persona","dni":"30111171"}'),
  ('00000000-0000-4000-8000-000000000172', 'historico9@tumbo.demo',
   '{"perfil":"cliente_registrado","estado":"aprobado"}', '{"nombres":"Viejo","apellidos":"Historial","dni":"30111172"}');

set local role anon;
select ok(
  not exists (select 1 from public.accesos_rapidos where correo = 'clienta.real@gmail.com'),
  'un cliente real no queda publicado en el ingreso rápido'
);
select ok(
  not exists (select 1 from public.accesos_rapidos where correo like 'historico%'),
  'los clientes del historial (clave al azar) no aparecen en el ingreso rápido'
);
select ok(
  (select count(distinct perfil) from public.accesos_rapidos) >= 1
  and not exists (select 1 from public.accesos_rapidos where correo not like '%@tumbo.demo'),
  'el visitante sigue viendo los accesos de demostración, y solo esos'
);
reset role;

select * from finish();
rollback;
