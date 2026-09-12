/**
 * Baja de empleados (punto 1 del TFI).
 *
 * ─────────────────────────────────────────────────────────────────────
 * EL BUG QUE ESTO ARREGLA
 *
 * La baja se hacía desde el navegador, así:
 *
 *     await this.cliente.from('usuarios').delete().eq('id', id);
 *
 * y la aplicación avisaba «empleado eliminado». No eliminaba nada.
 *
 * En todo el esquema NO HAY UNA SOLA POLÍTICA `for delete`. Con RLS
 * activo y sin política, PostgreSQL deniega el borrado — pero PostgREST
 * no devuelve error: devuelve éxito con cero filas afectadas. El código
 * solo miraba `resultado.error`, así que el caso «no borré nada» y el
 * caso «borré» eran indistinguibles. La persona desaparecía de la
 * pantalla hasta que alguien recargaba, y volvía.
 *
 * Se podría haber agregado una política de borrado y listo. No alcanza,
 * por lo que sigue.
 *
 * ─────────────────────────────────────────────────────────────────────
 * POR QUÉ SE BORRA `auth.users` Y NO `public.usuarios`
 *
 * Son dos filas: la cuenta de acceso y el legajo. Borrando solo el
 * legajo queda una cuenta huérfana, y eso tiene dos consecuencias feas:
 *
 *   - el correo y el DNI siguen ocupados, así que volver a dar de alta a
 *     la misma persona falla por duplicado sin que se vea por qué;
 *   - la cuenta sigue existiendo en Auth y puede autenticarse, aunque
 *     después no pueda entrar por no tener perfil.
 *
 * Borrando la cuenta de Auth, la fila de `public.usuarios` se va sola
 * por el `on delete cascade` de su clave foránea. Una sola operación y
 * no quedan restos. Eso requiere `service_role`, que es por lo que esto
 * es una Edge Function y no una consulta del navegador.
 *
 * ─────────────────────────────────────────────────────────────────────
 * QUÉ CUIDA
 *
 *   1. QUIÉN LLAMA. Igual que el alta: el perfil se lee de
 *      `public.usuarios` y no del token. Solo dueño o supervisor
 *      aprobados.
 *
 *   2. A QUIÉN SE PUEDE BORRAR. Solo los cuatro perfiles de empleado.
 *      Sin esto, un supervisor podría borrar al dueño, o borrar clientes
 *      —que no son personal y tienen su propio circuito de rechazo, con
 *      motivo, en los puntos 7 y 8—.
 *
 *   3. NO BORRARSE A UNO MISMO. Es un accidente fácil en una lista, y
 *      deja al restaurante sin quien administre.
 *
 * La foto se borra antes que la cuenta: si quedara, sería un archivo
 * público sin dueño en un bucket de lectura abierta.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

/** Los únicos perfiles que esta función puede dar de baja. */
const PERFILES_DE_EMPLEADO = ['metre', 'mozo', 'cocinero', 'cantinero'];

/** Quiénes pueden dar de baja (los mismos que dan de alta). */
const PERFILES_QUE_PUEDEN_BORRAR = ['dueno', 'supervisor'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function responder(cuerpo: unknown, estado: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const error = (mensaje: string, estado: number) => responder({ error: mensaje }, estado);

/**
 * Borra las fotos del empleado del bucket.
 *
 * No corta la baja si falla: una foto que queda es basura, pero un
 * empleado que no se puede dar de baja es un problema de verdad. Se
 * devuelve el aviso para que quien llame lo sepa.
 */
async function borrarFotos(
  admin: ReturnType<typeof createClient>,
  id: string,
): Promise<string | undefined> {
  const { data, error: errorLista } = await admin.storage.from('fotos-usuarios').list(id);
  if (errorLista || !data?.length) return undefined;

  const rutas = data.map((archivo) => `${id}/${archivo.name}`);
  const { error: errorBorrado } = await admin.storage.from('fotos-usuarios').remove(rutas);

  return errorBorrado ? 'El empleado se dio de baja, pero su foto quedó guardada.' : undefined;
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

  const { data: quienLlama, error: errorPerfil } = await admin
    .from('usuarios')
    .select('perfil, estado')
    .eq('id', sesion.user.id)
    .maybeSingle();

  if (errorPerfil || !quienLlama) return error('No pudimos verificar tu perfil.', 403);

  if (
    !PERFILES_QUE_PUEDEN_BORRAR.includes(quienLlama.perfil as string) ||
    quienLlama.estado !== 'aprobado'
  ) {
    return error('Solo el dueño o un supervisor pueden dar de baja empleados.', 403);
  }

  // ── 2. A quién ────────────────────────────────────────────────────
  let id: string;
  try {
    id = String(((await peticion.json()) as { id?: string }).id ?? '').trim();
  } catch {
    return error('El pedido no tiene un cuerpo válido.', 400);
  }

  if (!id) return error('Falta indicar a quién dar de baja.', 400);

  if (id === sesion.user.id) {
    return error('No podés darte de baja a vos mismo.', 400);
  }

  const { data: empleado } = await admin
    .from('usuarios')
    .select('perfil, nombres, apellidos')
    .eq('id', id)
    .maybeSingle();

  if (!empleado) return error('Ese empleado ya no existe.', 404);

  if (!PERFILES_DE_EMPLEADO.includes(empleado.perfil as string)) {
    return error('Por acá solo se dan de baja empleados.', 403);
  }

  // ── 3. Borrar ─────────────────────────────────────────────────────
  const aviso = await borrarFotos(admin, id);

  // Se borra la cuenta de Auth: la fila de `public.usuarios` se va sola
  // por el `on delete cascade`.
  const { error: errorBaja } = await admin.auth.admin.deleteUser(id);

  if (errorBaja) {
    console.error('eliminar-empleado · deleteUser falló:', errorBaja);
    return error('No se pudo dar de baja al empleado.', 400);
  }

  return responder(
    {
      id,
      nombre: `${empleado.nombres} ${empleado.apellidos ?? ''}`.trim(),
      ...(aviso ? { aviso } : {}),
    },
    200,
  );
});
