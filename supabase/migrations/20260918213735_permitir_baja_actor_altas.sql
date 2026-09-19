-- La bitácora de reintentos no debe impedir la baja legítima de un empleado.
-- Solo elimina sus solicitudes internas, no los productos ni las mesas creados.
alter table public.solicitudes_alta drop constraint solicitudes_alta_actor_fkey;
alter table public.solicitudes_alta add constraint solicitudes_alta_actor_fkey
 foreign key(actor) references public.usuarios(id) on delete cascade;
