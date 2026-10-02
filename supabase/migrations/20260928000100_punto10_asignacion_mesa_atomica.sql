-- Punto 10: asignación y vinculación de una mesa sin operaciones parciales.
--
-- La asignación no crea la estadía: deja la entrada en estado `asignado`.
-- La estadía se crea cuando el cliente escanea el QR de su mesa.
-- Ambas operaciones se ejecutan dentro de una transacción PostgreSQL.

-- El cliente solo puede darse de baja mientras todavía está esperando.
-- No puede cambiar por sí mismo mesa_id ni estado a `asignado`.
drop policy if exists espera_actualizar on public.lista_espera;

create policy espera_staff_asigna on public.lista_espera
  for update using (public.perfil_actual() in ('metre', 'dueno', 'supervisor'))
  with check (public.perfil_actual() in ('metre', 'dueno', 'supervisor'));

create policy espera_cliente_se_baja on public.lista_espera
  for update using (cliente_id = auth.uid() and estado = 'esperando')
  with check (
    cliente_id = auth.uid()
    and estado = 'eliminado'
    and mesa_id is null
    and asignado_en is null
  );

-- Una mesa solo puede estar reservada para una entrada asignada al mismo
-- tiempo. Esto cubre dos maîtres concurrentes aunque ambos vean la mesa
-- libre antes de confirmar: solo una actualización puede ganar.
create unique index if not exists idx_espera_mesa_asignada_unica
  on public.lista_espera(mesa_id) where estado = 'asignado';

-- La vinculación del cliente se hace únicamente por la función segura de abajo.
-- El personal conserva la capacidad operativa existente sin habilitar a los
-- clientes a insertar sesiones arbitrarias desde el navegador.
drop policy if exists sesiones_crear on public.sesiones_mesa;

create policy sesiones_crear_staff on public.sesiones_mesa
  for insert with check (public.es_staff());

drop policy if exists sesiones_actualizar on public.sesiones_mesa;

create policy sesiones_actualizar_staff on public.sesiones_mesa
  for update using (public.es_staff())
  with check (public.es_staff());

create or replace function public.asignar_mesa_a_cliente(
  p_espera_id uuid,
  p_mesa_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_espera public.lista_espera%rowtype;
  v_mesa public.mesas%rowtype;
begin
  if auth.uid() is null
     or public.perfil_actual() not in ('metre', 'dueno', 'supervisor') then
    raise exception 'Solo el maître puede asignar mesas.' using errcode = '42501';
  end if;

  -- El orden de bloqueos es entrada y luego mesa, igual que en la función
  -- de vinculación, para que dos opérations concurrentes no se interbloqueen.
  select * into v_espera
    from public.lista_espera
   where id = p_espera_id
   for update;

  if not found then
    raise exception 'La persona ya no está en la lista de espera.' using errcode = 'P0002';
  end if;

  if v_espera.estado <> 'esperando' then
    raise exception 'La persona ya no está esperando una mesa.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.usuarios
     where id = v_espera.cliente_id
       and perfil in ('cliente_registrado', 'cliente_anonimo')
       and estado = 'aprobado'
  ) then
    raise exception 'La persona de la espera no es un cliente habilitado.' using errcode = '42501';
  end if;

  select * into v_mesa
    from public.mesas
   where id = p_mesa_id
   for update;

  if not found then
    raise exception 'La mesa seleccionada no existe.' using errcode = 'P0002';
  end if;

  if v_mesa.estado <> 'libre' then
    raise exception 'La mesa % ya está ocupada.', v_mesa.numero using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.sesiones_mesa
     where mesa_id = p_mesa_id
       and estado in ('activa', 'cuenta_solicitada', 'pagada')
  ) then
    raise exception 'La mesa % ya tiene una estadía activa.', v_mesa.numero using errcode = '23505';
  end if;

  if exists (
    select 1 from public.sesiones_mesa
     where cliente_id = v_espera.cliente_id
       and estado in ('activa', 'cuenta_solicitada', 'pagada')
  ) then
    raise exception 'El cliente ya tiene una mesa activa.' using errcode = '23505';
  end if;

  update public.lista_espera
     set estado = 'asignado', mesa_id = p_mesa_id, asignado_en = now()
   where id = p_espera_id;

  -- Es una notificación persistida dentro de la misma transacción. No es FCM:
  -- permite actualizar la app abierta; el envío push queda a cargo de la
  -- infraestructura FCM/Edge Function cuando sea incorporada.
  insert into public.notificaciones (usuario_id, titulo, cuerpo, datos)
  values (
    v_espera.cliente_id,
    'Mesa asignada',
    format('El maître te asignó la mesa %s. Escaneá el QR de esa mesa.', v_mesa.numero),
    jsonb_build_object('evento', 'mesa_asignada', 'mesa_id', p_mesa_id, 'mesa_numero', v_mesa.numero)
  );

  return p_espera_id;
end;
$$;

comment on function public.asignar_mesa_a_cliente(uuid, uuid) is
  'Asigna una mesa libre a una entrada en espera y registra la notificación en una única transacción.';

revoke execute on function public.asignar_mesa_a_cliente(uuid, uuid) from public;
grant execute on function public.asignar_mesa_a_cliente(uuid, uuid) to authenticated;

create or replace function public.vincular_mesa_asignada(p_qr_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_espera public.lista_espera%rowtype;
  v_mesa public.mesas%rowtype;
  v_sesion_id uuid;
begin
  if auth.uid() is null
     or public.perfil_actual() not in ('cliente_registrado', 'cliente_anonimo')
     or not public.esta_habilitado() then
    raise exception 'La sesión del cliente no está habilitada.' using errcode = '42501';
  end if;

  -- Si ya existe una estadía activa, ni siquiera se intenta una segunda.
  if exists (
    select 1 from public.sesiones_mesa
     where cliente_id = auth.uid()
       and estado in ('activa', 'cuenta_solicitada', 'pagada')
  ) then
    raise exception 'Ya tenés una mesa vinculada. No podés vincular otra.' using errcode = '23505';
  end if;

  -- Mantener el mismo orden de bloqueos que la asignación: espera y mesa.
  select * into v_espera
    from public.lista_espera
   where cliente_id = auth.uid()
     and estado = 'asignado'
   order by asignado_en desc
   limit 1
   for update;

  if not found then
    raise exception 'Primero tenés que estar en la lista de espera y recibir una asignación.' using errcode = 'P0001';
  end if;

  select * into v_mesa
    from public.mesas
   where qr_token = p_qr_token
   for update;

  if not found then
    raise exception 'El QR no corresponde a una mesa válida.' using errcode = 'P0002';
  end if;

  if v_espera.mesa_id <> v_mesa.id then
    raise exception 'Tenés asignada la mesa %. Escaneá el QR de esa mesa.',
      (select numero from public.mesas where id = v_espera.mesa_id)
      using errcode = 'P0001';
  end if;

  if v_mesa.estado <> 'libre' then
    raise exception 'La mesa % ya no está disponible.', v_mesa.numero using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.sesiones_mesa
     where mesa_id = v_mesa.id
       and estado in ('activa', 'cuenta_solicitada', 'pagada')
  ) then
    raise exception 'La mesa % ya está vinculada a otro cliente.', v_mesa.numero using errcode = '23505';
  end if;

  insert into public.sesiones_mesa (mesa_id, cliente_id, comensales)
  values (v_mesa.id, auth.uid(), v_mesa.cantidad_comensales)
  returning id into v_sesion_id;

  update public.mesas
     set estado = 'ocupada'
   where id = v_mesa.id;

  return v_sesion_id;
end;
$$;

comment on function public.vincular_mesa_asignada(text) is
  'Vincula al cliente exclusivamente con la mesa asignada cuyo QR escaneó y la marca ocupada atómicamente.';

revoke execute on function public.vincular_mesa_asignada(text) from public;
grant execute on function public.vincular_mesa_asignada(text) to authenticated;
