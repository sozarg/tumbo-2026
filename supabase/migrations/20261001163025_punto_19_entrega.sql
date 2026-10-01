-- ═══════════════════════════════════════════════════════════════════
-- Punto 19: el mozo entrega el pedido y el cliente confirma que lo
-- recibió. Recién ahí se habilitan la encuesta y el pedido de la cuenta.
--
-- 1. `pedidos.recibido_en`. La aplicación ya la escribía, pero la columna
--    no existía: la confirmación del cliente fallaba contra la base real.
-- 2. Un pedido solo se entrega si está listo, y lo entrega el personal de
--    salón. La hora de entrega la pone la base.
-- 3. La recepción se confirma con `confirmar_recepcion`, y solo así. Es
--    una función y no un UPDATE porque RLS no deja al cliente tocar un
--    pedido ya entregado, y abrirle esa política le daría todas las
--    columnas.
-- 4. Encuesta y cuenta exigen un pedido recibido de la estadía propia.
-- ═══════════════════════════════════════════════════════════════════

alter table public.pedidos add column if not exists recibido_en timestamptz;

comment on column public.pedidos.recibido_en is
  'Cuándo el cliente confirmó que recibió el pedido (punto 19). Solo la escribe confirmar_recepcion().';

-- ───────────────────────────────────────────────────────────────────
-- Entrega y recepción
--
-- Las demás transiciones (confirmar, rechazar, pagar) no se tocan acá:
-- son de los puntos 12 a 14 y 21 a 22.
--
-- `recibido_en` solo cambia dentro de `confirmar_recepcion`, que lo
-- anuncia con una variable de la transacción. Así ni el cliente con un
-- borrador ni el personal pueden fingir una recepción.
-- ───────────────────────────────────────────────────────────────────
create or replace function public.proteger_estado_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_perfil public.perfil_usuario := public.perfil_actual();
begin
  if new.estado = 'entregado' and old.estado is distinct from 'entregado' then
    if old.estado <> 'listo' then
      raise exception 'Solo se puede entregar un pedido listo.' using errcode = '42501';
    end if;
    if v_perfil is not null and v_perfil not in ('mozo', 'dueno', 'supervisor') then
      raise exception 'El pedido lo entrega el mozo.' using errcode = '42501';
    end if;
    new.entregado_en := now();
  end if;

  if new.recibido_en is distinct from old.recibido_en
     and v_perfil is not null
     and current_setting('tumbo.recepcion', true) is distinct from new.id::text then
    raise exception 'La recepción la confirma el cliente desde su pedido.' using errcode = '42501';
  end if;

  return new;
end $$;

drop trigger if exists trg_proteger_estado_pedido on public.pedidos;
create trigger trg_proteger_estado_pedido
  before update on public.pedidos
  for each row execute function public.proteger_estado_pedido();

revoke execute on function public.proteger_estado_pedido() from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────
-- El cliente confirma que recibió su pedido
-- ───────────────────────────────────────────────────────────────────
create or replace function public.confirmar_recepcion(p_pedido_id uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  v_estado public.estado_pedido;
  v_recibido timestamptz;
begin
  select p.estado, p.recibido_en into v_estado, v_recibido
    from public.pedidos p
    join public.sesiones_mesa s on s.id = p.sesion_mesa_id
   where p.id = p_pedido_id and s.cliente_id = auth.uid();

  if not found then
    raise exception 'Ese pedido no es de tu mesa.' using errcode = '42501';
  end if;
  if v_recibido is not null then
    raise exception 'Ya confirmaste que recibiste este pedido.' using errcode = '42501';
  end if;
  if v_estado <> 'entregado' then
    raise exception 'El mozo todavía no entregó este pedido.' using errcode = '42501';
  end if;

  perform set_config('tumbo.recepcion', p_pedido_id::text, true);
  update public.pedidos set recibido_en = now()
   where id = p_pedido_id
  returning recibido_en into v_recibido;
  perform set_config('tumbo.recepcion', '', true);

  return v_recibido;
end $$;

revoke execute on function public.confirmar_recepcion(uuid) from public, anon;
grant execute on function public.confirmar_recepcion(uuid) to authenticated;

-- ───────────────────────────────────────────────────────────────────
-- Encuesta y cuenta, después de la recepción
--
-- La función mira la estadía Y su dueño: además de exigir la recepción,
-- cierra que alguien respondiera la encuesta de una estadía ajena, cosa
-- que la política anterior no revisaba.
-- ───────────────────────────────────────────────────────────────────
create or replace function public.estadia_con_pedido_recibido(p_sesion uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.pedidos p
      join public.sesiones_mesa s on s.id = p.sesion_mesa_id
     where s.id = p_sesion
       and s.cliente_id = auth.uid()
       and p.recibido_en is not null
  )
$$;

revoke execute on function public.estadia_con_pedido_recibido(uuid) from public, anon;
grant execute on function public.estadia_con_pedido_recibido(uuid) to authenticated;

drop policy if exists encuestas_crear on public.encuestas;
create policy encuestas_crear on public.encuestas
  for insert with check (
    cliente_id = auth.uid()
    and public.perfil_actual() <> 'cliente_anonimo'
    and public.esta_habilitado()
    and public.estadia_con_pedido_recibido(sesion_mesa_id)
  );

drop policy if exists cuentas_cliente_solicita on public.cuentas;
create policy cuentas_cliente_solicita on public.cuentas
  for insert with check (
    exists (
      select 1 from public.sesiones_mesa s
       where s.id = cuentas.sesion_mesa_id and s.cliente_id = auth.uid()
    )
    and public.estadia_con_pedido_recibido(sesion_mesa_id)
  );
