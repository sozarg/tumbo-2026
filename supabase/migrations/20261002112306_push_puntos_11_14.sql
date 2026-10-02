-- ═══════════════════════════════════════════════════════════════════
-- Push de los puntos 11 a 14
--
-- - 11: «Todos los mozos reciben la consulta y la respuesta del mozo
--   llega al cliente por push».
-- - 12: el pedido «espera confirmación del mozo»: el mozo se entera.
-- - 13: el cliente cuyo pedido se rechaza «recibe las notificaciones
--   correspondientes».
-- - 14: «El mozo confirma y deriva cada parte a cocina y bar mediante
--   push».
--
-- Mismo mecanismo que los puntos 18, 21 y 22: el trigger solo dice qué
-- fila cambió y `encolar_aviso` lo manda a la función `avisar-push`,
-- que vuelve a leer la base y decide a quién avisar.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.avisar_cambio_de_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.encolar_aviso(jsonb_build_object(
    'type', tg_op,
    'table', 'pedidos',
    'record', jsonb_build_object('id', new.id, 'estado', new.estado::text)
  ));
  return null;
end $$;

-- `enviar_pedido` crea el pedido directamente en «pendiente de
-- confirmación», por eso hace falta el INSERT además del UPDATE.
drop trigger if exists trg_avisar_pedido_nuevo on public.pedidos;
create trigger trg_avisar_pedido_nuevo
  after insert on public.pedidos
  for each row
  when (new.estado = 'pendiente_confirmacion')
  execute function public.avisar_cambio_de_pedido();

drop trigger if exists trg_avisar_cambio_de_pedido on public.pedidos;
create trigger trg_avisar_cambio_de_pedido
  after update of estado on public.pedidos
  for each row
  when (old.estado is distinct from new.estado
        and new.estado in ('pendiente_confirmacion', 'rechazado', 'confirmado'))
  execute function public.avisar_cambio_de_pedido();

create or replace function public.avisar_mensaje()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.encolar_aviso(jsonb_build_object(
    'type', 'INSERT',
    'table', 'mensajes',
    'record', jsonb_build_object('id', new.id, 'tipo', new.tipo::text)
  ));
  return null;
end $$;

drop trigger if exists trg_avisar_mensaje on public.mensajes;
create trigger trg_avisar_mensaje
  after insert on public.mensajes
  for each row execute function public.avisar_mensaje();

revoke execute on function public.avisar_cambio_de_pedido() from public, anon, authenticated;
revoke execute on function public.avisar_mensaje() from public, anon, authenticated;
