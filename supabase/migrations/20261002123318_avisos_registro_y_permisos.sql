-- ═══════════════════════════════════════════════════════════════════
-- Avisos del registro (puntos 5 a 8) en el repositorio, y permisos
--
-- 1. Los triggers del registro de clientes —la push a gerencia cuando
--    alguien se registra (punto 6) y el correo cuando se lo aprueba o
--    rechaza (puntos 7 y 8)— existían solo en producción, cargados a
--    mano, con la dirección y la firma del webhook escritas en el
--    cuerpo de la función. Una base nueva no los tenía y la firma no
--    se podía cambiar sin tocar SQL. Ahora viven acá y leen las dos
--    cosas de Vault, igual que los avisos de los puntos 11 a 22.
--
-- 2. Permisos: las funciones de trigger no tienen por qué poder
--    llamarse por la API, y las funciones de mesa y cuenta no tienen
--    nada que hacer sin sesión. Los triggers se siguen disparando:
--    PostgreSQL controla EXECUTE al crear el trigger, no al dispararlo.
-- ═══════════════════════════════════════════════════════════════════

-- El envío común, para cualquier función de avisos.
create or replace function public.encolar_a(p_funcion text, p_cuerpo jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_firma text;
begin
  -- La carga del historial (seed_data/historico.sql) apaga los avisos
  -- para su transacción.
  if current_setting('tumbo.sin_avisos', true) = 'si' then
    return;
  end if;

  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'tumbo_url_funciones';
  select decrypted_secret into v_firma
    from vault.decrypted_secrets where name = 'tumbo_firma_webhook';

  if v_url is null or v_firma is null then
    raise notice 'Aviso sin enviar: faltan los secretos de Vault.';
    return;
  end if;

  perform net.http_post(
    url := rtrim(v_url, '/') || '/' || p_funcion,
    body := p_cuerpo,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-tumbo-firma', v_firma),
    timeout_milliseconds := 5000
  );
end $$;

create or replace function public.encolar_aviso(p_cuerpo jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.encolar_a('avisar-push', p_cuerpo);
end $$;

-- Punto 6: alguien se registra y espera aprobación → push a gerencia.
create or replace function public.avisar_cliente_pendiente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.encolar_a('avisar-push', jsonb_build_object(
    'type', 'INSERT',
    'table', 'usuarios',
    'record', jsonb_build_object('id', new.id, 'perfil', new.perfil::text, 'estado', new.estado::text)
  ));
  return null;
end $$;

drop trigger if exists trg_avisar_cliente_pendiente on public.usuarios;
create trigger trg_avisar_cliente_pendiente
  after insert on public.usuarios
  for each row
  when (new.perfil = 'cliente_registrado' and new.estado = 'pendiente')
  execute function public.avisar_cliente_pendiente();

-- Puntos 7 y 8: se aprueba o rechaza un registro → correo al cliente.
create or replace function public.avisar_registro_cliente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.encolar_a('avisar-cliente', jsonb_build_object(
    'type', 'UPDATE',
    'table', 'usuarios',
    'record', jsonb_build_object('id', new.id, 'estado', new.estado::text, 'perfil', new.perfil::text),
    'old_record', jsonb_build_object('estado', old.estado::text)
  ));
  return null;
end $$;

drop trigger if exists trg_avisar_registro_cliente on public.usuarios;
create trigger trg_avisar_registro_cliente
  after update on public.usuarios
  for each row
  when (old.estado is distinct from new.estado
        and new.perfil = 'cliente_registrado'
        and new.estado in ('aprobado', 'rechazado'))
  execute function public.avisar_registro_cliente();

-- ───────────────────────────────────────────────────────────────────
-- Permisos
-- ───────────────────────────────────────────────────────────────────
alter function public.tocar_actualizado_en() set search_path = public;

revoke execute on function public.encolar_a(text, jsonb) from public, anon, authenticated;
revoke execute on function public.encolar_aviso(jsonb) from public, anon, authenticated;
revoke execute on function public.avisar_cliente_pendiente() from public, anon, authenticated;
revoke execute on function public.avisar_registro_cliente() from public, anon, authenticated;
revoke execute on function public.completar_datos_item() from public, anon, authenticated;
revoke execute on function public.evaluar_pedido_listo() from public, anon, authenticated;
revoke execute on function public.proteger_columnas_de_autorizacion() from public, anon, authenticated;
revoke execute on function public.manejar_usuario_nuevo() from public, anon, authenticated;

-- Se usan con sesión iniciada (metre, cliente con mesa): sin sesión, nada.
revoke execute on function public.calcular_cuenta(uuid) from public, anon;
grant execute on function public.calcular_cuenta(uuid) to authenticated;
do $$
begin
  -- Las dos del punto 10 llegan con la rama de Cruz; si ya están, se cierran.
  if to_regprocedure('public.asignar_mesa_a_cliente(uuid, uuid)') is not null then
    revoke execute on function public.asignar_mesa_a_cliente(uuid, uuid) from public, anon;
    grant execute on function public.asignar_mesa_a_cliente(uuid, uuid) to authenticated;
  end if;
  if to_regprocedure('public.vincular_mesa_asignada(text)') is not null then
    revoke execute on function public.vincular_mesa_asignada(text) from public, anon;
    grant execute on function public.vincular_mesa_asignada(text) to authenticated;
  end if;
end $$;
