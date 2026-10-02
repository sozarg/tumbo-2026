-- ═══════════════════════════════════════════════════════════════════
-- Limpieza de los datos de prueba de producción (02/10/2026)
--
-- Se ejecutó una vez, en una sola transacción, contra la base de la
-- aplicación publicada. Queda versionado para saber qué se borró y por
-- qué. Es idempotente: correrlo de nuevo no hace nada.
--
-- Los empleados de prueba NO se borran acá: se dan de baja con la
-- función `eliminar-empleado`, que además borra su foto de Storage.
-- ═══════════════════════════════════════════════════════════════════
begin;
-- Nada de esto tiene que mandar push ni correos.
select set_config('tumbo.sin_avisos', 'si', true);

create temp table antes on commit drop as select
  (select coalesce(sum(total), 0) from public.cuentas) as total_cuentas,
  (select count(*) from public.sesiones_mesa) as estadias,
  (select count(*) from public.pedido_items) as items,
  (select count(*) from public.encuestas) as encuestas;

-- 1. Historial: los ítems de la bebida «prueba» pasan a Cerveza
--    artesanal (también bar). El precio de cada ítem queda como estaba:
--    las cuentas no cambian.
update public.pedido_items i
   set producto_id = (select id from public.productos where nombre = 'Cerveza artesanal')
 where i.producto_id = (select id from public.productos where nombre = 'prueba' and tipo = 'bebida');

-- 2. Mesas 6, 8 y 19: sus estadías (todas cerradas, del historial) se
--    reparten entre las mesas 1 a 5; después se borran las mesas.
do $$
begin
  if exists (select 1 from public.sesiones_mesa s join public.mesas m on m.id = s.mesa_id
              where m.numero in (6, 8, 19) and s.estado <> 'cerrada') then
    raise exception 'Hay una estadía abierta en las mesas 6, 8 o 19: se cancela la limpieza.';
  end if;
end $$;
with destino as (
  select s.id, (select id from public.mesas where numero = 1 + (abs(hashtext(s.id::text)) % 5)) as mesa
    from public.sesiones_mesa s join public.mesas m on m.id = s.mesa_id
   where m.numero in (6, 8, 19)
)
update public.sesiones_mesa s set mesa_id = d.mesa from destino d where d.id = s.id;

-- 3. Camila: las dos entradas viejas de la lista de espera (una asignada
--    a la mesa 19 desde el 06/09) y su estadía abierta en la mesa 1 desde
--    el 06/09, que no tiene pedidos, cuenta ni mensajes.
delete from public.lista_espera
 where cliente_id = (select id from public.usuarios where correo = 'camila@tumbo.demo')
   and estado in ('esperando', 'asignado');
delete from public.sesiones_mesa s
 where s.cliente_id = (select id from public.usuarios where correo = 'camila@tumbo.demo')
   and s.estado <> 'cerrada'
   and not exists (select 1 from public.pedidos p where p.sesion_mesa_id = s.id)
   and not exists (select 1 from public.cuentas c where c.sesion_mesa_id = s.id)
   and not exists (select 1 from public.mensajes m where m.sesion_mesa_id = s.id)
   and not exists (select 1 from public.partidas_juego j where j.sesion_mesa_id = s.id)
   and not exists (select 1 from public.encuestas e where e.sesion_mesa_id = s.id);

delete from public.solicitudes_alta where recurso in (select id from public.mesas where numero in (6, 8, 19));
delete from public.mesas where numero in (6, 8, 19);

-- 4. Las mesas ocupadas sin estadía (bloqueos de prueba) quedan libres:
--    la demostración arranca con el salón vacío.
update public.mesas m set estado = 'libre'
 where m.estado <> 'libre'
   and not exists (select 1 from public.sesiones_mesa s
                    where s.mesa_id = m.id and s.estado in ('activa', 'cuenta_solicitada', 'pagada'));

-- 5. Productos de prueba (las fotos se borran en cascada) y las altas
--    pendientes de las pruebas.
delete from public.solicitudes_alta
 where clase = 'producto'
   and (recurso is null
        or recurso not in (select id from public.productos)
        or recurso in (select id from public.productos
                        where nombre in ('prueba', 'asdada', 'asdasdad', 'mmmmm', 'Prueba 1', 'Prueba 12',
                                         'Prueba 15', 'sbhshehe', 'sdsadasd', 'Monster')));
delete from public.solicitudes_alta where clase = 'mesa' and (recurso is null or recurso not in (select id from public.mesas));
delete from public.productos
 where nombre in ('prueba', 'asdada', 'asdasdad', 'mmmmm', 'Prueba 1', 'Prueba 12',
                  'Prueba 15', 'sbhshehe', 'sdsadasd', 'Monster');

-- 6. Altas pendientes de empleados que ya no existen. Los empleados de
--    prueba se dan de baja con `eliminar-empleado`; este script se vuelve
--    a correr después, y entonces sí borra sus solicitudes.
delete from public.solicitudes_alta
 where clase = 'empleado' and recurso not in (select id from public.usuarios);

-- Controles: si algo del historial cambió, no se confirma nada.
do $$
declare a record;
begin
  select * into a from antes;
  if (select coalesce(sum(total), 0) from public.cuentas) <> a.total_cuentas then
    raise exception 'Cambió la suma de las cuentas: se cancela.';
  end if;
  if (select count(*) from public.encuestas) <> a.encuestas then
    raise exception 'Cambió la cantidad de encuestas: se cancela.';
  end if;
  if (select count(*) from public.pedido_items) <> a.items then
    raise exception 'Cambió la cantidad de ítems: se cancela.';
  end if;
  if (select count(*) from public.sesiones_mesa) not between a.estadias - 1 and a.estadias then
    raise exception 'Se borró más de una estadía: se cancela.';
  end if;
end $$;

commit;
