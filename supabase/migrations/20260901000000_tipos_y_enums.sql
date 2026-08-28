-- ═══════════════════════════════════════════════════════════════════
-- TUMBO · Tipos enumerados del dominio
-- Trabajo Final Integrador 2026 — UTN Avellaneda
--
-- Los valores viajan tal cual al cliente Angular: los tipos de
-- src/app/core/models/base-de-datos.ts se generan desde este archivo.
-- Si agregás un valor acá, regenerá los tipos.
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create type perfil_usuario as enum (
  'dueno', 'supervisor', 'metre', 'mozo', 'cocinero', 'cantinero',
  'cliente_registrado', 'cliente_anonimo'
);

create type estado_registro as enum ('pendiente', 'aprobado', 'rechazado');

create type tipo_mesa as enum ('vip', 'estandar', 'movilidad_reducida');

create type estado_mesa as enum ('libre', 'ocupada');

create type tipo_producto as enum ('plato', 'bebida', 'postre');

create type sector_preparacion as enum ('cocina', 'bar');

create type estado_espera as enum ('esperando', 'asignado', 'eliminado');

create type estado_sesion as enum ('activa', 'cuenta_solicitada', 'pagada', 'cerrada');

create type estado_pedido as enum (
  'borrador',                -- el cliente lo está armando
  'pendiente_confirmacion',  -- enviado, esperando al mozo
  'rechazado',               -- el mozo lo devolvió para modificar
  'confirmado',              -- derivado a los sectores
  'en_preparacion',          -- algún sector empezó
  'listo',                   -- todos los sectores terminaron
  'entregado',               -- el mozo entregó y el cliente confirmó
  'pagado'
);

create type estado_item as enum ('pendiente', 'en_preparacion', 'listo');

create type tipo_mensaje as enum ('consulta', 'respuesta');

create type tipo_control as enum (
  'radio', 'checkbox', 'select', 'rango', 'estrellas', 'texto_largo', 'interruptor'
);

create type estado_cuenta as enum ('pendiente', 'pagada', 'confirmada');

create type nivel_satisfaccion as enum (
  'excelente', 'muy_bueno', 'bueno', 'regular', 'malo'
);

create type plataforma_push as enum ('android', 'ios', 'web');
