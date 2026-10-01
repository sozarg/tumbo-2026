-- ═══════════════════════════════════════════════════════════════════
-- supabase/seed_data/historico-borrar.sql
--
-- Deshace `historico.sql`: borra los ocho clientes históricos
-- (`historico1..8@tumbo.demo`) y todo lo que cuelga de ellos. No toca a
-- ningún otro usuario ni ninguna estadía real.
-- ═══════════════════════════════════════════════════════════════════
begin;

create temp table historicos on commit drop as
  select id from public.usuarios where correo like 'historico%@tumbo.demo';
create temp table estadias_historicas on commit drop as
  select id from public.sesiones_mesa where cliente_id in (select id from historicos);

delete from public.respuestas_encuesta
 where encuesta_id in (select id from public.encuestas where sesion_mesa_id in (select id from estadias_historicas));
delete from public.encuestas where sesion_mesa_id in (select id from estadias_historicas);
delete from public.cuentas where sesion_mesa_id in (select id from estadias_historicas);
delete from public.partidas_juego where sesion_mesa_id in (select id from estadias_historicas);
delete from public.pedido_items
 where pedido_id in (select id from public.pedidos where sesion_mesa_id in (select id from estadias_historicas));
delete from public.pedidos where sesion_mesa_id in (select id from estadias_historicas);
delete from public.sesiones_mesa where id in (select id from estadias_historicas);
delete from auth.users where id in (select id from historicos);

commit;
