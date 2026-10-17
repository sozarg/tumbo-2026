-- ═══════════════════════════════════════════════════════════════════
-- EL CLIENTE VE EL NOMBRE DE QUIEN LE CONTESTA (corrección P2)
--
-- QUÉ PASABA
--
-- `aMensaje` ya buscaba el nombre del autor en el listado de personal
-- y solo caía en la palabra «Mozo» si no lo encontraba. El problema es
-- que en el teléfono del cliente NUNCA lo encontraba: la política
-- `usuarios_ver_propio` le deja leer una sola fila de `usuarios`, la
-- suya, y `usuarios_staff_ve_todos` pide `es_staff()`. O sea que el
-- listado de personal del cliente está vacío siempre y el chat decía
-- «Mozo» a todo el mundo. En modo demostración sí funcionaba, porque
-- ahí los empleados salen del mock: por eso no se notaba probando.
--
-- POR QUÉ NO SE AMPLÍA LA POLÍTICA
--
-- Abrir `usuarios` al cliente le daría también el correo, el DNI y el
-- estado de cada empleado para leer un nombre. Esta función devuelve
-- dos columnas y solo de las personas que YA escribieron en el chat de
-- SU estadía: el nombre de quien te está atendiendo, que en un
-- restaurante se lee en la credencial, y nada más.
--
-- `security definer` porque justamente tiene que mirar filas que quien
-- llama no puede leer; el alcance lo acota el `where`, no el permiso.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.nombres_en_mi_chat()
returns table (id uuid, nombre text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct
         u.id,
         btrim(u.nombres || ' ' || coalesce(u.apellidos, '')) as nombre
    from public.mensajes m
    join public.sesiones_mesa s on s.id = m.sesion_mesa_id
    join public.usuarios u on u.id = m.autor_id
   where s.cliente_id = auth.uid()
     and u.perfil in ('mozo', 'dueno', 'supervisor')
$$;

comment on function public.nombres_en_mi_chat() is
  'Los nombres del personal que escribió en el chat de las estadías de quien llama, para que el cliente vea quién le contesta en vez de la palabra «Mozo».';

revoke execute on function public.nombres_en_mi_chat() from public, anon;
grant execute on function public.nombres_en_mi_chat() to authenticated;
