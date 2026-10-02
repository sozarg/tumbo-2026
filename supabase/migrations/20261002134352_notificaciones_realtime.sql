-- ═══════════════════════════════════════════════════════════════════
-- `notificaciones` en realtime (puntos 9 y 10)
--
-- La aplicación se suscribe a `notificaciones` para que el cliente se
-- entere en vivo de la mesa que le asignaron. Realtime rechaza el canal
-- ENTERO si una de sus tablas no está publicada: sin esto se cortaban
-- también los avisos en vivo de pedidos, cocina, bar y cuentas.
-- Cada usuario solo recibe sus filas: lo limita `notificaciones_propias`.
-- ═══════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificaciones'
  ) then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
end $$;
