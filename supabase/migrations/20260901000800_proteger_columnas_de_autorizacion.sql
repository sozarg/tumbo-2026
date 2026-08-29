-- ═══════════════════════════════════════════════════════════════════
-- TUMBO · Cerrar la escalada de privilegios en public.usuarios
--
-- EL AGUJERO
-- La política usuarios_actualizar dice:
--
--   for update using (id = auth.uid() or public.es_gerencia())
--
-- Eso decide QUÉ FILAS se pueden tocar, pero PostgreSQL no permite
-- restringir QUÉ COLUMNAS con una política. Y como perfil_actual() lee
-- el perfil de esta misma tabla, un cliente registrado cualquiera podía
-- hacer, con la clave publishable que viaja en la aplicación:
--
--   update usuarios set perfil = 'dueno', estado = 'aprobado'
--    where id = auth.uid();
--
-- y quedaba de dueño. Está verificado contra una copia del esquema:
-- devolvía UPDATE 1 y la fila pasaba de cliente_registrado a dueno.
--
-- POR QUÉ UN TRIGGER Y NO UNA POLÍTICA
-- Se podría intentar con un `with check` que compare contra una
-- subconsulta a la propia tabla, pero esa subconsulta vuelve a pasar por
-- RLS y el resultado es frágil y difícil de leer. Un trigger BEFORE
-- UPDATE compara `old` contra `new` directamente, que es exactamente lo
-- que necesitamos, y falla con un mensaje entendible.
--
-- POR QUÉ SE DEJA PASAR CUANDO auth.uid() ES NULL
-- Ese es el caso del service_role y de las funciones security definer
-- del propio esquema, que saltean RLS a propósito: son las que usa
-- supabase/crear-usuarios.mjs para crear al personal ya aprobado. Un
-- atacante no puede llegar acá con uid nulo, porque la política de RLS
-- lo frenaría antes: sin uid, `id = auth.uid()` es falso.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.proteger_columnas_de_autorizacion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Sin sesión de usuario: es el servidor (service_role o una función
  -- security definer). RLS ya filtró a cualquier otro.
  if auth.uid() is null then
    return new;
  end if;

  -- Aprobar, rechazar y asignar perfiles es de gerencia (puntos 1, 7 y 8)
  if public.es_gerencia() then
    return new;
  end if;

  if new.perfil is distinct from old.perfil then
    raise exception 'No podés cambiar tu propio perfil.'
      using errcode = '42501',
            hint = 'El perfil lo asigna el dueño o el supervisor.';
  end if;

  if new.estado is distinct from old.estado then
    raise exception 'No podés cambiar tu propio estado de aprobación.'
      using errcode = '42501',
            hint = 'La aprobación y el rechazo son del dueño o el supervisor (puntos 7 y 8).';
  end if;

  if new.motivo_rechazo is distinct from old.motivo_rechazo then
    raise exception 'No podés cambiar el motivo de rechazo de tu cuenta.'
      using errcode = '42501';
  end if;

  return new;
end $$;

comment on function public.proteger_columnas_de_autorizacion() is
  'Impide que un usuario se cambie a sí mismo el perfil, el estado o el motivo de rechazo. RLS decide qué filas se tocan; esto decide qué columnas.';

create trigger trg_usuarios_proteger_autorizacion
  before update on public.usuarios
  for each row execute function public.proteger_columnas_de_autorizacion();
