-- Completa la imagen principal de todos los productos de cocina y bar.
-- Las fotos cargadas desde la aplicación se guardan en Storage; estas rutas
-- públicas son el catálogo inicial seguro para instalaciones nuevas.
with catalogo (nombre, archivo) as (
  values
    ('Bife de chorizo', 'carne'),
    ('Pizza de muzzarella', 'pizza'),
    ('Sorrentinos de calabaza', 'fideos'),
    ('Ensalada de estación', 'ensalada'),
    ('Sopa de calabaza', 'sopa'),
    ('Flan casero', 'sopa'),
    ('Helado artesanal', 'sopa'),
    ('Vino Malbec', 'vino'),
    ('Café espresso', 'cafe'),
    ('Limonada con menta', 'sopa'),
    ('Agua mineral', 'vino'),
    ('Cerveza artesanal', 'vino')
)
insert into public.producto_fotos (producto_id, url, orden)
select p.id, 'imagenes/tumbito/' || c.archivo || '.webp', 1
from catalogo c
join public.productos p on p.nombre = c.nombre
on conflict (producto_id, orden) do nothing;
