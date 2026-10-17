-- ═══════════════════════════════════════════════════════════════════
-- EL ALTA TIENE QUE DECIR QUÉ DATO ESTÁ REPETIDO (punto 5)
--
-- EL PROBLEMA
--
-- La cuenta de Auth y la fila de `usuarios` se crean en la MISMA
-- transacción: el trigger `manejar_usuario_nuevo` inserta el perfil
-- apenas nace el usuario. Si esa inserción falla —DNI repetido, correo
-- repetido, un nombre que no pasa el formato—, Auth no reenvía el
-- error de Postgres: contesta siempre lo mismo, «Database error saving
-- new user».
--
-- Del lado de la aplicación eso se veía como «No se pudo crear la
-- cuenta. Revisá los datos y la conexión», que manda a mirar el wifi
-- cuando el problema es que ese DNI ya está usado. Se puede probar con
-- diez correos distintos y seguir fallando, porque el que choca es el
-- documento.
--
-- LA SALIDA
--
-- Preguntar ANTES de crear nada. Esta función contesta con una sola
-- palabra cuál de los dos datos está tomado, y la pantalla del alta lo
-- muestra en el campo que corresponde.
--
-- SOBRE QUÉ INFORMACIÓN ENTREGA
--
-- Contesta 'correo' o 'dni' y nada más: ni nombre, ni id, ni de quién
-- es la cuenta. Del correo la aplicación ya avisaba lo mismo por otro
-- camino —`signUp` devuelve un usuario sin identidades cuando la
-- dirección ya existe—, así que no agrega nada nuevo. El DNI sí es un
-- dato más sensible, y por eso la respuesta no permite enumerar: hay
-- que traer el documento completo y bien escrito para que conteste.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.alta_cliente_disponible(
  p_correo text,
  p_dni text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correo text := lower(trim(coalesce(p_correo, '')));
  v_dni text := regexp_replace(coalesce(p_dni, ''), '\D', '', 'g');
begin
  if v_correo <> '' and exists (
    select 1 from public.usuarios where lower(correo) = v_correo
  ) then
    return 'correo';
  end if;

  -- El formato lo valida el alta; acá solo interesa si está tomado.
  if v_dni ~ '^[0-9]{7,8}$' and exists (
    select 1 from public.usuarios where dni = v_dni
  ) then
    return 'dni';
  end if;

  return 'ok';
end $$;

comment on function public.alta_cliente_disponible(text, text) is
  'Dice si el correo o el DNI de un alta de cliente ya están tomados, para poder avisarlo en el campo correcto antes de crear la cuenta.';

revoke execute on function public.alta_cliente_disponible(text, text) from public;
-- `anon` también: el cliente se registra sin sesión (punto 5, dispositivo 2).
grant execute on function public.alta_cliente_disponible(text, text) to anon, authenticated;
