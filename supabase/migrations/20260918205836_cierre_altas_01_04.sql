-- Altas 01–04: publicación atómica, reintentos y disponibilidad consistente.
-- Los registros históricos se conservan; los incompletos quedan visibles a gerencia para reparación.
create table public.solicitudes_alta (
 id uuid primary key, actor uuid not null references public.usuarios(id), clase text not null check(clase in ('empleado','producto','mesa')),
 recurso uuid not null default gen_random_uuid(), destino uuid, finalizada boolean not null default false,
 bloqueo_hasta timestamptz not null default now(), creada_en timestamptz not null default now()
);
alter table public.solicitudes_alta enable row level security;
revoke all on public.solicitudes_alta from anon, authenticated;
grant all on public.solicitudes_alta to service_role;

create function public.reservar_alta(p_id uuid,p_actor uuid,p_clase text,p_destino uuid default null)
returns public.solicitudes_alta language plpgsql security invoker set search_path=public as $$
declare r public.solicitudes_alta;
begin
 insert into public.solicitudes_alta(id,actor,clase,destino) values(p_id,p_actor,p_clase,p_destino) on conflict do nothing;
 select * into r from public.solicitudes_alta where id=p_id for update;
 if r.actor<>p_actor or r.clase<>p_clase or r.destino is distinct from p_destino then raise exception 'Solicitud incompatible.'; end if;
 if not r.finalizada and r.bloqueo_hasta>now() then raise exception 'Alta en proceso. Esperá antes de reintentar.' using errcode='55P03'; end if;
 update public.solicitudes_alta set bloqueo_hasta=now()+interval '5 minutes' where id=p_id returning * into r;
 return r;
end $$;
revoke all on function public.reservar_alta(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.reservar_alta(uuid,uuid,text,uuid) to service_role;

create function public.cuil_coherente(p_cuil text,p_dni text) returns boolean language plpgsql immutable set search_path=public as $$
declare n text:=replace(p_cuil,'-',''); pesos int[]:=array[5,4,3,2,7,6,5,4,3,2]; suma int:=0;
begin
 if p_cuil is null or p_dni is null or p_cuil !~ '^[0-9]{2}-?[0-9]{8}-?[0-9]$' then return false; end if;
 for i in 1..10 loop suma:=suma+substring(n,i,1)::int*pesos[i]; end loop;
 return substring(n,3,8)=lpad(p_dni,8,'0') and (11-suma%11)%11=substring(n,11,1)::int;
end $$;
-- NOT VALID preserva legajos históricos; se exige en nuevas filas y cambios.
alter table public.usuarios add constraint empleado_cuil_coherente check(perfil not in ('metre','mozo','cocinero','cantinero') or public.cuil_coherente(cuil,dni)) not valid;
alter table public.mesas add constraint rango_numero_mesa check(numero between 1 and 999) not valid;
alter table public.productos add constraint rango_minutos_precio check(tiempo_elaboracion_min between 1 and 600 and precio>=1) not valid;

-- Las escrituras del catálogo y de sus fotos pasan por la función autenticada que decodifica el archivo.
drop policy productos_alta on public.productos;
drop policy productos_modificacion on public.productos;
drop policy fotos_escritura on public.producto_fotos;
create policy productos_baja on public.productos for update to authenticated
 using(public.esta_habilitado() and (public.es_gerencia() or (public.perfil_actual()='cocinero' and tipo in ('plato','postre')) or (public.perfil_actual()='cantinero' and tipo='bebida')))
 with check(public.esta_habilitado() and (public.es_gerencia() or (public.perfil_actual()='cocinero' and tipo in ('plato','postre')) or (public.perfil_actual()='cantinero' and tipo='bebida')));
revoke insert,update,delete on public.productos from anon,authenticated;
grant update(activo) on public.productos to authenticated;
revoke insert,update,delete on public.producto_fotos from anon,authenticated;
revoke insert,update on public.mesas from anon,authenticated;
grant update(estado) on public.mesas to authenticated;
alter policy mesas_escritura on public.mesas using(public.es_gerencia() and public.esta_habilitado()) with check(public.es_gerencia() and public.esta_habilitado());

-- Lectura pública solo de productos completos. Gerencia/sector puede recuperar históricos incompletos.
drop policy productos_lectura on public.productos;
create policy productos_lectura on public.productos for select using (
 (select count(*) from public.producto_fotos f where f.producto_id=productos.id)=3
 or (public.esta_habilitado() and (public.es_gerencia() or (public.perfil_actual()='cocinero' and tipo in ('plato','postre')) or (public.perfil_actual()='cantinero' and tipo='bebida')))
);

-- No hay subidas directas al catálogo: evita sustituir objetos validados por bytes arbitrarios.
drop policy "personas autenticadas suben fotos" on storage.objects;
drop policy "personas autenticadas reemplazan fotos" on storage.objects;
-- Conserva el camino personal de clientes sin permitir escribir legajos de empleados.
create policy cliente_sube_foto_propia on storage.objects for insert to authenticated with check (
 bucket_id='fotos-usuarios' and (storage.foldername(name))[1]=auth.uid()::text
 and public.perfil_actual() in ('cliente_registrado','cliente_anonimo')
);
update storage.buckets set file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id in ('fotos-usuarios','fotos-productos','fotos-mesas');

-- Fuente confiable también para escrituras directas del legajo.
create function public.proteger_alta_empleado() returns trigger language plpgsql set search_path=public as $$
begin
 if current_user in ('anon','authenticated') then
   if tg_op='INSERT' and new.perfil not in ('cliente_registrado','cliente_anonimo') then raise exception 'El personal se crea mediante el alta autorizada.' using errcode='42501'; end if;
   if tg_op='UPDATE' then
     if new.perfil is distinct from old.perfil then raise exception 'No se permite reasignar perfiles por esta vía.' using errcode='42501'; end if;
     if old.perfil in ('metre','mozo','cocinero','cantinero') and (new.foto_url is distinct from old.foto_url or new.cuil is distinct from old.cuil or new.dni is distinct from old.dni) then raise exception 'El legajo se modifica desde el servidor autorizado.' using errcode='42501'; end if;
   end if;
 end if;
 return new;
end $$;
create trigger trg_alta_empleado before insert or update on public.usuarios for each row execute function public.proteger_alta_empleado();

-- Una marca administrativa no es una estadía. El bloqueo de fila coordina ambos caminos.
alter table public.mesas add column bloqueada_administrativamente boolean not null default false;
update public.mesas m set bloqueada_administrativamente=true where estado='ocupada' and not exists(select 1 from public.sesiones_mesa s where s.mesa_id=m.id and s.estado in ('activa','cuenta_solicitada','pagada'));
create function public.proteger_disponibilidad() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.qr_token is distinct from old.qr_token then raise exception 'El QR de la mesa es permanente.'; end if;
 if new.estado='libre' and exists(select 1 from public.sesiones_mesa where mesa_id=old.id and estado in ('activa','cuenta_solicitada','pagada')) then raise exception 'La mesa tiene una estadía activa; no se puede liberar.' using errcode='23514'; end if;
 if pg_trigger_depth()=1 and new.estado is distinct from old.estado then new.bloqueada_administrativamente:=(new.estado='ocupada'); end if;
 return new;
end $$;
create trigger trg_disponibilidad before update on public.mesas for each row execute function public.proteger_disponibilidad();
create function public.coordinar_estadia_mesa() returns trigger language plpgsql security definer set search_path=public as $$
declare m public.mesas;
begin
 if new.estado in ('activa','cuenta_solicitada','pagada') and (tg_op='INSERT' or new.mesa_id is distinct from old.mesa_id or old.estado not in ('activa','cuenta_solicitada','pagada')) then
   select * into m from public.mesas where id=new.mesa_id for update;
   if m.bloqueada_administrativamente then raise exception 'La mesa no está disponible administrativamente.' using errcode='23514'; end if;
   update public.mesas set estado='ocupada' where id=new.mesa_id;
 end if;
 return new;
end $$;
create trigger trg_coordinar_estadia before insert or update on public.sesiones_mesa for each row execute function public.coordinar_estadia_mesa();

-- Solo el servidor dispone de este RPC: archivos ya decodificados y existentes en Storage.
create function public.finalizar_alta(p_id uuid,p_datos jsonb,p_fotos jsonb)
returns uuid language plpgsql security invoker set search_path=public as $$
declare r public.solicitudes_alta; v_id uuid; actor public.usuarios; tipo_actual tipo_producto; f jsonb; cantidad int;
begin
 select * into strict r from public.solicitudes_alta where id=p_id for update;
 v_id:=coalesce(r.destino,r.recurso);
 if r.finalizada then return v_id; end if;
 select * into strict actor from public.usuarios where id=r.actor;
 if actor.estado<>'aprobado' then raise exception 'Actor no aprobado.' using errcode='42501'; end if;
 if r.clase in ('mesa','empleado') and actor.perfil not in ('dueno','supervisor') then raise exception 'Solo gerencia.' using errcode='42501'; end if;
 if r.clase='producto' then
   if r.destino is not null then select tipo into strict tipo_actual from public.productos where id=v_id for update; else tipo_actual:=(p_datos->>'tipo')::tipo_producto; end if;
   if not (actor.perfil in ('dueno','supervisor') or (actor.perfil='cocinero' and tipo_actual in ('plato','postre')) or (actor.perfil='cantinero' and tipo_actual='bebida')) then raise exception 'Sector no autorizado.' using errcode='42501'; end if;
   if tipo_actual<>(p_datos->>'tipo')::tipo_producto then raise exception 'No se puede cambiar de sector.'; end if;
   if jsonb_typeof(p_datos->'precio')<>'number' or (p_datos->>'precio')::numeric<>round((p_datos->>'precio')::numeric,2) then raise exception 'Precio inválido.'; end if;
   if r.destino is null then
    insert into public.productos(id,tipo,nombre,descripcion,tiempo_elaboracion_min,precio,sector,activo,creado_por) values(v_id,tipo_actual,p_datos->>'nombre',p_datos->>'descripcion',(p_datos->>'minutos')::int,(p_datos->>'precio')::numeric,case when tipo_actual='bebida' then 'bar'::sector_preparacion else 'cocina'::sector_preparacion end,false,r.actor);
   else
    update public.productos set nombre=p_datos->>'nombre',descripcion=p_datos->>'descripcion',tiempo_elaboracion_min=(p_datos->>'minutos')::int,precio=(p_datos->>'precio')::numeric where id=v_id;
   end if;
   for f in select * from jsonb_array_elements(p_fotos) loop
    if not exists(select 1 from storage.objects where bucket_id='fotos-productos' and name=f->>'ruta') then raise exception 'Falta un archivo de producto.'; end if;
    insert into public.producto_fotos(producto_id,orden,url) values(v_id,(f->>'orden')::int,f->>'url') on conflict(producto_id,orden) do update set url=excluded.url;
   end loop;
   select count(*) into cantidad from public.producto_fotos where producto_id=v_id;
   if cantidad<>3 then raise exception 'Se requieren exactamente tres fotos.'; end if;
   update public.productos set activo=true where id=v_id;
 elsif r.clase='mesa' then
   if r.destino is null and jsonb_array_length(p_fotos)<>1 then raise exception 'Falta la foto de la mesa.'; end if;
   f:=p_fotos->0;
   if f is not null and not exists(select 1 from storage.objects where bucket_id='fotos-mesas' and name=f->>'ruta') then raise exception 'Falta el archivo de mesa.'; end if;
   if r.destino is null then
    insert into public.mesas(id,numero,cantidad_comensales,tipo,foto_url) values(v_id,(p_datos->>'numero')::int,(p_datos->>'comensales')::int,(p_datos->>'tipo')::tipo_mesa,f->>'url');
   else
    update public.mesas set numero=(p_datos->>'numero')::int,cantidad_comensales=(p_datos->>'comensales')::int,tipo=(p_datos->>'tipo')::tipo_mesa,foto_url=coalesce(f->>'url',foto_url) where id=v_id;
    if not found then raise exception 'Mesa inexistente.'; end if;
   end if;
 else
   if jsonb_array_length(p_fotos)<>1 then raise exception 'Falta la foto del empleado.'; end if;
   f:=p_fotos->0;
   if not exists(select 1 from storage.objects where bucket_id='fotos-usuarios' and name=f->>'ruta') then raise exception 'Falta el archivo del empleado.'; end if;
   if p_datos->>'perfil' not in ('metre','mozo','cocinero','cantinero') then raise exception 'Perfil no permitido.'; end if;
   update public.usuarios set perfil=(p_datos->>'perfil')::perfil_usuario,estado='aprobado',foto_url=f->>'url' where id=v_id;
   if not found then raise exception 'Empleado inexistente.'; end if;
 end if;
 update public.solicitudes_alta set finalizada=true,bloqueo_hasta=now() where id=p_id;
 return v_id;
end $$;
revoke all on function public.finalizar_alta(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.finalizar_alta(uuid,jsonb,jsonb) to service_role;

-- Publicación idempotente, sin tocar las tablas de los puntos 05–22.
do $$ declare t text; begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if;
 foreach t in array array['mesas','productos','producto_fotos','usuarios'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
 end loop;
end $$;
