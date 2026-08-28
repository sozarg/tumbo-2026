-- ═══════════════════════════════════════════════════════════════════
-- TUMBO · El tope del correo baja de 254 a 80
--
-- POR QUÉ
-- La migración anterior usó 254, que es el máximo que permite el
-- estándar (RFC 5321). Es correcto pero inútil en la práctica: ninguna
-- dirección real se le acerca, así que el límite nunca se ve y no se
-- puede explicar sin citar un RFC.
--
-- 80 alcanza de sobra para algo como
-- nombre.apellido@subdominio.organizacion.com.ar (que ronda los 50) y
-- es un número que se sostiene solo cuando alguien pregunta por qué.
--
-- La bitácora correos_enviados.destinatario NO cambia: se queda en 254
-- a propósito. Ahí no hay un formulario del otro lado, es un registro
-- de lo que ya se envió, y conviene ser permisivo para no perder una
-- fila del historial por un tope que nos pusimos nosotros.
--
-- No se edita la migración 000600 porque ya está aplicada: el historial
-- del repositorio y el de la base tienen que decir lo mismo.
-- ═══════════════════════════════════════════════════════════════════

alter table public.usuarios
  drop constraint largo_correo,
  add constraint largo_correo check (
    correo is null or char_length(correo) <= 80
  );
