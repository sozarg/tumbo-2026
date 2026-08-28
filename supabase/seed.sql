-- supabase/seed.sql
--
-- Se ejecuta automáticamente con `supabase db reset` (local) y se puede
-- correr a mano contra un proyecto remoto con:
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2)" -f supabase/seed.sql
--
-- Genera los datos mínimos exigidos por la sección 5.9 del contexto:
-- un usuario por perfil de staff, un cliente registrado aprobado,
-- 5 platos, 5 bebidas, 5 mesas con QR, 5 niveles de propina, 3 juegos,
-- preguntas de encuesta con controles variados, y 4 semanas de
-- estadías/pedidos/encuestas simuladas para que el punto 20 tenga
-- datos para graficar.
--
-- Clave de todos los usuarios de prueba: Tumbo2026 (igual que el mock,
-- para que el equipo no tenga que aprender credenciales nuevas).

-- ─────────────────────────────────────────────────────────────
-- 1. USUARIOS DE STAFF Y CLIENTE DE PRUEBA (vía auth.users)
-- ─────────────────────────────────────────────────────────────
do $$
declare
  v_clave text := crypt('Tumbo2026', gen_salt('bf'));
  v_instance uuid := '00000000-0000-0000-0000-000000000000';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values
    (v_instance, '11111111-1111-1111-1111-111111111101', 'authenticated', 'authenticated',
     'mateo@tumbo.demo', v_clave, now(), '{"provider":"email","providers":["email"]}',
     '{"perfil":"dueno","nombres":"Mateo","apellidos":"Terrile"}', now(), now(), '', '', '', ''),
    (v_instance, '11111111-1111-1111-1111-111111111102', 'authenticated', 'authenticated',
     'ramiro@tumbo.demo', v_clave, now(), '{"provider":"email","providers":["email"]}',
     '{"perfil":"supervisor","nombres":"Ramiro","apellidos":"Bianucci"}', now(), now(), '', '', '', ''),
    (v_instance, '11111111-1111-1111-1111-111111111103', 'authenticated', 'authenticated',
     'ignacio@tumbo.demo', v_clave, now(), '{"provider":"email","providers":["email"]}',
     '{"perfil":"metre","nombres":"Ignacio Agustín","apellidos":"Cruz"}', now(), now(), '', '', '', ''),
    (v_instance, '11111111-1111-1111-1111-111111111104', 'authenticated', 'authenticated',
     'matias@tumbo.demo', v_clave, now(), '{"provider":"email","providers":["email"]}',
     '{"perfil":"mozo","nombres":"Matías Gabriel","apellidos":"Ferrari"}', now(), now(), '', '', '', ''),
    (v_instance, '11111111-1111-1111-1111-111111111105', 'authenticated', 'authenticated',
     'alicia@tumbo.demo', v_clave, now(), '{"provider":"email","providers":["email"]}',
     '{"perfil":"cocinero","nombres":"Alicia","apellidos":"Gómez"}', now(), now(), '', '', '', ''),
    (v_instance, '11111111-1111-1111-1111-111111111106', 'authenticated', 'authenticated',
     'bruno@tumbo.demo', v_clave, now(), '{"provider":"email","providers":["email"]}',
     '{"perfil":"cantinero","nombres":"Bruno","apellidos":"Sosa"}', now(), now(), '', '', '', ''),
    (v_instance, '11111111-1111-1111-1111-111111111107', 'authenticated', 'authenticated',
     'camila@tumbo.demo', v_clave, now(), '{"provider":"email","providers":["email"]}',
     '{"perfil":"cliente_registrado","nombres":"Camila","apellidos":"Pérez"}', now(), now(), '', '', '', '')
  on conflict (id) do nothing;
end $$;

insert into public.usuarios (id, apellidos, nombres, dni, cuil, correo, perfil, estado) values
  ('11111111-1111-1111-1111-111111111101', 'Terrile', 'Mateo',            '30111222', '20-30111222-3', 'mateo@tumbo.demo',   'dueno',               'aprobado'),
  ('11111111-1111-1111-1111-111111111102', 'Bianucci', 'Ramiro',          '30111223', '20-30111223-4', 'ramiro@tumbo.demo',  'supervisor',          'aprobado'),
  ('11111111-1111-1111-1111-111111111103', 'Cruz', 'Ignacio Agustín',     '30111224', '20-30111224-5', 'ignacio@tumbo.demo', 'metre',               'aprobado'),
  ('11111111-1111-1111-1111-111111111104', 'Ferrari', 'Matías Gabriel',   '30111225', '20-30111225-6', 'matias@tumbo.demo',  'mozo',                'aprobado'),
  ('11111111-1111-1111-1111-111111111105', 'Gómez', 'Alicia',            '30111226', '27-30111226-1', 'alicia@tumbo.demo',  'cocinero',            'aprobado'),
  ('11111111-1111-1111-1111-111111111106', 'Sosa', 'Bruno',              '30111227', '20-30111227-8', 'bruno@tumbo.demo',   'cantinero',           'aprobado'),
  ('11111111-1111-1111-1111-111111111107', 'Pérez', 'Camila',            '30111228', null,            'camila@tumbo.demo',  'cliente_registrado',  'aprobado')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 2. CATÁLOGO: 5 platos + 5 bebidas
-- ─────────────────────────────────────────────────────────────
insert into public.productos (id, tipo, nombre, descripcion, tiempo_elaboracion_min, precio, sector, creado_por) values
  ('22222222-2222-2222-2222-222222220001', 'plato', 'Pizza muzzarella',   'Pizza de muzzarella con salsa casera y orégano.', 18, 8500, 'cocina', '11111111-1111-1111-1111-111111111105'),
  ('22222222-2222-2222-2222-222222220002', 'plato', 'Bife de chorizo',    'Bife de chorizo a la parrilla con guarnición.',   25, 14200, 'cocina', '11111111-1111-1111-1111-111111111105'),
  ('22222222-2222-2222-2222-222222220003', 'plato', 'Fideos con salsa',   'Fideos secos con salsa de tomate y albahaca.',    15, 7200, 'cocina', '11111111-1111-1111-1111-111111111105'),
  ('22222222-2222-2222-2222-222222220004', 'plato', 'Ensalada mixta',     'Lechuga, tomate, cebolla y huevo.',                8, 5600, 'cocina', '11111111-1111-1111-1111-111111111105'),
  ('22222222-2222-2222-2222-222222220005', 'plato', 'Sopa de verduras',   'Sopa casera de verduras de estación.',            12, 5100, 'cocina', '11111111-1111-1111-1111-111111111105'),
  ('22222222-2222-2222-2222-222222220006', 'bebida', 'Copa de vino tinto','Copa de vino tinto de la casa.',                   3, 4200, 'bar',    '11111111-1111-1111-1111-111111111106'),
  ('22222222-2222-2222-2222-222222220007', 'bebida', 'Café',              'Café espresso.',                                   4, 2500, 'bar',    '11111111-1111-1111-1111-111111111106'),
  ('22222222-2222-2222-2222-222222220008', 'bebida', 'Agua sin gas 500ml','Botella de agua mineral sin gas.',                 1, 1800, 'bar',    '11111111-1111-1111-1111-111111111106'),
  ('22222222-2222-2222-2222-222222220009', 'bebida', 'Gaseosa cola',      'Gaseosa cola línea, 350ml.',                       1, 2200, 'bar',    '11111111-1111-1111-1111-111111111106'),
  ('22222222-2222-2222-2222-222222220010', 'bebida', 'Cerveza rubia',     'Botella de cerveza rubia 340ml.',                  2, 3400, 'bar',    '11111111-1111-1111-1111-111111111106')
on conflict (id) do nothing;

-- 3 fotos por producto, como exige el enunciado (puntos 2 y 3).
-- Reemplazar por las URLs reales de storage.fotos-productos cuando
-- se suban las fotos verdaderas desde la app.
insert into public.producto_fotos (producto_id, url, orden)
select p.id, 'https://placehold.co/600x400?text=' || replace(p.nombre, ' ', '+') || '+' || o, o
from public.productos p
cross join generate_series(1, 3) as o
on conflict (producto_id, orden) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 3. MESAS (5, con QR — el token coincide con la convención
--    'tumbo-mesa-N' ya usada en el modo demo y en docs/imagenes/qr-mesa-N.png)
-- ─────────────────────────────────────────────────────────────
insert into public.mesas (id, numero, cantidad_comensales, tipo, qr_token) values
  ('33333333-3333-3333-3333-333333330001', 1, 2, 'estandar',            'tumbo-mesa-1'),
  ('33333333-3333-3333-3333-333333330002', 2, 4, 'estandar',            'tumbo-mesa-2'),
  ('33333333-3333-3333-3333-333333330003', 3, 4, 'vip',                 'tumbo-mesa-3'),
  ('33333333-3333-3333-3333-333333330004', 4, 6, 'estandar',            'tumbo-mesa-4'),
  ('33333333-3333-3333-3333-333333330005', 5, 2, 'movilidad_reducida',  'tumbo-mesa-5')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 4. NIVELES DE PROPINA (punto 21) — coinciden con docs/imagenes/qr-propina-*.png
-- ─────────────────────────────────────────────────────────────
insert into public.niveles_propina (nivel, porcentaje, etiqueta, qr_token) values
  ('excelente',  20, 'Excelente',  'tumbo-propina-20'),
  ('muy_bueno',  15, 'Muy bueno',  'tumbo-propina-15'),
  ('bueno',      10, 'Bueno',      'tumbo-propina-10'),
  ('regular',     5, 'Regular',    'tumbo-propina-5'),
  ('malo',        0, 'Sin propina','tumbo-propina-0')
on conflict (nivel) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 5. JUEGOS (puntos 14 y 15) — 3, con distinto descuento
-- ─────────────────────────────────────────────────────────────
insert into public.juegos (id, nombre, descripcion, porcentaje_descuento) values
  ('44444444-4444-4444-4444-444444440001', 'Memoria de pares', 'Encontrar las parejas de cartas con la menor cantidad de intentos.', 10),
  ('44444444-4444-4444-4444-444444440002', 'Adiviná el número', 'Adivinar un número entre 1 y 20 en el primer intento.', 15),
  ('44444444-4444-4444-4444-444444440003', 'Piedra, papel o tijera', 'Ganarle a Tumbito en una partida.', 5)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 6. PREGUNTAS DE ENCUESTA (punto 20) — controles variados
-- ─────────────────────────────────────────────────────────────
insert into public.preguntas_encuesta (id, texto, tipo, opciones, minimo, maximo, orden) values
  ('55555555-5555-5555-5555-555555550001', '¿Cómo calificarías la atención?', 'estrellas', null, 1, 5, 1),
  ('55555555-5555-5555-5555-555555550002', '¿Qué te pareció el tiempo de espera?', 'radio',
    '["Muy rápido","Adecuado","Lento","Muy lento"]', null, null, 2),
  ('55555555-5555-5555-5555-555555550003', '¿Qué aspectos te gustaron?', 'checkbox',
    '["Sabor","Presentación","Temperatura","Atención","Ambiente","Precio"]', null, null, 3),
  ('55555555-5555-5555-5555-555555550004', '¿Cómo nos conociste?', 'select',
    '["Redes sociales","Recomendación","Google","Pasaba por acá","Ya soy cliente"]', null, null, 4),
  ('55555555-5555-5555-5555-555555550005', 'Nivel de limpieza del local', 'rango', null, 1, 10, 5),
  ('55555555-5555-5555-5555-555555550006', '¿Volverías?', 'interruptor', null, null, null, 6),
  ('55555555-5555-5555-5555-555555550007', 'Comentarios adicionales', 'texto_largo', null, null, null, 7)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- 7. CUATRO SEMANAS DE DATOS SIMULADOS (estadías, pedidos, encuestas)
--    Ver supabase/seed_data/historico.sql
-- ─────────────────────────────────────────────────────────────
\ir seed_data/historico.sql
