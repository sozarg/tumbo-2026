-- ═══════════════════════════════════════════════════════════════════
-- TUMBO · Almacenamiento de imágenes
--
-- El plan gratuito da 1 GB para toda la organización. Una foto de
-- cámara pesa entre 3 y 5 MB, así que las imágenes SIEMPRE se
-- comprimen en el cliente antes de subir (1200 px de lado mayor,
-- calidad 80 ≈ 200 kB). Sin eso, el storage se llena en una tarde.
-- ═══════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public) values
  ('fotos-usuarios',  'fotos-usuarios',  true),
  ('fotos-productos', 'fotos-productos', true),
  ('fotos-mesas',     'fotos-mesas',     true)
on conflict (id) do nothing;

-- Convención de nombres:
--   fotos-usuarios/{usuario_id}/perfil.jpg
--   fotos-productos/{producto_id}/{orden}.jpg     (orden = 1, 2 o 3)
--   fotos-mesas/{mesa_id}/mesa.jpg

create policy "lectura publica de fotos" on storage.objects
  for select using (
    bucket_id in ('fotos-usuarios','fotos-productos','fotos-mesas')
  );

create policy "personas autenticadas suben fotos" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('fotos-usuarios','fotos-productos','fotos-mesas')
  );

create policy "personas autenticadas reemplazan fotos" on storage.objects
  for update to authenticated using (
    bucket_id in ('fotos-usuarios','fotos-productos','fotos-mesas')
  );
