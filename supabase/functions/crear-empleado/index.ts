/**
 * Alta de empleados (punto 1 del TFI).
 *
 * ─────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTO NO PUEDE VIVIR EN EL NAVEGADOR
 *
 * Crear una cuenta en `auth.users` con su contraseña requiere la clave
 * `service_role`. Esa clave puede TODO: leer cualquier tabla, saltear
 * RLS, borrar la base. Si viajara dentro del APK, cualquiera que lo
 * descomprima la tiene.
 *
 * Por eso `OperacionService.registrarEmpleado` era un mock explícito:
 *
 *     // La creación de auth.users requiere service_role, que nunca se
 *     // expone al navegador. Hasta contar con una Edge Function, las
 *     // altas siguen siendo explícitamente mock.
 *
 * Esta es esa Edge Function. Corre en el servidor de Supabase, es el
 * único lugar donde la `service_role` está a salvo, y el navegador
 * llega hasta acá con la clave publishable de siempre.
 *
 * ─────────────────────────────────────────────────────────────────────
 * QUÉ CUIDA, Y POR QUÉ CADA COSA
 *
 * Una función con `service_role` es un agujero de escalada de
 * privilegios esperando a pasar. Si cualquiera la pudiera llamar, se
 * crearía un usuario `dueno` y listo. Entonces:
 *
 *   1. QUIÉN LLAMA. Se lee el usuario del JWT y se busca su perfil en
 *      `public.usuarios`, no en el token. El token lo puede tener
 *      cualquiera; la tabla es la fuente de verdad del proyecto y está
 *      protegida por el trigger `proteger_columnas_de_autorizacion`.
 *      Solo `dueno` y `supervisor` aprobados pasan (lo pide el punto 1).
 *
 *   2. QUÉ PERFIL SE PUEDE CREAR. Solo los cuatro de empleado. Un
 *      supervisor NO puede fabricarse un `dueno`, ni un `dueno` puede
 *      crear otro por acá. Los perfiles de mando se dan a mano con
 *      `supabase/crear-usuarios.mjs`.
 *
 *   3. LOS DATOS. Los CHECK de la base son la última línea de defensa y
 *      corren igual. `public.usuarios` ya trae, desde su creación en
 *      `20260901000100_tablas_base.sql`: dni y correo únicos, formato
 *      de dni, cuil y correo, CUIL obligatorio para los empleados, y
 *      apellidos/dni/correo obligatorios para todo el que no sea
 *      anónimo.
 *
 *      Acá solo se valida lo que la base NO puede ver: que la
 *      contraseña exista y que el perfil sea uno de los cuatro. No se
 *      copian los largos ni los formatos —ya están en las migraciones y
 *      en `limites.ts`, y una tercera copia se desincroniza sola—. Lo
 *      que sí se hace es traducir el error de PostgreSQL a algo que una
 *      persona entienda.
 *
 * ─────────────────────────────────────────────────────────────────────
 * DESPLIEGUE
 *
 *     npx supabase functions deploy crear-empleado
 *
 * No hay que configurarle ningún secreto: `SUPABASE_URL`,
 * `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta
 * Supabase sola. La `service_role` nunca pasa por el repositorio.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

/** Los únicos perfiles que esta función puede crear. */
const PERFILES_DE_EMPLEADO = ['metre', 'mozo', 'cocinero', 'cantinero'] as const;
type PerfilEmpleado = (typeof PERFILES_DE_EMPLEADO)[number];

/** Quiénes pueden dar de alta a un empleado (punto 1 del enunciado). */
const PERFILES_QUE_PUEDEN_CREAR = ['dueno', 'supervisor'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Alta {
  nombres?: string;
  apellidos?: string;
  dni?: string;
  cuil?: string;
  correo?: string;
  clave?: string;
  perfil?: string;
  fotoUrl?: string;
}

function responder(cuerpo: unknown, estado: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const error = (mensaje: string, estado: number) => responder({ error: mensaje }, estado);

/**
 * Traduce el error de PostgreSQL al idioma de la persona que lo va a
 * leer. Los nombres de los constraints salen de
 * `20260901000100_tablas_base.sql` (unicidad, formatos y reglas de
 * negocio) y de `20260901000600_limites_de_longitud.sql` (largos).
 */
function mensajeDeError(crudo: string): string {
  const c = crudo.toLowerCase();

  // ── Repetidos ─────────────────────────────────────────────────────
  //
  // `usuarios` tiene DOS columnas únicas: `dni` y `correo`. Mirar solo
  // "duplicate key" y hablar del correo era un error: un DNI repetido
  // mandaba a la persona a revisar un campo que estaba bien.
  if (c.includes('usuarios_dni_key')) return 'Ya existe un empleado con ese DNI.';
  if (c.includes('usuarios_correo_key') || c.includes('already been registered')) {
    return 'Ya existe una cuenta con ese correo electrónico.';
  }
  if (c.includes('duplicate key')) {
    return 'Ya existe un empleado con esos datos.';
  }

  // ── Reglas de negocio de la tabla ─────────────────────────────────
  if (c.includes('cuil_en_empleados')) {
    return 'Los empleados tienen que tener CUIL.';
  }
  if (c.includes('datos_completos_si_no_es_anonimo')) {
    return 'Faltan datos obligatorios: apellidos, DNI y correo.';
  }

  // ── Formatos y largos ─────────────────────────────────────────────
  if (c.includes('formato_nombres')) return 'Los nombres solo pueden tener letras, espacios, apóstrofos y guiones.';
  if (c.includes('largo_nombres')) return 'Los nombres tienen que tener entre 2 y 50 caracteres.';
  if (c.includes('formato_apellidos')) return 'Los apellidos solo pueden tener letras, espacios, apóstrofos y guiones.';
  if (c.includes('largo_apellidos')) return 'Los apellidos tienen que tener entre 2 y 50 caracteres.';
  if (c.includes('formato_correo')) return 'El correo no tiene un formato válido.';
  if (c.includes('largo_correo')) return 'El correo tiene que tener entre 5 y 80 caracteres.';
  if (c.includes('formato_dni')) return 'El DNI tiene que ser de 7 u 8 dígitos, sin puntos.';
  if (c.includes('formato_cuil')) return 'El CUIL tiene que ser de 11 dígitos, con guiones o sin ellos.';

  // ── Auth ──────────────────────────────────────────────────────────
  if (c.includes('password')) {
    return 'La contraseña es demasiado corta. Tiene que tener al menos 6 caracteres.';
  }
  if (c.includes('falta completar los datos')) {
    return 'Faltan datos obligatorios: nombres, apellidos y DNI.';
  }

  // Lo que no sabemos traducir se devuelve tal cual: es preferible un
  // mensaje feo a uno inventado que mande a buscar el problema al lugar
  // equivocado. Justamente eso pasaba antes con el DNI repetido.
  return crudo;
}

Deno.serve(async (peticion: Request) => {
  if (peticion.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (peticion.method !== 'POST') return error('Método no permitido.', 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const servicio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !servicio) {
    return error('La función no está configurada correctamente.', 500);
  }

  // ── 1. Quién llama ────────────────────────────────────────────────
  const autorizacion = peticion.headers.get('Authorization');
  if (!autorizacion) return error('Falta iniciar sesión.', 401);

  const comoElUsuario = createClient(url, anon, {
    global: { headers: { Authorization: autorizacion } },
  });

  const { data: sesion, error: errorSesion } = await comoElUsuario.auth.getUser();
  if (errorSesion || !sesion.user) return error('Tu sesión expiró. Volvé a ingresar.', 401);

  const admin = createClient(url, servicio, { auth: { persistSession: false } });

  // El perfil se lee de la tabla, NO del token: es la fuente de verdad
  // del proyecto y está protegida contra escalada de privilegios.
  const { data: quienLlama, error: errorPerfil } = await admin
    .from('usuarios')
    .select('perfil, estado')
    .eq('id', sesion.user.id)
    .maybeSingle();

  if (errorPerfil || !quienLlama) return error('No pudimos verificar tu perfil.', 403);

  if (
    !PERFILES_QUE_PUEDEN_CREAR.includes(quienLlama.perfil) ||
    quienLlama.estado !== 'aprobado'
  ) {
    return error('Solo el dueño o un supervisor pueden dar de alta empleados.', 403);
  }

  // ── 2. Qué se pide ────────────────────────────────────────────────
  let datos: Alta;
  try {
    datos = await peticion.json();
  } catch {
    return error('El pedido no tiene un cuerpo válido.', 400);
  }

  const perfil = (datos.perfil ?? '').trim() as PerfilEmpleado;
  if (!PERFILES_DE_EMPLEADO.includes(perfil)) {
    return error(
      `El perfil tiene que ser uno de: ${PERFILES_DE_EMPLEADO.join(', ')}.`,
      400,
    );
  }

  const correo = (datos.correo ?? '').trim().toLowerCase();
  const clave = datos.clave ?? '';
  if (!correo) return error('Falta el correo electrónico.', 400);
  if (!clave) return error('Falta la contraseña.', 400);

  // ── 3. Crear la cuenta ────────────────────────────────────────────
  //
  // El trigger `manejar_usuario_nuevo` se dispara con este insert y crea
  // la fila de `public.usuarios` leyendo estos metadatos. Corre en la
  // MISMA transacción: si un CHECK falla, se cae también el usuario de
  // auth y no quedan huérfanos.
  const metadatosDePersona = {
    nombres: (datos.nombres ?? '').trim(),
    apellidos: (datos.apellidos ?? '').trim(),
    dni: (datos.dni ?? '').trim(),
    cuil: (datos.cuil ?? '').trim(),
    foto_url: (datos.fotoUrl ?? '').trim(),
  };

  const { data: creado, error: errorAlta } = await admin.auth.admin.createUser({
    email: correo,
    password: clave,
    // Sin envío de correos configurado todavía (habilitador E4), una
    // cuenta sin confirmar no podría ingresar nunca.
    email_confirm: true,
    user_metadata: metadatosDePersona,
    app_metadata: { perfil, estado: 'aprobado' },
  });

  if (errorAlta || !creado.user) {
    return error(mensajeDeError(errorAlta?.message ?? 'No se pudo crear la cuenta.'), 400);
  }

  // ── 4. Fijar el perfil, explícitamente ────────────────────────────
  //
  // NO SE PUEDE CONFIAR EN EL app_metadata DE ARRIBA. Supabase Auth
  // escribe el suyo al crear la cuenta y pisa el que se le manda, o lo
  // aplica después del INSERT; en cualquiera de los dos casos el
  // trigger lo lee antes de tiempo y cae al valor por defecto
  // (cliente_registrado / pendiente). Esto ya lo aprendió
  // `supabase/crear-usuarios.mjs` y está documentado ahí.
  //
  // Efecto secundario bueno: el trigger no puede otorgar un perfil
  // elevado por sí solo bajo ninguna circunstancia.
  const { error: errorPerfilFinal } = await admin
    .from('usuarios')
    .update({ perfil, estado: 'aprobado' })
    .eq('id', creado.user.id);

  if (errorPerfilFinal) {
    // Deshacer: más vale no dejar una cuenta a medio crear, que después
    // aparece como cliente pendiente y nadie entiende de dónde salió.
    await admin.auth.admin.deleteUser(creado.user.id);
    return error(mensajeDeError(errorPerfilFinal.message), 400);
  }

  await admin.auth.admin.updateUserById(creado.user.id, {
    app_metadata: { perfil, estado: 'aprobado' },
  });

  return responder({ id: creado.user.id, perfil, correo }, 201);
});
