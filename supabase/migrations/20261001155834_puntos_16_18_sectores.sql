-- ═══════════════════════════════════════════════════════════════════
-- Puntos 16, 17 y 18: cocina, bar y pedido completo.
--
-- 1. Realtime para `pedidos` y `pedido_items`. Sin esto, la cocina no
--    se entera de que el mozo confirmó un pedido y el cliente no ve los
--    cambios de estado hasta recargar: justo lo que piden los tres puntos.
--    También `lista_espera` y `mensajes`: la aplicación escucha las ocho
--    tablas en UN solo canal, y si una no está publicada Realtime
--    rechaza la suscripción entera («Unable to subscribe to changes»).
--    Faltaban esas dos, así que no llegaba ningún cambio en vivo.
-- 2. `evaluar_pedido_listo` pasa el pedido a «en preparación» apenas un
--    sector arranca o termina su parte. Antes quedaba en «confirmado»
--    hasta que terminaban los dos, y el cliente no veía avance.
-- 3. El personal de cocina y bar solo puede cambiar el ESTADO de sus
--    ítems, solo hacia adelante y solo con el pedido en preparación. La
--    política `items_sector_actualiza` le deja tocar cualquier columna,
--    incluida la cantidad y el precio. Y el cliente no puede crear ni
--    dejar sus ítems como ya preparados.
-- 4. Cuando el pedido queda completo, la base avisa al mozo por push
--    (punto 18). Lo hace la base y no el teléfono del cocinero, para que
--    el aviso salga aunque esa aplicación se cierre justo después.
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists pg_net;
create extension if not exists supabase_vault;

-- ───────────────────────────────────────────────────────────────────
-- 1. Realtime
-- ───────────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['pedidos', 'pedido_items', 'lista_espera', 'mensajes'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────────
-- 2. Estado del pedido según sus ítems
--
-- El trigger es AFTER por fila, y Postgres corre esos triggers recién
-- cuando terminó la sentencia entera. Por eso, cuando un sector marca
-- sus tres ítems con un solo UPDATE, los tres disparos ya ven los tres
-- ítems listos: el primero pasa el pedido a «listo» y los otros dos no
-- encuentran nada que cambiar. La transición ocurre una sola vez, y con
-- ella el aviso al mozo.
--
-- Solo actúa sobre pedidos confirmados o en preparación: un pedido que
-- el mozo todavía no confirmó no puede aparecer como listo.
-- ───────────────────────────────────────────────────────────────────
create or replace function public.evaluar_pedido_listo()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pendientes integer;
  arrancados integer;
begin
  select count(*) filter (where estado <> 'listo'),
         count(*) filter (where estado <> 'pendiente')
    into pendientes, arrancados
    from public.pedido_items
   where pedido_id = new.pedido_id;

  if pendientes = 0 then
    update public.pedidos
       set estado = 'listo', listo_en = now()
     where id = new.pedido_id and estado in ('confirmado', 'en_preparacion');
  elsif arrancados > 0 then
    update public.pedidos
       set estado = 'en_preparacion'
     where id = new.pedido_id and estado = 'confirmado';
  end if;

  return new;
end $$;

-- ───────────────────────────────────────────────────────────────────
-- 3. Quién puede cambiar el estado de un ítem, y cómo
--
-- RLS decide QUÉ filas puede tocar cada uno; esto decide QUÉ CAMBIO
-- puede hacerles. Va en un trigger porque una política no puede
-- comparar el valor viejo con el nuevo.
--
-- - El cliente arma su pedido, pero el estado de preparación no es
--   suyo: sus ítems nacen pendientes y así se quedan. Si no, podría
--   mandar un ítem ya «listo» y saltearse la cocina.
-- - Cocina y bar solo cambian el estado, solo hacia adelante y solo con
--   el pedido confirmado o en preparación.
-- - La hora en que quedó listo la pone la base: el reloj de un teléfono
--   puede estar atrasado, y esa hora se le muestra al mozo y al cliente.
-- ───────────────────────────────────────────────────────────────────
create or replace function public.proteger_item_de_sector()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_perfil public.perfil_usuario := public.perfil_actual();
  v_estado_pedido public.estado_pedido;
  orden constant jsonb := '{"pendiente": 0, "en_preparacion": 1, "listo": 2}';
begin
  -- Sin perfil es una llamada de servicio (service_role, migraciones):
  -- no hay a quién restringir.
  if v_perfil is null then
    return new;
  end if;

  if v_perfil in ('cliente_registrado', 'cliente_anonimo') then
    if tg_op = 'INSERT' then
      new.estado := 'pendiente';
      new.listo_en := null;
    elsif new.estado is distinct from old.estado or new.listo_en is distinct from old.listo_en then
      raise exception 'El estado de preparación lo cambian cocina y bar.' using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.estado = 'listo' and old.estado <> 'listo' then
    new.listo_en := now();
  end if;

  if tg_op = 'INSERT' or v_perfil not in ('cocinero', 'cantinero') then
    return new;
  end if;

  if new.pedido_id is distinct from old.pedido_id
     or new.producto_id is distinct from old.producto_id
     or new.cantidad is distinct from old.cantidad
     or new.precio_unitario is distinct from old.precio_unitario
     or new.sector is distinct from old.sector then
    raise exception 'El sector solo puede cambiar el estado de sus ítems.'
      using errcode = '42501';
  end if;

  select estado into v_estado_pedido from public.pedidos where id = new.pedido_id;
  if v_estado_pedido is null or v_estado_pedido not in ('confirmado', 'en_preparacion') then
    raise exception 'El pedido no está en preparación.' using errcode = '42501';
  end if;

  if (orden ->> new.estado::text)::int < (orden ->> old.estado::text)::int then
    raise exception 'Un ítem no puede volver a un estado anterior.' using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists trg_proteger_item_de_sector on public.pedido_items;
create trigger trg_proteger_item_de_sector
  before insert or update on public.pedido_items
  for each row execute function public.proteger_item_de_sector();

-- ───────────────────────────────────────────────────────────────────
-- 4. Aviso al mozo cuando el pedido queda completo (punto 18)
--
-- La dirección de las funciones y la firma del webhook salen de Vault y
-- no de este archivo: el repositorio es público, y la firma es lo único
-- que impide que cualquiera dispare avisos desde afuera.
--
-- Sin esos dos secretos el aviso no se envía, y nada más: el pedido
-- igual queda listo. Es lo que pasa en una base local de pruebas, que
-- así nunca puede llamar a las funciones de producción.
--
-- `net.http_post` encola el pedido y vuelve enseguida; el envío ocurre
-- después de confirmar la transacción. Si la transacción se deshace, el
-- aviso se deshace con ella.
-- ───────────────────────────────────────────────────────────────────
create or replace function public.avisar_pedido_listo()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_firma text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'tumbo_url_funciones';
  select decrypted_secret into v_firma
    from vault.decrypted_secrets where name = 'tumbo_firma_webhook';

  if v_url is null or v_firma is null then
    raise notice 'Aviso de pedido listo sin enviar: faltan los secretos de Vault.';
    return null;
  end if;

  perform net.http_post(
    url := rtrim(v_url, '/') || '/avisar-push',
    body := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'pedidos',
      'record', jsonb_build_object('id', new.id, 'estado', new.estado::text)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-tumbo-firma', v_firma
    ),
    timeout_milliseconds := 5000
  );
  return null;
end $$;

drop trigger if exists trg_avisar_pedido_listo on public.pedidos;
create trigger trg_avisar_pedido_listo
  after update of estado on public.pedidos
  for each row
  when (old.estado is distinct from new.estado and new.estado = 'listo')
  execute function public.avisar_pedido_listo();

-- Son funciones de trigger: nadie tiene por qué llamarlas por la API.
revoke execute on function public.proteger_item_de_sector() from public, anon, authenticated;
revoke execute on function public.avisar_pedido_listo() from public, anon, authenticated;
