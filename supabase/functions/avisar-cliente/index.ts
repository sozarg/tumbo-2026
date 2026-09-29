import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { armarCorreo, entregarConBrevo, type EstadoResuelto } from '../_shared/correo.ts';

/**
 * Le avisa por correo al cliente que el dueño lo aprobó o lo rechazó.
 *
 * ───────────────────────────────────────────────────────────────────
 * QUIÉN LA LLAMA
 *
 * Nadie desde la aplicación: la llama la BASE, con un Database Webhook
 * sobre `public.usuarios` en el evento UPDATE.
 *
 * Eso no es un detalle de implementación, es lo que hace que el correo
 * sea de verdad automático, como pide el enunciado. Si lo mandara la
 * app, aprobar y avisar serían dos cosas sueltas: al dueño se le corta
 * internet después de aprobar y el cliente queda habilitado sin enterarse
 * nunca. Colgado del cambio en la tabla, el aviso es consecuencia del
 * hecho y no una segunda acción que puede no ocurrir.
 *
 * Como beneficio: no toca el código de Angular, así que se puede sumar
 * o corregir sin volver a compilar el APK.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ NO LE CREE AL PAYLOAD
 *
 * El webhook manda la fila en el cuerpo, y sería más corto usarla. No se
 * hace: esta función está publicada en internet, y si alguien descubre
 * la URL podría mandarle una fila inventada y hacerle escribir el texto
 * que quiera a la dirección que quiera.
 *
 * Así que el cuerpo se usa solo para saber A QUIÉN mirar, y los datos
 * salen de la base con `service_role`. Lo peor que puede lograr alguien
 * que fuerce la llamada es que a un cliente real le llegue de nuevo un
 * aviso verdadero.
 */

const FIRMA = 'x-tumbo-firma';

interface FilaUsuario {
  id?: string;
  estado?: string;
  perfil?: string;
}

interface CuerpoDelWebhook {
  type?: string;
  table?: string;
  record?: FilaUsuario;
  old_record?: FilaUsuario;
}

const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  /*
   * La función se despliega sin verificación de JWT, porque quien la
   * llama es la base y no una persona con sesión. En su lugar comparte
   * una firma con el webhook. Si se filtrara, lo único que habilita es
   * reenviar avisos legítimos: no da acceso a ningún dato.
   */
  const firmaEsperada = Deno.env.get('TUMBO_FIRMA_WEBHOOK');
  if (!firmaEsperada) return json({ error: 'Falta configurar TUMBO_FIRMA_WEBHOOK.' }, 500);
  if (req.headers.get(FIRMA) !== firmaEsperada) return json({ error: 'Firma inválida.' }, 401);

  let cuerpo: CuerpoDelWebhook;
  try {
    cuerpo = (await req.json()) as CuerpoDelWebhook;
  } catch {
    return json({ error: 'Cuerpo ilegible.' }, 400);
  }

  /*
   * TODO LO QUE NO CORRESPONDE SE IGNORA CON 200.
   *
   * El webhook dispara en cada UPDATE de `usuarios`: cambiar una foto,
   * corregir un apellido, aprobar a un empleado. Contestar un error en
   * esos casos haría que `pg_net` reintente y llene los registros de
   * fallas que no son fallas.
   */
  const fila = cuerpo.record;
  const previa = cuerpo.old_record;

  if (cuerpo.type !== 'UPDATE' || cuerpo.table !== 'usuarios' || !fila?.id) {
    return json({ ignorado: 'no es una actualización de usuarios' });
  }
  if (fila.estado === previa?.estado) {
    return json({ ignorado: 'el estado no cambió' });
  }
  if (fila.estado !== 'aprobado' && fila.estado !== 'rechazado') {
    return json({ ignorado: `estado ${fila.estado} sin aviso` });
  }
  // El enunciado pide el correo para el cliente registrado. Al personal
  // lo da de alta el dueño en persona y ya entra aprobado.
  if (fila.perfil !== 'cliente_registrado') {
    return json({ ignorado: `perfil ${fila.perfil} sin aviso` });
  }

  const clave = Deno.env.get('BREVO_API_KEY');
  const remitenteCorreo = Deno.env.get('REMITENTE_CORREO');
  if (!clave || !remitenteCorreo) {
    return json({ error: 'Faltan BREVO_API_KEY o REMITENTE_CORREO.' }, 500);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await admin
    .from('usuarios')
    .select('nombres,apellidos,correo,estado,perfil,motivo_rechazo')
    .eq('id', fila.id)
    .single();

  if (error || !data) return json({ error: 'No se encontró al cliente.' }, 404);
  if (!data.correo) return json({ ignorado: 'el cliente no tiene correo cargado' });

  /*
   * Se vuelve a mirar el estado, ahora el de la base. Entre que el
   * webhook salió y esta función corrió, el dueño pudo haberse
   * arrepentido; mandar el aviso viejo sería contradecir lo que el
   * cliente ve al entrar.
   */
  if (data.estado !== fila.estado) {
    return json({ ignorado: 'el estado ya había vuelto a cambiar' });
  }

  /*
   * EL LOGO SE CONFIGURA, NO SE VERSIONA.
   *
   * Tiene que estar en una URL pública y estable: los clientes de correo
   * no abren imágenes adjuntas en el cuerpo ni entienden `data:`, así
   * que la descargan de internet.
   *
   * Apuntarla al repositorio ata el mail a que el archivo esté en la
   * rama principal, y la primera prueba real se mandó justo con el logo
   * todavía sin subir. Con una variable, la imagen se cambia sin tocar
   * el código ni volver a desplegar el resto.
   */
  const correo = armarCorreo(
    {
      nombres: data.nombres ?? '',
      apellidos: data.apellidos ?? '',
      estado: data.estado as EstadoResuelto,
      motivo: data.motivo_rechazo,
    },
    Deno.env.get('LOGO_URL') || undefined,
  );

  const envio = await entregarConBrevo(
    correo,
    { correo: data.correo, nombre: `${data.nombres ?? ''} ${data.apellidos ?? ''}`.trim() },
    { correo: remitenteCorreo, nombre: Deno.env.get('REMITENTE_NOMBRE') ?? 'Tumbito' },
    clave,
  );

  if (!envio.ok) {
    console.error('[TUMBO] No se pudo mandar el aviso de registro', envio.error);
    return json({ error: envio.error }, 502);
  }

  return json({ enviado: true, id: envio.id, estado: data.estado });
});
