-- ═══════════════════════════════════════════════════════════════════
-- TUMBO · Datos de referencia
--
-- Este archivo NO crea usuarios: las cuentas viven en auth.users y se
-- crean con  node supabase/crear-usuarios.mjs  (ver supabase/README.md).
-- Acá va solo lo que el TFI exige tener cargado de antemano:
-- 5 mesas, 5 platos, 5 bebidas, los 5 niveles de propina, los 3 juegos
-- y las preguntas de la encuesta.
--
-- Es idempotente: se puede correr varias veces sin duplicar nada.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- NIVELES DE PROPINA (punto 21)
-- El qr_token es el segmento final del código ya generado en
-- docs/imagenes/qr-propina-*.png, que codifica TUMBO://propina/<token>.
-- Verificado decodificando los PNG: no hay que regenerar ninguno.
-- ───────────────────────────────────────────────────────────────────
insert into public.niveles_propina (nivel, porcentaje, etiqueta, qr_token) values
  ('excelente', 20, 'Excelente', '20'),
  ('muy_bueno', 15, 'Muy bueno', '15'),
  ('bueno',     10, 'Bueno',     '10'),
  ('regular',    5, 'Regular',   '5'),
  ('malo',       0, 'Malo',      '0')
on conflict (nivel) do update
  set porcentaje = excluded.porcentaje,
      etiqueta   = excluded.etiqueta,
      qr_token   = excluded.qr_token;

-- ───────────────────────────────────────────────────────────────────
-- MESAS (punto 4)
-- El qr_token coincide con lo que ya codifican los PNG de
-- docs/imagenes/qr-mesa-*.png (TUMBO://mesa/<token>) y con lo que usa
-- el servicio de demostración. Sin ceros a la izquierda, a propósito.
-- ───────────────────────────────────────────────────────────────────
insert into public.mesas (numero, cantidad_comensales, tipo, qr_token) values
  (1, 2, 'estandar',           'tumbo-mesa-1'),
  (2, 4, 'estandar',           'tumbo-mesa-2'),
  (3, 6, 'vip',                'tumbo-mesa-3'),
  (4, 4, 'movilidad_reducida', 'tumbo-mesa-4'),
  (5, 8, 'vip',                'tumbo-mesa-5')
on conflict (numero) do update
  set cantidad_comensales = excluded.cantidad_comensales,
      tipo                = excluded.tipo,
      qr_token            = excluded.qr_token;

-- ───────────────────────────────────────────────────────────────────
-- CARTA · 5 platos, 5 bebidas y 2 postres
-- ───────────────────────────────────────────────────────────────────
insert into public.productos (tipo, nombre, descripcion, tiempo_elaboracion_min, precio, sector) values
  ('plato',  'Bife de chorizo',        'Bife de chorizo a la parrilla con guarnición de papas rústicas.',        25, 18500, 'cocina'),
  ('plato',  'Pizza de muzzarella',    'Masa madre de fermentación lenta, muzzarella y aceitunas.',              20, 14200, 'cocina'),
  ('plato',  'Sorrentinos de calabaza','Rellenos de calabaza y ricota, con manteca y salvia.',                   18, 15800, 'cocina'),
  ('plato',  'Ensalada de estación',   'Verdes, tomates cherry, nueces y aderezo de mostaza y miel.',            10,  9800, 'cocina'),
  ('plato',  'Sopa de calabaza',       'Crema de calabaza asada con jengibre y croutones de campo.',             15,  8900, 'cocina'),
  ('postre', 'Flan casero',            'Flan de vainilla con dulce de leche y crema batida.',                     5,  6400, 'cocina'),
  ('postre', 'Helado artesanal',       'Dos bochas a elección de la heladería del barrio.',                       4,  5900, 'cocina'),
  ('bebida', 'Vino Malbec',            'Copa de Malbec de Mendoza, cosecha del año anterior.',                    3, 11500, 'bar'),
  ('bebida', 'Café espresso',          'Café de tueste medio, servido corto.',                                    4,  3200, 'bar'),
  ('bebida', 'Limonada con menta',     'Limonada natural con menta y jengibre, servida con hielo.',               5,  5100, 'bar'),
  ('bebida', 'Agua mineral',           'Botella de medio litro, con o sin gas.',                                  2,  2800, 'bar'),
  ('bebida', 'Cerveza artesanal',      'Pinta de cerveza rubia de producción local.',                             3,  7400, 'bar')
on conflict (tipo, nombre) do update
  set descripcion            = excluded.descripcion,
      tiempo_elaboracion_min = excluded.tiempo_elaboracion_min,
      precio                 = excluded.precio;

-- ───────────────────────────────────────────────────────────────────
-- FOTOS DE LA CARTA · tres por producto (puntos 2, 3 y 11)
--
-- Provisorias: apuntan a las ilustraciones que ya están en
-- public/imagenes/tumbito/. Sirven para poder demostrar el menú desde
-- el primer día. Las fotos definitivas las carga el cocinero y el
-- cantinero desde el dispositivo, que es justamente lo que piden los
-- puntos 2 y 3.
-- ───────────────────────────────────────────────────────────────────
with fotos (nombre, f1, f2, f3) as (
  values
    ('Bife de chorizo',         'carne',     'saleros',   'cubiertos'),
    ('Pizza de muzzarella',     'pizza',     'rodillo',   'cubiertos'),
    ('Sorrentinos de calabaza', 'fideos',    'rodillo',   'saleros'),
    ('Ensalada de estación',    'ensalada',  'cubiertos', 'saleros'),
    ('Sopa de calabaza',        'sopa',      'cubiertos', 'saleros'),
    ('Vino Malbec',             'vino',      'cubiertos', 'saleros'),
    ('Café espresso',           'cafe',      'cubiertos', 'saleros')
)
insert into public.producto_fotos (producto_id, url, orden)
select p.id, 'imagenes/tumbito/' || v.archivo || '.webp', v.orden
  from fotos f
  join public.productos p on p.nombre = f.nombre
  cross join lateral (values (f.f1, 1::smallint), (f.f2, 2), (f.f3, 3)) as v(archivo, orden)
on conflict (producto_id, orden) do update set url = excluded.url;

-- ───────────────────────────────────────────────────────────────────
-- JUEGOS (puntos 14 y 15) · descuentos no acumulativos, solo si se
-- gana en el primer intento y solo para el cliente registrado
-- ───────────────────────────────────────────────────────────────────
insert into public.juegos (nombre, descripcion, porcentaje_descuento) values
  ('Memoria de la carta', 'Encontrá los pares de platos antes de que se acaben los intentos.', 10),
  ('Adivinanza del número', 'Adiviná el número escondido entre el 1 y el 10.',                 15),
  ('Piedra, papel o tijera', 'Ganale al chef en una sola mano.',                               20)
on conflict (nombre) do update
  set descripcion          = excluded.descripcion,
      porcentaje_descuento = excluded.porcentaje_descuento;

-- ───────────────────────────────────────────────────────────────────
-- ENCUESTA (punto 20)
-- La variedad de controles es requisito excluyente: la cátedra pide
-- explícitamente NO usar siempre el mismo control para recolectar
-- información. Son siete preguntas con siete controles distintos.
-- ───────────────────────────────────────────────────────────────────
insert into public.preguntas_encuesta (texto, tipo, opciones, minimo, maximo, orden, requerida) values
  ('¿Cómo calificarías la atención que recibiste?', 'estrellas', null, 1, 5, 1, true),
  ('¿Qué te pareció el tiempo de espera?', 'radio',
     '["Mucho más rápido de lo esperado","Rápido","Razonable","Lento","Muy lento"]'::jsonb,
     null, null, 2, true),
  ('¿Qué aspectos disfrutaste de tu visita?', 'checkbox',
     '["La comida","La atención","El ambiente","La música","Los precios","La limpieza"]'::jsonb,
     null, null, 3, false),
  ('¿Cómo conociste TUMBO?', 'select',
     '["Un conocido me lo recomendó","Redes sociales","Pasaba por la puerta","Ya soy cliente habitual"]'::jsonb,
     null, null, 4, true),
  ('¿Qué tan limpio encontraste el local?', 'rango', null, 1, 10, 5, true),
  ('¿Volverías a comer en TUMBO?', 'interruptor', null, null, null, 6, true),
  ('¿Querés contarnos algo más?', 'texto_largo', null, null, null, 7, false)
on conflict (orden) do update
  set texto     = excluded.texto,
      tipo      = excluded.tipo,
      opciones  = excluded.opciones,
      minimo    = excluded.minimo,
      maximo    = excluded.maximo,
      requerida = excluded.requerida;
