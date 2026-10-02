-- ═══════════════════════════════════════════════════════════════════
-- Catálogo con tres fotos por producto (puntos 2, 3 y 11)
--
-- El cliente solo ve los productos con sus tres fotos. Del catálogo
-- original, Agua mineral, Cerveza artesanal, Flan casero y Helado
-- artesanal tenían una sola, Papas fritas ninguna, y Limonada con menta
-- estaba inactiva: la carta mostraba tres bebidas y ningún postre.
--
-- Mismo criterio que `20260909000100_fotos_catalogo_completo.sql` y que
-- los productos que ya tenían las tres: ilustraciones de la marca.
-- Idempotente: no pisa fotos que ya existan.
-- ═══════════════════════════════════════════════════════════════════
with catalogo (nombre, orden, archivo) as (
  values
    ('Agua mineral', 2, 'cubiertos'),
    ('Agua mineral', 3, 'saleros'),
    ('Cerveza artesanal', 2, 'cubiertos'),
    ('Cerveza artesanal', 3, 'saleros'),
    ('Flan casero', 2, 'cubiertos'),
    ('Flan casero', 3, 'rodillo'),
    ('Helado artesanal', 2, 'cubiertos'),
    ('Helado artesanal', 3, 'rodillo'),
    ('Papas fritas', 1, 'saleros'),
    ('Papas fritas', 2, 'cubiertos'),
    ('Papas fritas', 3, 'rodillo')
)
insert into public.producto_fotos (producto_id, url, orden)
select p.id, 'imagenes/tumbito/' || c.archivo || '.webp', c.orden
  from catalogo c
  join public.productos p on p.nombre = c.nombre
on conflict (producto_id, orden) do nothing;

-- Limonada con menta ya tiene sus tres fotos: vuelve a la carta.
update public.productos set activo = true
 where nombre = 'Limonada con menta'
   and (select count(*) from public.producto_fotos f where f.producto_id = productos.id) = 3;
