-- ═══════════════════════════════════════════════════════════════════
-- Ingreso rápido: solo las cuentas de demostración
--
-- La vista se lee sin sesión (es la pantalla de ingreso) y mostraba
-- nombre, correo, perfil y foto de TODOS los usuarios aprobados: un
-- cliente real que se registrara quedaba publicado ahí. Además
-- aparecían los ocho clientes del historial del punto 20, que tienen
-- una clave al azar y no se pueden usar para entrar.
--
-- Ahora muestra solo las cuentas `@tumbo.demo` que existen para la
-- demostración, sin las del historial. Mismas columnas y mismo orden:
-- la aplicación no cambia.
-- ═══════════════════════════════════════════════════════════════════
create or replace view public.accesos_rapidos as
  select id, nombres, apellidos, correo, perfil, foto_url
    from public.usuarios u
   where estado = 'aprobado'
     and correo like '%@tumbo.demo'
     and correo not like 'historico%@tumbo.demo'
   order by
     case perfil
       when 'dueno' then 1
       when 'supervisor' then 2
       when 'metre' then 3
       when 'mozo' then 4
       when 'cocinero' then 5
       when 'cantinero' then 6
       when 'cliente_registrado' then 7
       else 8
     end,
     apellidos, nombres;
