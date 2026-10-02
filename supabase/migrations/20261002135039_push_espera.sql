-- ═══════════════════════════════════════════════════════════════════
-- Push de la lista de espera (puntos 9 y 10)
--
-- - 9: «El metre recibe la actualización por push» cuando alguien se
--   anota en la lista de espera.
-- - 10: «Usar push para informar los cambios»: el cliente se entera de
--   la mesa que le asignaron.
--
-- Mismo mecanismo que el resto de los avisos: la base, no la
-- aplicación, decide que hay que avisar, y `avisar-push` vuelve a leer
-- la fila antes de mandar nada. Reemplaza a la función `enviar-push`,
-- que la invocaba el propio cliente.
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.avisar_espera()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.encolar_aviso(jsonb_build_object(
    'type', tg_op,
    'table', 'lista_espera',
    'record', jsonb_build_object('id', new.id, 'estado', new.estado::text)
  ));
  return null;
end $$;

drop trigger if exists trg_avisar_espera_nueva on public.lista_espera;
create trigger trg_avisar_espera_nueva
  after insert on public.lista_espera
  for each row
  when (new.estado = 'esperando')
  execute function public.avisar_espera();

drop trigger if exists trg_avisar_mesa_asignada on public.lista_espera;
create trigger trg_avisar_mesa_asignada
  after update of estado on public.lista_espera
  for each row
  when (old.estado is distinct from new.estado and new.estado = 'asignado')
  execute function public.avisar_espera();

revoke execute on function public.avisar_espera() from public, anon, authenticated;
