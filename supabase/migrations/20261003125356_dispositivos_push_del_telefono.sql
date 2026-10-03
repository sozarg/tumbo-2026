-- ═══════════════════════════════════════════════════════════════════
-- Los teléfonos que reciben notificaciones
--
-- 1. LA TABLA ENTRA AL REPOSITORIO. `dispositivos_push` y el tipo
--    `plataforma_push` se habían creado a mano en el editor SQL, así
--    que existían solo en la base de producción. Una base levantada
--    desde cero —la de un compañero en local, o una recreada— no los
--    tenía, y como la aplicación no falla cuando no puede registrar el
--    teléfono, el síntoma habría sido que las notificaciones no llegan
--    nunca y nada lo explica. Todo lo de acá es idempotente: en
--    producción, donde ya existen, no toca nada.
--
-- 2. EL TOKEN ES DEL TELÉFONO, NO DE LA PERSONA. Esa es la corrección
--    de fondo. La política `dispositivos_propios` deja que cada uno
--    toque solo sus filas, que para los datos de alguien está bien.
--    Pero el token lo da Firebase por aparato: no le pertenece a quien
--    lo registró primero. Con la política sola pasaba esto:
--
--      · el dueño entra en un teléfono y queda la fila a su nombre;
--      · cierra sesión, y el borrado no alcanza ninguna fila porque
--        para entonces `auth.uid()` ya es nulo;
--      · entra el metre en ese mismo teléfono, y su intento de tomar
--        el token choca contra la política, porque la fila es de otro.
--
--    Resultado: el primero que entraba en un teléfono se lo quedaba
--    para siempre, y los avisos del metre seguían llegándole al dueño.
--    Se diagnosticó con la respuesta de `avisar-push`, que decía «los
--    destinatarios no tienen dispositivos registrados» mientras la
--    tabla tenía tres filas, las tres de la misma persona.
--
--    `registrar_dispositivo` corre con permisos propios y hace lo
--    único que tiene sentido: suelta el token de quien lo tuviera y se
--    lo da a quien está iniciando sesión ahora.
-- ═══════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plataforma_push') then
    create type public.plataforma_push as enum ('android', 'ios', 'web');
  end if;
end $$;

create table if not exists public.dispositivos_push (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references public.usuarios(id) on delete cascade,
  token           text not null unique,
  plataforma      plataforma_push not null default 'android',
  actualizado_en  timestamptz not null default now(),

  -- Un token de Firebase ronda los 160 caracteres. El rango es amplio
  -- a propósito —Google no promete un largo— pero ataja el texto vacío
  -- y cualquier cosa desmedida.
  constraint largo_token check (char_length(token) between 20 and 512)
);

create index if not exists idx_dispositivos_usuario
  on public.dispositivos_push(usuario_id);

alter table public.dispositivos_push enable row level security;

-- Cada uno ve y borra los teléfonos propios. Tomar un token que está a
-- nombre de otro no pasa por acá: pasa por `registrar_dispositivo`.
drop policy if exists dispositivos_propios on public.dispositivos_push;
create policy dispositivos_propios on public.dispositivos_push
  for all using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- ───────────────────────────────────────────────────────────────────
-- Tomar el teléfono
--
-- `security definer` porque el primer paso es borrar una fila que es
-- de otra persona, y eso la política —con razón— no lo permite. El
-- permiso extra está acotado a lo mínimo: no recibe a quién asignarle
-- el token, lo toma de `auth.uid()`, así que nadie puede registrar un
-- teléfono a nombre de un tercero.
-- ───────────────────────────────────────────────────────────────────
create or replace function public.registrar_dispositivo(
  p_token      text,
  p_plataforma public.plataforma_push default 'android'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
begin
  if v_usuario is null then
    raise exception 'Hay que tener la sesión abierta para registrar el teléfono.'
      using errcode = '42501';
  end if;

  if not public.esta_habilitado() then
    raise exception 'La cuenta todavía no está habilitada.' using errcode = '42501';
  end if;

  if p_token is null or char_length(p_token) not between 20 and 512 then
    raise exception 'El token del teléfono no tiene un largo válido.'
      using errcode = '22023';
  end if;

  -- El teléfono cambia de manos: lo suelta quien lo tuviera.
  delete from public.dispositivos_push where token = p_token;

  insert into public.dispositivos_push (usuario_id, token, plataforma)
  values (v_usuario, p_token, p_plataforma);
end $$;

comment on function public.registrar_dispositivo(text, public.plataforma_push) is
  'Asigna el token de un teléfono a quien tiene la sesión abierta, soltándolo de su dueño anterior.';

revoke execute on function public.registrar_dispositivo(text, public.plataforma_push)
  from public, anon;
grant execute on function public.registrar_dispositivo(text, public.plataforma_push)
  to authenticated;
