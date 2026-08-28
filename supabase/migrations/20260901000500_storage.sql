-- migrations/20260901000500_storage.sql

insert into storage.buckets (id, name, public) values
  ('fotos-usuarios',  'fotos-usuarios',  true),
  ('fotos-productos', 'fotos-productos', true),
  ('fotos-mesas',     'fotos-mesas',     true)
on conflict (id) do nothing;

create policy "lectura publica de fotos" on storage.objects
  for select using (
    bucket_id in ('fotos-usuarios','fotos-productos','fotos-mesas')
  );

create policy "usuarios autenticados suben fotos" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('fotos-usuarios','fotos-productos','fotos-mesas')
  );

-- Convención de nombres de archivo:
--   fotos-usuarios/{usuario_id}/perfil.jpg
--   fotos-productos/{producto_id}/{orden}.jpg      (orden = 1, 2 o 3)
--   fotos-mesas/{mesa_id}/mesa.jpg
-- Todas las fotos se comprimen antes de subir (ver sección 3.8 y riesgo R4).
