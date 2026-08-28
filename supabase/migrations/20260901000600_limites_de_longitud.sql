-- ═══════════════════════════════════════════════════════════════════
-- TUMBO · Límites de longitud y formato en los campos de texto
--
-- POR QUÉ EXISTE ESTA MIGRACIÓN
-- El TFI pide validación en todos los campos de todos los formularios,
-- y el CONTEXTO-PROYECTO.md (R15) fija los rangos. Las migraciones
-- anteriores dejaron todas las columnas como `text` sin tope, así que
-- cualquiera podía mandar un nombre de 10.000 caracteres por PostgREST
-- salteando el formulario. Esto lo cierra del lado de la base, que es
-- el único lugar donde no se puede evitar.
--
-- Los mismos límites están replicados en los formularios de Angular.
-- La base es la última línea de defensa, no la primera: el usuario
-- tiene que ver el error en pantalla, no un 400 del servidor.
--
-- NO se usa varchar(n) a propósito. Cambiar el tipo de una columna
-- reescribe la tabla y bloquea; un CHECK se agrega sin reescribir y se
-- puede ajustar después sin tocar el tipo.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- USUARIOS
-- ───────────────────────────────────────────────────────────────────

-- R15: nombres y apellidos, 2 a 50 caracteres.
-- Se permiten letras con tildes y ñ, espacios, apóstrofos y guiones:
-- "D'Angelo" y "García-López" son apellidos reales y el TFI no los
-- excluye. Números y símbolos, no.
alter table public.usuarios
  add constraint largo_nombres check (
    char_length(trim(nombres)) between 2 and 50
  ),
  add constraint formato_nombres check (
    nombres ~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ ''-]*$'
  ),
  add constraint largo_apellidos check (
    apellidos is null or char_length(trim(apellidos)) between 2 and 50
  ),
  add constraint formato_apellidos check (
    apellidos is null or
    apellidos ~ '^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ ''-]*$'
  ),
  -- 254 es el máximo real de una dirección de correo (RFC 5321)
  add constraint largo_correo check (
    correo is null or char_length(correo) <= 254
  ),
  -- El motivo de rechazo lo lee el cliente en el correo del punto 8:
  -- tiene que decir algo, y no puede ser un ensayo
  add constraint largo_motivo_rechazo check (
    motivo_rechazo is null or char_length(trim(motivo_rechazo)) between 5 and 300
  ),
  add constraint largo_foto_url check (
    foto_url is null or char_length(foto_url) <= 500
  );

-- ───────────────────────────────────────────────────────────────────
-- DISPOSITIVOS PUSH
-- Un token de FCM ronda los 163 caracteres, pero Google avisó que puede
-- crecer. 512 deja margen sin dejarlo abierto.
-- ───────────────────────────────────────────────────────────────────
alter table public.dispositivos_push
  add constraint largo_token check (char_length(token) between 20 and 512);

-- ───────────────────────────────────────────────────────────────────
-- MESAS
-- ───────────────────────────────────────────────────────────────────
alter table public.mesas
  add constraint largo_qr_token check (char_length(qr_token) between 1 and 100),
  add constraint largo_foto_url check (
    foto_url is null or char_length(foto_url) <= 500
  );

-- ───────────────────────────────────────────────────────────────────
-- PRODUCTOS
-- El nombre y la descripción se muestran en la carta: si son muy
-- largos rompen el diseño en pantalla de celular.
-- ───────────────────────────────────────────────────────────────────
alter table public.productos
  add constraint largo_nombre check (
    char_length(trim(nombre)) between 2 and 60
  ),
  add constraint largo_descripcion check (
    char_length(trim(descripcion)) between 10 and 300
  );

alter table public.producto_fotos
  add constraint largo_url check (char_length(url) between 1 and 500);

-- ───────────────────────────────────────────────────────────────────
-- NIVELES DE PROPINA
-- ───────────────────────────────────────────────────────────────────
alter table public.niveles_propina
  add constraint largo_etiqueta check (
    char_length(trim(etiqueta)) between 2 and 40
  ),
  add constraint largo_qr_token check (char_length(qr_token) between 1 and 100);

-- ───────────────────────────────────────────────────────────────────
-- JUEGOS
-- ───────────────────────────────────────────────────────────────────
alter table public.juegos
  add constraint largo_nombre check (
    char_length(trim(nombre)) between 2 and 60
  ),
  add constraint largo_descripcion check (
    char_length(trim(descripcion)) between 10 and 300
  );

-- ───────────────────────────────────────────────────────────────────
-- PREGUNTAS DE ENCUESTA
-- ───────────────────────────────────────────────────────────────────
alter table public.preguntas_encuesta
  add constraint largo_texto check (
    char_length(trim(texto)) between 5 and 200
  );

-- ───────────────────────────────────────────────────────────────────
-- PEDIDOS · el motivo viaja al cliente igual que el de usuarios
-- ───────────────────────────────────────────────────────────────────
alter table public.pedidos
  add constraint largo_motivo_rechazo check (
    motivo_rechazo is null or char_length(trim(motivo_rechazo)) between 5 and 300
  );

-- ───────────────────────────────────────────────────────────────────
-- MENSAJES (punto 11)
-- El chequeo de "no vacío" ya estaba; acá se le pone el techo.
-- 500 alcanza para un mensaje de sala y evita que alguien pegue un
-- libro en el chat.
-- ───────────────────────────────────────────────────────────────────
alter table public.mensajes
  add constraint largo_cuerpo check (char_length(trim(cuerpo)) <= 500);

-- ───────────────────────────────────────────────────────────────────
-- BITÁCORAS
-- El título y el cuerpo van a la notificación push: Android recorta
-- alrededor de los 65 y 240 caracteres, así que estos topes son
-- generosos y solo frenan lo absurdo.
-- ───────────────────────────────────────────────────────────────────
alter table public.notificaciones
  add constraint largo_titulo check (char_length(trim(titulo)) between 1 and 120),
  add constraint largo_cuerpo check (char_length(trim(cuerpo)) between 1 and 500);

-- ───────────────────────────────────────────────────────────────────
-- CORREOS ENVIADOS
-- ───────────────────────────────────────────────────────────────────
alter table public.correos_enviados
  add constraint largo_destinatario check (char_length(destinatario) between 3 and 254),
  add constraint largo_plantilla check (char_length(plantilla) between 1 and 60),
  add constraint largo_asunto check (char_length(asunto) between 1 and 200),
  add constraint largo_estado check (char_length(estado) between 1 and 20),
  add constraint largo_proveedor_id check (
    proveedor_id is null or char_length(proveedor_id) <= 120
  );

-- ═══════════════════════════════════════════════════════════════════
-- AJUSTE DEL TRIGGER DE ALTA
--
-- POR QUÉ HACE FALTA
-- manejar_usuario_nuevo() completaba el nombre, cuando no venía en el
-- metadata, con la parte del correo anterior a la arroba. Con las
-- reglas de arriba eso pasó a ser una bomba: un correo como
-- "m.ferrari@bna.com.ar" produce el nombre "m.ferrari", que tiene un
-- punto y por lo tanto NO pasa formato_nombres. El alta fallaría con un
-- error de constraint incomprensible en vez de un mensaje claro.
--
-- La función ya exigía apellidos y DNI con un mensaje entendible.
-- Ahora exige también el nombre, que es lo coherente, y el respaldo por
-- correo queda solo para el cliente anónimo (punto 9), donde da
-- 'invitado' y ese sí pasa las validaciones.
--
-- El resto del cuerpo es idéntico al de la migración de funciones.
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.manejar_usuario_nuevo()
returns trigger language plpgsql security definer set search_path = public as $$
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
       nullif(v_datos->>'nombres','')   is null
    or nullif(v_datos->>'apellidos','') is null
    or nullif(v_datos->>'dni','')       is null
  ) then
    raise exception using
      message = 'Falta completar los datos del perfil para crear la cuenta.',
      detail  = 'Se esperaban al menos nombres, apellidos y dni dentro de user_metadata.',
      hint    = 'Creá los usuarios desde la aplicación o con supabase/crear-usuarios.mjs, no desde el panel de Supabase.';
  end if;

  insert into public.usuarios (
    id, nombres, apellidos, dni, cuil, correo, perfil, estado, foto_url
  ) values (
    new.id,
    coalesce(nullif(v_datos->>'nombres',''), 'Invitado'),
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
