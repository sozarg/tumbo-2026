-- ═══════════════════════════════════════════════════════════════════
-- TUMBO · Funciones, triggers y reglas de negocio en la base
--
-- Todo lo que decide permisos o dinero vive acá, no en el cliente:
-- el celular se puede intervenir, la base no.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- Ayudantes de perfil.
-- SECURITY DEFINER es imprescindible: sin él, consultar la tabla
-- usuarios desde una política RLS sobre usuarios provoca recursión.
-- ───────────────────────────────────────────────────────────────────
create or replace function public.perfil_actual()
returns perfil_usuario
language sql stable security definer set search_path = public
as $$ select perfil from public.usuarios where id = auth.uid() $$;

create or replace function public.es_gerencia()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.perfil_actual() in ('dueno','supervisor') $$;

create or replace function public.es_staff()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.perfil_actual() in
     ('dueno','supervisor','metre','mozo','cocinero','cantinero') $$;

create or replace function public.es_cliente()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.perfil_actual() in
     ('cliente_registrado','cliente_anonimo') $$;

-- ───────────────────────────────────────────────────────────────────
-- actualizado_en automático
-- ───────────────────────────────────────────────────────────────────
create or replace function public.tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create trigger trg_usuarios_actualizado before update on public.usuarios
  for each row execute function public.tocar_actualizado_en();
create trigger trg_mesas_actualizado before update on public.mesas
  for each row execute function public.tocar_actualizado_en();
create trigger trg_productos_actualizado before update on public.productos
  for each row execute function public.tocar_actualizado_en();

-- ───────────────────────────────────────────────────────────────────
-- ALTA AUTOMÁTICA DEL PERFIL AL CREARSE LA CUENTA
--
-- SEGURIDAD — leer antes de tocar esta función:
-- El perfil y el estado se toman de raw_app_meta_data, NO de
-- raw_user_meta_data. La diferencia es la que sostiene todo el modelo
-- de permisos: user_metadata lo puede escribir cualquiera al
-- registrarse (signUp lo acepta del cliente), mientras que
-- app_metadata solo lo puede escribir la clave service_role.
-- Si se leyera el perfil de user_metadata, cualquier persona podría
-- registrarse mandando perfil 'dueno' y quedar como administrador.
--
-- Los datos personales (nombres, apellidos, DNI, CUIL) sí salen de
-- user_metadata: son del propio usuario y no otorgan privilegios.
-- ───────────────────────────────────────────────────────────────────
create or replace function public.manejar_usuario_nuevo()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_app    jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  v_datos  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_perfil perfil_usuario;
  v_estado estado_registro;
  v_anonimo boolean := new.email is null;
begin
  if v_anonimo then
    -- Cliente anónimo (punto 9): solo nombre y foto, sin aprobación
    v_perfil := 'cliente_anonimo';
    v_estado := 'aprobado';
  else
    v_perfil := coalesce(
      nullif(v_app->>'perfil', '')::perfil_usuario,
      'cliente_registrado'
    );
    v_estado := coalesce(
      nullif(v_app->>'estado', '')::estado_registro,
      -- Solo el cliente registrado nace pendiente de aprobación (punto 5).
      -- El personal se crea con la clave service_role, ya aprobado.
      case when v_perfil = 'cliente_registrado'
           then 'pendiente'::estado_registro
           else 'aprobado'::estado_registro end
    );
  end if;

  if not v_anonimo and (
       nullif(v_datos->>'apellidos','') is null
    or nullif(v_datos->>'dni','') is null
  ) then
    raise exception using
      message = 'Falta completar los datos del perfil para crear la cuenta.',
      detail  = 'Se esperaban al menos apellidos y dni dentro de user_metadata.',
      hint    = 'Creá los usuarios desde la aplicación o con supabase/crear-usuarios.mjs, no desde el panel de Supabase.';
  end if;

  insert into public.usuarios (
    id, nombres, apellidos, dni, cuil, correo, perfil, estado, foto_url
  ) values (
    new.id,
    coalesce(nullif(v_datos->>'nombres',''), split_part(coalesce(new.email,'invitado'), '@', 1)),
    nullif(v_datos->>'apellidos',''),
    nullif(v_datos->>'dni',''),
    nullif(v_datos->>'cuil',''),
    new.email,
    v_perfil,
    v_estado,
    nullif(v_datos->>'foto_url','')
  );

  return new;
end $$;

create trigger trg_auth_usuario_nuevo
  after insert on auth.users
  for each row execute function public.manejar_usuario_nuevo();

-- ───────────────────────────────────────────────────────────────────
-- ACCESOS RÁPIDOS (requisito excluyente R12)
--
-- La pantalla de ingreso tiene que mostrar botones de acceso rápido de
-- usuarios con distintos perfiles, y la cátedra prohíbe que sean fijos:
-- deben salir de la base. Pero esa pantalla se ve SIN sesión iniciada,
-- y RLS le impide a un visitante anónimo leer la tabla usuarios.
--
-- La vista resuelve las dos cosas. Expone únicamente las seis columnas
-- necesarias para dibujar el botón, solo de cuentas aprobadas, y deja
-- el resto de la tabla protegido.
--
-- SOBRE LA SEGURIDAD DE LA VISTA:
-- Se deja a propósito con security_invoker desactivado, que es el valor
-- por defecto. Eso hace que la vista se evalúe con los permisos de su
-- dueño y no con los de quien consulta, que es justamente lo que
-- necesitamos para que un visitante sin sesión pueda leerla. El linter
-- de Supabase lo marca como aviso; acá es intencional y está acotado:
-- la vista no expone ni el DNI, ni el CUIL, ni el estado, ni el motivo
-- de rechazo, y filtra a las cuentas aprobadas.
-- ───────────────────────────────────────────────────────────────────
create view public.accesos_rapidos as
  select u.id, u.nombres, u.apellidos, u.correo, u.perfil, u.foto_url
    from public.usuarios u
   where u.estado = 'aprobado'
     and u.correo is not null
   order by
     case u.perfil
       when 'dueno' then 1 when 'supervisor' then 2 when 'metre' then 3
       when 'mozo' then 4 when 'cocinero' then 5 when 'cantinero' then 6
       when 'cliente_registrado' then 7 else 8
     end,
     u.apellidos nulls last, u.nombres;

comment on view public.accesos_rapidos is
  'Proyección segura de usuarios para los botones de acceso rápido de la pantalla de ingreso. Sin DNI, CUIL ni estado.';

revoke all on public.accesos_rapidos from public;
grant select on public.accesos_rapidos to anon, authenticated;

-- ───────────────────────────────────────────────────────────────────
-- El sector del ítem se hereda del producto: no lo manda el cliente
-- ───────────────────────────────────────────────────────────────────
create or replace function public.completar_datos_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p record;
begin
  select precio, sector into p from public.productos where id = new.producto_id;
  new.precio_unitario := coalesce(new.precio_unitario, p.precio);
  new.sector := p.sector;
  return new;
end $$;

create trigger trg_item_completar before insert on public.pedido_items
  for each row execute function public.completar_datos_item();

-- ───────────────────────────────────────────────────────────────────
-- Cuando TODOS los ítems quedan listos, el pedido pasa a 'listo'.
-- Implementa el punto 18: "solo se informará cuando el pedido, en los
-- sectores intervinientes, esté completo".
-- ───────────────────────────────────────────────────────────────────
create or replace function public.evaluar_pedido_listo()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pendientes integer;
begin
  select count(*) into pendientes
    from public.pedido_items
   where pedido_id = new.pedido_id and estado <> 'listo';

  if pendientes = 0 then
    update public.pedidos
       set estado = 'listo', listo_en = now()
     where id = new.pedido_id and estado <> 'listo';
  elsif new.estado = 'en_preparacion' then
    update public.pedidos
       set estado = 'en_preparacion'
     where id = new.pedido_id and estado = 'confirmado';
  end if;

  return new;
end $$;

create trigger trg_evaluar_pedido after update of estado on public.pedido_items
  for each row execute function public.evaluar_pedido_listo();

-- ───────────────────────────────────────────────────────────────────
-- Cálculo de la cuenta. Vive en la base para que el número que ve el
-- cliente y el que ve el mozo sean SIEMPRE el mismo (punto 21).
-- ───────────────────────────────────────────────────────────────────
create or replace function public.calcular_cuenta(p_sesion_id uuid)
returns table (
  subtotal numeric, descuento_pct numeric, descuento_monto numeric, base numeric
)
language sql stable security definer set search_path = public as $$
  with items as (
    select coalesce(sum(i.cantidad * i.precio_unitario), 0) as st
      from public.pedido_items i
      join public.pedidos p on p.id = i.pedido_id
     where p.sesion_mesa_id = p_sesion_id
       and p.estado in ('confirmado','en_preparacion','listo','entregado','pagado')
  ),
  desc_juego as (
    select coalesce(max(descuento_otorgado), 0) as pct
      from public.partidas_juego
     where sesion_mesa_id = p_sesion_id
  )
  select
    items.st,
    desc_juego.pct,
    round(items.st * desc_juego.pct / 100, 2),
    round(items.st - (items.st * desc_juego.pct / 100), 2)
  from items, desc_juego;
$$;

-- ───────────────────────────────────────────────────────────────────
-- Al confirmar el pago, la mesa vuelve a estar libre (punto 22)
-- ───────────────────────────────────────────────────────────────────
create or replace function public.liberar_mesa_al_confirmar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'confirmada' and old.estado <> 'confirmada' then
    update public.sesiones_mesa
       set estado = 'cerrada', cerrada_en = now()
     where id = new.sesion_mesa_id;

    update public.mesas m
       set estado = 'libre'
      from public.sesiones_mesa s
     where s.id = new.sesion_mesa_id and m.id = s.mesa_id;
  end if;
  return new;
end $$;

create trigger trg_liberar_mesa after update on public.cuentas
  for each row execute function public.liberar_mesa_al_confirmar();
