-- ═══════════════════════════════════════════════════════════════════
-- Puntos 20, 21 y 22: encuesta, cuenta y liberación de la mesa.
--
-- 1. Al confirmar el pago se cierra todo lo de la estadía: la mesa, los
--    pedidos y la entrada de la lista de espera.
-- 2. La cuenta se pide, se genera con el QR de propina, se paga y se
--    confirma SOLO con funciones. Antes `cuentas_actualizar` dejaba al
--    cliente cambiar cualquier columna de su cuenta, incluso marcarla
--    como confirmada y liberar la mesa sin que el mozo cobrara.
-- 3. La encuesta se responde con una función que valida cada respuesta
--    según el tipo de pregunta, y los gráficos leen los resultados ya
--    agregados.
-- 4. Avisos push al pedir la cuenta, al pagar y al confirmar el pago.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- Realtime: el mozo tiene que ver una cuenta pedida o pagada sin recargar.
-- ───────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cuentas'
  ) then
    alter publication supabase_realtime add table public.cuentas;
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────
-- 1. Liberación completa de la mesa (punto 22)
--
-- El orden importa: primero se cierra la estadía y recién después se
-- libera la mesa, porque `proteger_disponibilidad` no deja liberar una
-- mesa que todavía tiene una estadía activa.
-- ───────────────────────────────────────────────────────────────────
create or replace function public.liberar_mesa_al_confirmar()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_sesion public.sesiones_mesa;
begin
  if new.estado = 'confirmada' and old.estado <> 'confirmada' then
    update public.sesiones_mesa
       set estado = 'cerrada', cerrada_en = now()
     where id = new.sesion_mesa_id
    returning * into v_sesion;

    update public.mesas set estado = 'libre' where id = v_sesion.mesa_id;

    update public.pedidos
       set estado = 'pagado'
     where sesion_mesa_id = new.sesion_mesa_id
       and estado in ('confirmado', 'en_preparacion', 'listo', 'entregado');

    -- Sin la mesa: `mesa_solo_si_asignado` solo admite mesa en una
    -- entrada asignada. Qué mesa ocupó queda en la estadía.
    update public.lista_espera
       set estado = 'finalizado', mesa_id = null
     where cliente_id = v_sesion.cliente_id
       and mesa_id = v_sesion.mesa_id
       and estado = 'asignado';
  end if;
  return new;
end $$;

-- ───────────────────────────────────────────────────────────────────
-- 2. La cuenta (punto 21) y su confirmación (punto 22)
-- ───────────────────────────────────────────────────────────────────

-- La estadía en curso de quien llama, si tiene una.
create or replace function public.mi_estadia_en_curso()
returns public.sesiones_mesa language sql stable security definer set search_path = public as $$
  select * from public.sesiones_mesa
   where cliente_id = auth.uid()
     and estado in ('activa', 'cuenta_solicitada', 'pagada')
   order by abierta_en desc
   limit 1
$$;

-- El cliente pide la cuenta. Si ya la había pedido, se devuelve la misma.
create or replace function public.solicitar_cuenta()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_sesion public.sesiones_mesa := public.mi_estadia_en_curso();
  v_cuenta uuid;
begin
  if v_sesion.id is null then
    raise exception 'No tenés una mesa en curso.' using errcode = '42501';
  end if;

  select id into v_cuenta from public.cuentas where sesion_mesa_id = v_sesion.id;
  if found then
    return v_cuenta;
  end if;

  if not public.estadia_con_pedido_recibido(v_sesion.id) then
    raise exception 'Confirmá que recibiste tu pedido para pedir la cuenta.' using errcode = '42501';
  end if;

  insert into public.cuentas (sesion_mesa_id, estado, solicitada_en)
  values (v_sesion.id, 'pendiente', now())
  returning id into v_cuenta;

  update public.sesiones_mesa set estado = 'cuenta_solicitada'
   where id = v_sesion.id and estado = 'activa';

  return v_cuenta;
end $$;

-- Con el QR de propina se arma el detalle. Los montos los calcula la
-- base: el cliente solo elige la propina leyendo el QR.
create or replace function public.generar_cuenta(p_qr text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_sesion public.sesiones_mesa := public.mi_estadia_en_curso();
  v_cuenta public.cuentas;
  v_nivel public.niveles_propina;
  v_calculo record;
  v_propina numeric;
begin
  if v_sesion.id is null then
    raise exception 'No tenés una mesa en curso.' using errcode = '42501';
  end if;

  select * into v_cuenta from public.cuentas where sesion_mesa_id = v_sesion.id;
  if not found then
    raise exception 'Primero pedí la cuenta.' using errcode = '42501';
  end if;
  if v_cuenta.estado <> 'pendiente' then
    raise exception 'La cuenta ya fue pagada.' using errcode = '42501';
  end if;

  select * into v_nivel from public.niveles_propina
   where qr_token = regexp_replace(btrim(coalesce(p_qr, '')), '^tumbo://propina/', '', 'i');
  if not found then
    raise exception 'Ese código no es un QR de propina.' using errcode = '22023';
  end if;

  select * into v_calculo from public.calcular_cuenta(v_sesion.id);
  v_propina := round(v_calculo.base * v_nivel.porcentaje / 100, 2);

  update public.cuentas
     set subtotal = v_calculo.subtotal,
         descuento_pct = v_calculo.descuento_pct,
         descuento_monto = v_calculo.descuento_monto,
         nivel_propina = v_nivel.nivel,
         propina_pct = v_nivel.porcentaje,
         propina_monto = v_propina,
         total = v_calculo.base + v_propina
   where id = v_cuenta.id;

  return v_cuenta.id;
end $$;

-- El cliente paga (simulado) y queda esperando al mozo.
create or replace function public.pagar_cuenta()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_sesion public.sesiones_mesa := public.mi_estadia_en_curso();
  v_cuenta public.cuentas;
begin
  if v_sesion.id is null then
    raise exception 'No tenés una mesa en curso.' using errcode = '42501';
  end if;

  select * into v_cuenta from public.cuentas where sesion_mesa_id = v_sesion.id;
  if not found then
    raise exception 'Primero pedí la cuenta.' using errcode = '42501';
  end if;
  if v_cuenta.estado <> 'pendiente' then
    raise exception 'La cuenta ya fue pagada.' using errcode = '42501';
  end if;
  if v_cuenta.nivel_propina is null then
    raise exception 'Escaneá un QR de propina antes de pagar.' using errcode = '42501';
  end if;

  update public.cuentas set estado = 'pagada', pagada_en = now() where id = v_cuenta.id;
  update public.sesiones_mesa set estado = 'pagada' where id = v_sesion.id;

  return v_cuenta.id;
end $$;

-- El mozo confirma el pago de UNA cuenta concreta. El trigger de
-- liberación hace el resto.
create or replace function public.confirmar_pago(p_cuenta uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_estado public.estado_cuenta;
begin
  if public.perfil_actual() is null
     or public.perfil_actual() not in ('mozo', 'dueno', 'supervisor') then
    raise exception 'El pago lo confirma el mozo.' using errcode = '42501';
  end if;

  select estado into v_estado from public.cuentas where id = p_cuenta for update;
  if not found then
    raise exception 'La cuenta no existe.' using errcode = '42501';
  end if;
  if v_estado <> 'pagada' then
    raise exception 'Esa cuenta todavía no fue pagada.' using errcode = '42501';
  end if;

  update public.cuentas
     set estado = 'confirmada', confirmada_en = now(), mozo_id = auth.uid()
   where id = p_cuenta;

  return p_cuenta;
end $$;

-- Nadie escribe la cuenta de forma directa: todo pasa por las funciones.
drop policy if exists cuentas_cliente_solicita on public.cuentas;
drop policy if exists cuentas_actualizar on public.cuentas;

-- ───────────────────────────────────────────────────────────────────
-- 3. Encuesta (punto 20)
-- ───────────────────────────────────────────────────────────────────

-- Las respuestas llegan como {"<id de pregunta>": valor}. Cada valor se
-- valida según el tipo de su pregunta, igual que en la pantalla.
create or replace function public.responder_encuesta(p_respuestas jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_sesion public.sesiones_mesa := public.mi_estadia_en_curso();
  v_pregunta public.preguntas_encuesta;
  v_valor jsonb;
  v_vacio boolean;
  v_numero numeric;
  v_encuesta uuid;
begin
  if public.perfil_actual() is distinct from 'cliente_registrado' or not public.esta_habilitado() then
    raise exception 'La encuesta la responden los clientes registrados.' using errcode = '42501';
  end if;
  if v_sesion.id is null then
    raise exception 'No tenés una mesa en curso.' using errcode = '42501';
  end if;
  if not public.estadia_con_pedido_recibido(v_sesion.id) then
    raise exception 'Confirmá que recibiste tu pedido para responder la encuesta.' using errcode = '42501';
  end if;
  if exists (select 1 from public.encuestas where sesion_mesa_id = v_sesion.id) then
    raise exception 'Ya respondiste la encuesta de esta estadía.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_respuestas) is distinct from 'object' then
    raise exception 'La encuesta llegó vacía.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_respuestas) k
     where not exists (select 1 from public.preguntas_encuesta p where p.id::text = k and p.activa)
  ) then
    raise exception 'La encuesta tiene una pregunta que no existe.' using errcode = '22023';
  end if;

  for v_pregunta in select * from public.preguntas_encuesta where activa order by orden loop
    v_valor := p_respuestas -> v_pregunta.id::text;
    v_vacio := v_valor is null
      or jsonb_typeof(v_valor) = 'null'
      or (jsonb_typeof(v_valor) = 'string' and btrim(v_valor #>> '{}') = '')
      or (jsonb_typeof(v_valor) = 'array' and jsonb_array_length(v_valor) = 0);

    if v_vacio then
      if v_pregunta.requerida then
        raise exception 'Falta responder: %', v_pregunta.texto using errcode = '22023';
      end if;
      continue;
    end if;

    if v_pregunta.tipo in ('estrellas', 'rango') then
      if jsonb_typeof(v_valor) <> 'number' then
        raise exception 'Respuesta inválida en: %', v_pregunta.texto using errcode = '22023';
      end if;
      v_numero := (v_valor #>> '{}')::numeric;
      if v_numero <> trunc(v_numero)
         or v_numero < coalesce(v_pregunta.minimo, 1)
         or v_numero > coalesce(v_pregunta.maximo, case when v_pregunta.tipo = 'estrellas' then 5 else 10 end) then
        raise exception 'Respuesta fuera de rango en: %', v_pregunta.texto using errcode = '22023';
      end if;
    elsif v_pregunta.tipo in ('radio', 'select') then
      if jsonb_typeof(v_valor) <> 'string' or not (v_pregunta.opciones ? (v_valor #>> '{}')) then
        raise exception 'Elegí una opción válida en: %', v_pregunta.texto using errcode = '22023';
      end if;
    elsif v_pregunta.tipo = 'checkbox' then
      if jsonb_typeof(v_valor) <> 'array'
         or exists (
           select 1 from jsonb_array_elements(v_valor) e
            where jsonb_typeof(e) <> 'string' or not (v_pregunta.opciones ? (e #>> '{}'))
         )
         or (select count(distinct e) from jsonb_array_elements(v_valor) e) <> jsonb_array_length(v_valor) then
        raise exception 'Elegí opciones válidas en: %', v_pregunta.texto using errcode = '22023';
      end if;
    elsif v_pregunta.tipo = 'interruptor' then
      if jsonb_typeof(v_valor) <> 'boolean' then
        raise exception 'Respuesta inválida en: %', v_pregunta.texto using errcode = '22023';
      end if;
    elsif v_pregunta.tipo = 'texto_largo' then
      if jsonb_typeof(v_valor) <> 'string' or char_length(v_valor #>> '{}') > 500 then
        raise exception 'El texto de «%» puede tener hasta 500 caracteres.', v_pregunta.texto using errcode = '22023';
      end if;
    end if;
  end loop;

  insert into public.encuestas (sesion_mesa_id, cliente_id)
  values (v_sesion.id, auth.uid())
  returning id into v_encuesta;

  insert into public.respuestas_encuesta (encuesta_id, pregunta_id, valor)
  select v_encuesta, p.id, p_respuestas -> p.id::text
    from public.preguntas_encuesta p
   where p.activa
     and p_respuestas ? p.id::text
     and jsonb_typeof(p_respuestas -> p.id::text) <> 'null'
     and not (jsonb_typeof(p_respuestas -> p.id::text) = 'string'
              and btrim(p_respuestas ->> p.id::text) = '')
     and not (jsonb_typeof(p_respuestas -> p.id::text) = 'array'
              and jsonb_array_length(p_respuestas -> p.id::text) = 0);

  return v_encuesta;
end $$;

drop policy if exists encuestas_crear on public.encuestas;
drop policy if exists respuestas_crear on public.respuestas_encuesta;

-- Si la estadía en curso ya tiene encuesta.
create or replace function public.encuesta_respondida()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.encuestas e
     where e.sesion_mesa_id = (public.mi_estadia_en_curso()).id
  )
$$;

-- Los resultados ya agregados para los tres gráficos. Se elige la primera
-- pregunta activa de cada tipo: radio para la torta, checkbox para las
-- barras y estrellas para la línea semanal de las últimas cuatro semanas.
create or replace function public.resultados_encuesta()
returns jsonb language sql stable security definer set search_path = public as $$
  with
  torta as (
    select * from public.preguntas_encuesta where activa and tipo = 'radio' order by orden limit 1
  ),
  barras as (
    select * from public.preguntas_encuesta where activa and tipo = 'checkbox' order by orden limit 1
  ),
  linea as (
    select * from public.preguntas_encuesta where activa and tipo = 'estrellas' order by orden limit 1
  )
  select jsonb_build_object(
    'total', (select count(*) from public.encuestas),
    'torta', (
      select jsonb_build_object(
        'pregunta', t.texto,
        'datos', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'etiqueta', o.opcion,
                   'cantidad', (select count(*) from public.respuestas_encuesta r
                                 where r.pregunta_id = t.id and r.valor #>> '{}' = o.opcion))
                 order by o.orden)
            from jsonb_array_elements_text(t.opciones) with ordinality as o(opcion, orden)
        ), '[]'::jsonb)
      ) from torta t
    ),
    'barras', (
      select jsonb_build_object(
        'pregunta', b.texto,
        'datos', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'etiqueta', o.opcion,
                   'cantidad', (select count(*) from public.respuestas_encuesta r
                                 where r.pregunta_id = b.id and r.valor ? o.opcion))
                 order by o.orden)
            from jsonb_array_elements_text(b.opciones) with ordinality as o(opcion, orden)
        ), '[]'::jsonb)
      ) from barras b
    ),
    'linea', (
      select jsonb_build_object(
        'pregunta', l.texto,
        'datos', (
          select jsonb_agg(jsonb_build_object(
                   'etiqueta', 'Semana ' || s.semana,
                   'promedio', (
                     select round(avg((r.valor #>> '{}')::numeric), 2)
                       from public.respuestas_encuesta r
                       join public.encuestas e on e.id = r.encuesta_id
                      where r.pregunta_id = l.id
                        and e.creado_en >= now() - make_interval(days => (5 - s.semana) * 7)
                        and e.creado_en < now() - make_interval(days => (4 - s.semana) * 7)
                   ))
                 order by s.semana)
            from generate_series(1, 4) as s(semana)
        )
      ) from linea l
    )
  )
$$;

-- ───────────────────────────────────────────────────────────────────
-- 4. Avisos push (puntos 21 y 22)
--
-- Un solo lugar encola los avisos, con la dirección y la firma de Vault
-- (ver la migración de los puntos 16 a 18). Sin esos secretos no se
-- envía nada, así que una base local nunca llama a producción.
-- ───────────────────────────────────────────────────────────────────
create or replace function public.encolar_aviso(p_cuerpo jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_firma text;
begin
  -- La carga del historial (seed_data/historico.sql) apaga los avisos
  -- para su transacción: son estadías de hace semanas y no tiene sentido
  -- que a los mozos les lleguen cien push de cuentas viejas.
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
    url := rtrim(v_url, '/') || '/avisar-push',
    body := p_cuerpo,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-tumbo-firma', v_firma),
    timeout_milliseconds := 5000
  );
end $$;

create or replace function public.avisar_pedido_listo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.encolar_aviso(jsonb_build_object(
    'type', 'UPDATE',
    'table', 'pedidos',
    'record', jsonb_build_object('id', new.id, 'estado', new.estado::text)
  ));
  return null;
end $$;

create or replace function public.avisar_cuenta()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT'
     or (new.estado is distinct from old.estado and new.estado in ('pagada', 'confirmada')) then
    perform public.encolar_aviso(jsonb_build_object(
      'type', tg_op,
      'table', 'cuentas',
      'record', jsonb_build_object('id', new.id, 'estado', new.estado::text)
    ));
  end if;
  return null;
end $$;

drop trigger if exists trg_avisar_cuenta on public.cuentas;
create trigger trg_avisar_cuenta
  after insert or update of estado on public.cuentas
  for each row execute function public.avisar_cuenta();

-- ───────────────────────────────────────────────────────────────────
-- Permisos
-- ───────────────────────────────────────────────────────────────────
revoke execute on function public.liberar_mesa_al_confirmar() from public, anon, authenticated;
revoke execute on function public.encolar_aviso(jsonb) from public, anon, authenticated;
revoke execute on function public.avisar_pedido_listo() from public, anon, authenticated;
revoke execute on function public.avisar_cuenta() from public, anon, authenticated;
revoke execute on function public.mi_estadia_en_curso() from public, anon, authenticated;

revoke execute on function public.solicitar_cuenta() from public, anon;
revoke execute on function public.generar_cuenta(text) from public, anon;
revoke execute on function public.pagar_cuenta() from public, anon;
revoke execute on function public.confirmar_pago(uuid) from public, anon;
revoke execute on function public.responder_encuesta(jsonb) from public, anon;
revoke execute on function public.encuesta_respondida() from public, anon;
revoke execute on function public.resultados_encuesta() from public, anon;

grant execute on function public.solicitar_cuenta() to authenticated;
grant execute on function public.generar_cuenta(text) to authenticated;
grant execute on function public.pagar_cuenta() to authenticated;
grant execute on function public.confirmar_pago(uuid) to authenticated;
grant execute on function public.responder_encuesta(jsonb) to authenticated;
grant execute on function public.encuesta_respondida() to authenticated;
grant execute on function public.resultados_encuesta() to authenticated;
