-- ═══════════════════════════════════════════════════════════════════
-- TUMBO · Tablas de operación — el ciclo de atención de la mesa
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- LISTA DE ESPERA (punto 9)
-- ───────────────────────────────────────────────────────────────────
create table public.lista_espera (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.usuarios(id) on delete cascade,
  estado        estado_espera not null default 'esperando',
  mesa_id       uuid references public.mesas(id),
  creado_en     timestamptz not null default now(),
  asignado_en   timestamptz,

  constraint mesa_solo_si_asignado check (
    (estado = 'asignado' and mesa_id is not null and asignado_en is not null)
    or (estado <> 'asignado' and mesa_id is null)
  )
);

-- Un cliente no puede estar dos veces esperando al mismo tiempo
create unique index idx_espera_unica_por_cliente
  on public.lista_espera(cliente_id) where estado = 'esperando';

-- ───────────────────────────────────────────────────────────────────
-- SESIONES DE MESA · la "estadía": la ocupación de una mesa por un cliente.
-- Es la entidad central: pedidos, encuesta, chat y cuenta cuelgan de acá.
-- ───────────────────────────────────────────────────────────────────
create table public.sesiones_mesa (
  id           uuid primary key default gen_random_uuid(),
  mesa_id      uuid not null references public.mesas(id),
  cliente_id   uuid not null references public.usuarios(id),
  estado       estado_sesion not null default 'activa',
  comensales   integer not null default 1 check (comensales > 0),
  abierta_en   timestamptz not null default now(),
  cerrada_en   timestamptz
);

-- Una mesa no puede tener dos estadías abiertas: esto implementa
-- "no se le puede asignar dicha mesa a otro cliente" (punto 10)
create unique index idx_sesion_activa_por_mesa
  on public.sesiones_mesa(mesa_id)
  where estado in ('activa','cuenta_solicitada','pagada');

-- Un cliente no puede vincularse a dos mesas (punto 10)
create unique index idx_sesion_activa_por_cliente
  on public.sesiones_mesa(cliente_id)
  where estado in ('activa','cuenta_solicitada','pagada');

-- ───────────────────────────────────────────────────────────────────
-- PEDIDOS (puntos 12 a 19)
-- ───────────────────────────────────────────────────────────────────
create table public.pedidos (
  id                uuid primary key default gen_random_uuid(),
  sesion_mesa_id    uuid not null references public.sesiones_mesa(id) on delete cascade,
  estado            estado_pedido not null default 'borrador',
  mozo_id           uuid references public.usuarios(id),
  motivo_rechazo    text,
  creado_en         timestamptz not null default now(),
  enviado_en        timestamptz,
  confirmado_en     timestamptz,
  listo_en          timestamptz,
  entregado_en      timestamptz,

  constraint motivo_si_rechazado check (
    estado <> 'rechazado' or motivo_rechazo is not null
  )
);

create index idx_pedidos_sesion on public.pedidos(sesion_mesa_id);
create index idx_pedidos_estado on public.pedidos(estado);

-- ───────────────────────────────────────────────────────────────────
-- ÍTEMS DEL PEDIDO
-- El precio se congela al pedir: si después cambia el precio del
-- producto, la cuenta ya emitida no se altera.
-- ───────────────────────────────────────────────────────────────────
create table public.pedido_items (
  id               uuid primary key default gen_random_uuid(),
  pedido_id        uuid not null references public.pedidos(id) on delete cascade,
  producto_id      uuid not null references public.productos(id),
  cantidad         integer not null check (cantidad > 0),
  precio_unitario  numeric(10,2) not null check (precio_unitario > 0),
  sector           sector_preparacion not null,
  estado           estado_item not null default 'pendiente',
  listo_en         timestamptz,

  constraint producto_unico_por_pedido unique (pedido_id, producto_id)
);

create index idx_items_pedido on public.pedido_items(pedido_id);
create index idx_items_sector on public.pedido_items(sector, estado);

-- ───────────────────────────────────────────────────────────────────
-- MENSAJES · sala de conversación cliente ↔ mozos (punto 11)
-- ───────────────────────────────────────────────────────────────────
create table public.mensajes (
  id              uuid primary key default gen_random_uuid(),
  sesion_mesa_id  uuid not null references public.sesiones_mesa(id) on delete cascade,
  autor_id        uuid not null references public.usuarios(id),
  tipo            tipo_mensaje not null,
  cuerpo          text not null check (length(trim(cuerpo)) > 0),
  enviado_en      timestamptz not null default now()
);

create index idx_mensajes_sesion on public.mensajes(sesion_mesa_id, enviado_en);

-- ───────────────────────────────────────────────────────────────────
-- ENCUESTAS (punto 20) · una por estadía
-- ───────────────────────────────────────────────────────────────────
create table public.encuestas (
  id              uuid primary key default gen_random_uuid(),
  sesion_mesa_id  uuid not null unique references public.sesiones_mesa(id) on delete cascade,
  cliente_id      uuid not null references public.usuarios(id),
  creado_en       timestamptz not null default now()
);

create table public.respuestas_encuesta (
  id            uuid primary key default gen_random_uuid(),
  encuesta_id   uuid not null references public.encuestas(id) on delete cascade,
  pregunta_id   uuid not null references public.preguntas_encuesta(id),
  valor         jsonb not null,

  constraint respuesta_unica unique (encuesta_id, pregunta_id)
);

-- ───────────────────────────────────────────────────────────────────
-- PARTIDAS DE JUEGO (puntos 14 y 15)
-- Reglas: solo cliente registrado; el descuento se otorga únicamente
-- si gana en el PRIMER intento; un solo descuento por estadía.
-- ───────────────────────────────────────────────────────────────────
create table public.partidas_juego (
  id                    uuid primary key default gen_random_uuid(),
  juego_id              uuid not null references public.juegos(id),
  sesion_mesa_id        uuid not null references public.sesiones_mesa(id) on delete cascade,
  cliente_id            uuid not null references public.usuarios(id),
  intento               integer not null check (intento > 0),
  gano                  boolean not null,
  descuento_otorgado    numeric(5,2) not null default 0,
  jugado_en             timestamptz not null default now(),

  constraint intento_unico unique (sesion_mesa_id, juego_id, intento)
);

-- Como máximo una partida con descuento por estadía
create unique index idx_un_descuento_por_sesion
  on public.partidas_juego(sesion_mesa_id)
  where descuento_otorgado > 0;

-- ───────────────────────────────────────────────────────────────────
-- CUENTAS (puntos 21 y 22)
-- ───────────────────────────────────────────────────────────────────
create table public.cuentas (
  id                uuid primary key default gen_random_uuid(),
  sesion_mesa_id    uuid not null unique references public.sesiones_mesa(id) on delete cascade,
  subtotal          numeric(10,2) not null default 0,
  descuento_pct     numeric(5,2) not null default 0,
  descuento_monto   numeric(10,2) not null default 0,
  nivel_propina     nivel_satisfaccion,
  propina_pct       numeric(5,2),
  propina_monto     numeric(10,2) not null default 0,
  total             numeric(10,2) not null default 0,
  estado            estado_cuenta not null default 'pendiente',
  mozo_id           uuid references public.usuarios(id),
  solicitada_en     timestamptz not null default now(),
  pagada_en         timestamptz,
  confirmada_en     timestamptz,

  -- "No se podrá generar la cuenta sin antes seleccionar el porcentaje
  --  de propina correspondiente" (punto 21)
  constraint propina_obligatoria_para_pagar check (
    estado = 'pendiente' or (nivel_propina is not null and propina_pct is not null)
  )
);

-- ───────────────────────────────────────────────────────────────────
-- BITÁCORAS · sirven para demostrar que los envíos son automáticos
-- ───────────────────────────────────────────────────────────────────
create table public.notificaciones (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references public.usuarios(id) on delete cascade,
  titulo       text not null,
  cuerpo       text not null,
  datos        jsonb,
  enviada_en   timestamptz not null default now(),
  leida_en     timestamptz
);

create table public.correos_enviados (
  id            uuid primary key default gen_random_uuid(),
  destinatario  text not null,
  plantilla     text not null,
  asunto        text not null,
  estado        text not null default 'enviado',
  proveedor_id  text,
  enviado_en    timestamptz not null default now()
);
