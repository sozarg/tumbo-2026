-- ═══════════════════════════════════════════════════════════════════
-- TUMBO · Verificación del esquema
--
-- Pegar en el SQL Editor del panel de Supabase y ejecutar.
-- Comprueba que las migraciones dejaron la base como corresponde.
-- Todas las filas tienen que decir OK.
--
-- Se puede correr cuantas veces se quiera: solo lee, no modifica nada.
-- ═══════════════════════════════════════════════════════════════════

with control (orden, que_se_controla, esperado, encontrado) as (

  select 1, 'Tablas creadas', 19, (
    select count(*)::int from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r')

  union all
  select 2, 'Tipos enumerados', 15, (
    select count(*)::int from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public' and t.typtype = 'e')

  union all
  select 3, 'Vista de accesos rápidos', 1, (
    select count(*)::int from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'v'
       and c.relname = 'accesos_rapidos')

  union all
  -- Si alguna tabla quedara sin RLS, sus datos serían legibles por
  -- cualquiera con la clave anon. Tienen que estar las 19.
  select 4, 'Tablas con RLS activo', 19, (
    select count(*)::int from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity)

  union all
  select 5, 'Tablas SIN RLS (debe ser 0)', 0, (
    select count(*)::int from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity)

  union all
  select 6, 'Políticas de seguridad', 43, (
    select count(*)::int from pg_policies where schemaname = 'public')

  union all
  select 7, 'Funciones del dominio', 11, (
    select count(*)::int from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('perfil_actual','es_gerencia','es_staff','es_cliente',
                         'esta_habilitado','tocar_actualizado_en',
                         'manejar_usuario_nuevo','completar_datos_item',
                         'evaluar_pedido_listo','calcular_cuenta',
                         'liberar_mesa_al_confirmar'))

  union all
  -- El trigger sobre auth.users es el que crea el perfil al registrarse.
  -- Sin él, las cuentas nuevas quedan sin fila en public.usuarios.
  select 8, 'Trigger de alta de perfil', 1, (
    select count(*)::int from pg_trigger
     where tgname = 'trg_auth_usuario_nuevo' and not tgisinternal)

  union all
  select 9, 'Triggers del dominio', 7, (
    select count(*)::int from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and not t.tgisinternal)

  union all
  select 10, 'Políticas de storage', 3, (
    select count(*)::int from pg_policies where schemaname = 'storage')

  union all
  select 11, 'Buckets de imágenes', 3, (
    select count(*)::int from storage.buckets
     where id in ('fotos-usuarios','fotos-productos','fotos-mesas'))

  union all
  select 12, 'Migraciones registradas', 9, (
    select count(*)::int from supabase_migrations.schema_migrations)

  union all
  -- Los límites de longitud de las migraciones 000600 y 000700. Sin
  -- ellos, cualquiera con la clave anon puede mandar un texto de 10.000
  -- caracteres por PostgREST salteando el formulario.
  select 13, 'Límites de longitud y formato', 27, (
    select count(*)::int from pg_constraint c
      join pg_namespace n on n.oid = c.connamespace
     where n.nspname = 'public' and c.contype = 'c'
       and (c.conname like 'largo\_%'
            or c.conname in ('formato_nombres','formato_apellidos')))

  union all
  -- Sin este trigger, cualquier cliente registrado puede hacer
  -- `update usuarios set perfil='dueno' where id=auth.uid()` con la
  -- clave pública y quedar de dueño. Es el control más importante
  -- de toda esta lista.
  select 14, 'Freno a la escalada de privilegios', 1, (
    select count(*)::int from pg_trigger
     where tgname = 'trg_usuarios_proteger_autorizacion' and not tgisinternal)
)

select
  orden                                        as "#",
  que_se_controla                              as "Qué se controla",
  esperado                                     as "Esperado",
  encontrado                                   as "Encontrado",
  case when encontrado = esperado then 'OK'
       else 'REVISAR' end                      as "Estado"
from control
order by orden;
