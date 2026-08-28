-- ═══════════════════════════════════════════════════════════════════
-- TUMBO · Tablas base — personas, catálogo y datos de referencia
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- USUARIOS
-- Extiende auth.users. Los clientes anónimos también tienen fila acá:
-- se crean con supabase.auth.signInAnonymously().
-- El estado es la puerta de los puntos 5, 7 y 8: un cliente registrado
-- que no esté 'aprobado' NO puede operar en la aplicación.
-- ───────────────────────────────────────────────────────────────────
create table public.usuarios (
  id              uuid primary key references auth.users(id) on delete cascade,
  apellidos       text,
  nombres         text not null,
  dni             text unique,
  cuil            text,
  correo          text unique,
  perfil          perfil_usuario not null,
  estado          estado_registro not null default 'pendiente',
  foto_url        text,
  motivo_rechazo  text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  -- Los anónimos solo aportan nombre y foto; al resto se le exige todo
  constraint datos_completos_si_no_es_anonimo check (
    perfil = 'cliente_anonimo'
    or (apellidos is not null and dni is not null and correo is not null)
  ),
  -- El CUIL se le pide solamente a los empleados (punto 1)
  constraint cuil_en_empleados check (
    perfil not in ('metre','mozo','cocinero','cantinero') or cuil is not null
  ),
  constraint formato_correo check (
    correo is null or correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  constraint formato_dni check (dni is null or dni ~ '^[0-9]{7,8}$'),
  constraint formato_cuil check (cuil is null or cuil ~ '^[0-9]{2}-?[0-9]{7,8}-?[0-9]$')
);

comment on table public.usuarios is
  'Perfil de dominio de cada cuenta. El perfil y el estado se leen SIEMPRE de acá, nunca de user_metadata: el metadata lo puede escribir el propio usuario y por lo tanto no sirve para decidir permisos.';

create index idx_usuarios_perfil on public.usuarios(perfil);
create index idx_usuarios_estado on public.usuarios(estado) where estado = 'pendiente';

-- ───────────────────────────────────────────────────────────────────
-- DISPOSITIVOS PUSH
-- Un usuario puede tener varios dispositivos (el TFI se demuestra con
-- cuatro en simultáneo).
-- ───────────────────────────────────────────────────────────────────
create table public.dispositivos_push (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references public.usuarios(id) on delete cascade,
  token           text not null unique,
  plataforma      plataforma_push not null default 'android',
  actualizado_en  timestamptz not null default now()
);

create index idx_dispositivos_usuario on public.dispositivos_push(usuario_id);

-- ───────────────────────────────────────────────────────────────────
-- MESAS · el qr_token se genera solo al insertar (punto 4)
-- ───────────────────────────────────────────────────────────────────
create table public.mesas (
  id                    uuid primary key default gen_random_uuid(),
  numero                integer not null unique,
  cantidad_comensales   integer not null check (cantidad_comensales between 1 and 20),
  tipo                  tipo_mesa not null,
  estado                estado_mesa not null default 'libre',
  foto_url              text,
  -- Token aleatorio sin depender de pgcrypto: en Supabase esa extensión
  -- vive en el esquema `extensions` y sus funciones no están en el
  -- search_path durante las migraciones. gen_random_uuid() en cambio es
  -- nativa de PostgreSQL 13+ y siempre está disponible.
  qr_token              text not null unique
                        default replace(gen_random_uuid()::text, '-', ''),
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────
-- PRODUCTOS · platos, bebidas y postres
-- ───────────────────────────────────────────────────────────────────
create table public.productos (
  id                      uuid primary key default gen_random_uuid(),
  tipo                    tipo_producto not null,
  nombre                  text not null,
  descripcion             text not null,
  tiempo_elaboracion_min  integer not null check (tiempo_elaboracion_min > 0),
  precio                  numeric(10,2) not null check (precio > 0),
  sector                  sector_preparacion not null,
  activo                  boolean not null default true,
  creado_por              uuid references public.usuarios(id),
  creado_en               timestamptz not null default now(),
  actualizado_en          timestamptz not null default now(),

  constraint nombre_unico_por_tipo unique (tipo, nombre),
  -- Las bebidas las prepara el bar; los platos y postres, la cocina
  constraint sector_coherente check (
    (tipo = 'bebida' and sector = 'bar') or
    (tipo in ('plato','postre') and sector = 'cocina')
  )
);

create index idx_productos_tipo on public.productos(tipo) where activo;

-- ───────────────────────────────────────────────────────────────────
-- FOTOS DE PRODUCTO
-- El TFI exige exactamente 3 fotos por plato y por bebida (puntos 2 y 3)
-- ───────────────────────────────────────────────────────────────────
create table public.producto_fotos (
  id           uuid primary key default gen_random_uuid(),
  producto_id  uuid not null references public.productos(id) on delete cascade,
  url          text not null,
  orden        smallint not null check (orden between 1 and 3),
  creado_en    timestamptz not null default now(),

  constraint orden_unico_por_producto unique (producto_id, orden)
);

-- ───────────────────────────────────────────────────────────────────
-- NIVELES DE PROPINA · tabla fija de 5 filas (punto 21)
-- ───────────────────────────────────────────────────────────────────
create table public.niveles_propina (
  nivel        nivel_satisfaccion primary key,
  porcentaje   numeric(5,2) not null check (porcentaje >= 0),
  etiqueta     text not null,
  qr_token     text not null unique
);

-- ───────────────────────────────────────────────────────────────────
-- JUEGOS · tabla fija de 3 filas (puntos 14 y 15)
-- ───────────────────────────────────────────────────────────────────
create table public.juegos (
  id                     uuid primary key default gen_random_uuid(),
  nombre                 text not null unique,
  descripcion            text not null,
  porcentaje_descuento   numeric(5,2) not null check (porcentaje_descuento > 0),
  activo                 boolean not null default true
);

-- ───────────────────────────────────────────────────────────────────
-- PREGUNTAS DE ENCUESTA (punto 20)
-- El tipo de control debe VARIAR: es requisito excluyente no usar
-- siempre el mismo control para recolectar información.
-- ───────────────────────────────────────────────────────────────────
create table public.preguntas_encuesta (
  id        uuid primary key default gen_random_uuid(),
  texto     text not null,
  tipo      tipo_control not null,
  opciones  jsonb,
  minimo    numeric,
  maximo    numeric,
  orden     smallint not null unique,
  activa    boolean not null default true,
  requerida boolean not null default true
);
