import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.112.4';
import {
  leerCuentaDeServicio,
  mandarAviso,
  permisoDeGoogle,
  type Aviso,
} from '../_shared/push.ts';
import {
  GERENCIA,
  MOZOS,
  avisoDeClientePendiente,
  avisoDePedidoListo,
  clasificar,
  type CuerpoDelWebhook,
} from './reglas.ts';

/**
 * Las notificaciones automáticas que pide el enunciado.
 *
 * - Punto 6: «Verificar que el registro se visualice en el listado de
 *   clientes pendientes de aprobación. (push notification)». Cuando
 *   alguien se registra, al dueño y al supervisor les tiene que sonar
 *   el teléfono.
 * - Punto 18: cuando cocina y bar terminaron su parte, el mozo recibe
 *   el aviso de que el pedido está completo para entregarlo.
 *
 * ───────────────────────────────────────────────────────────────────
 * QUIÉN LA LLAMA
 *
 * La base, igual que la del correo: un trigger sobre `usuarios` en el
 * INSERT y otro sobre `pedidos` cuando pasa a «listo». Y por el mismo
 * motivo: que el aviso sea consecuencia del hecho y no una segunda
 * acción que puede no ocurrir.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ NO LE CREE AL PAYLOAD
 *
 * Mismo criterio que `avisar-cliente`: el cuerpo dice a quién mirar y
 * los datos salen de la base con `service_role`. Una llamada forzada
 * desde afuera solo puede reenviar un aviso verdadero.
 */

const FIRMA = 'x-tumbo-firma';

const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  const firmaEsperada = Deno.env.get('TUMBO_FIRMA_WEBHOOK');
  if (!firmaEsperada) return json({ error: 'Falta configurar TUMBO_FIRMA_WEBHOOK.' }, 500);
  if (req.headers.get(FIRMA) !== firmaEsperada) return json({ error: 'Firma inválida.' }, 401);

  let cuerpo: CuerpoDelWebhook;
  try {
    cuerpo = (await req.json()) as CuerpoDelWebhook;
  } catch {
    return json({ error: 'Cuerpo ilegible.' }, 400);
  }

  const evento = clasificar(cuerpo);
  if (evento.tipo === 'ignorado') return json({ ignorado: evento.motivo });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  if (evento.tipo === 'cliente_pendiente') {
    const nuevo = await admin
      .from('usuarios')
      .select('nombres,apellidos,perfil,estado')
      .eq('id', evento.id)
      .single();

    if (nuevo.error || !nuevo.data) return json({ error: 'No se encontró al cliente.' }, 404);
    if (nuevo.data.estado !== 'pendiente') {
      return json({ ignorado: 'el cliente ya fue resuelto' });
    }
    return avisarAPerfiles(
      admin,
      GERENCIA,
      avisoDeClientePendiente(nuevo.data.nombres, nuevo.data.apellidos),
    );
  }

  /*
   * Punto 18. El estado se vuelve a leer: si entre el trigger y esta
   * llamada el mozo ya lo entregó, el aviso no tiene sentido.
   */
  const pedido = await admin
    .from('pedidos')
    .select('estado,sesion_mesa_id')
    .eq('id', evento.id)
    .single();
  if (pedido.error || !pedido.data) return json({ error: 'No se encontró el pedido.' }, 404);
  if (pedido.data.estado !== 'listo') return json({ ignorado: 'el pedido ya no está listo' });

  const sesion = await admin
    .from('sesiones_mesa')
    .select('mesa_id')
    .eq('id', pedido.data.sesion_mesa_id)
    .single();
  const mesa = sesion.data
    ? await admin.from('mesas').select('numero').eq('id', sesion.data.mesa_id).single()
    : null;

  return avisarAPerfiles(admin, MOZOS, avisoDePedidoListo(mesa?.data?.numero ?? null));
});

/**
 * Manda un aviso a todos los teléfonos de las personas con esos perfiles.
 *
 * Los destinatarios salen de cruzar dos tablas: quiénes tienen el perfil
 * y qué teléfonos tienen registrados. Una persona puede tener varios
 * —el enunciado se demuestra con cuatro dispositivos— y hay que avisarle
 * a todos.
 */
async function avisarAPerfiles(
  admin: SupabaseClient,
  perfiles: readonly string[],
  aviso: Aviso,
): Promise<Response> {
  const personas = await admin
    .from('usuarios')
    .select('id')
    .in('perfil', [...perfiles])
    .eq('estado', 'aprobado');
  if (personas.error || !personas.data?.length) {
    return json({ ignorado: 'no hay personas aprobadas a quien avisar' });
  }

  const dispositivos = await admin
    .from('dispositivos_push')
    .select('token')
    .in(
      'usuario_id',
      personas.data.map((u) => u.id),
    );

  if (dispositivos.error) return json({ error: 'No se pudieron leer los dispositivos.' }, 500);
  if (!dispositivos.data?.length) {
    // No es una falla: simplemente todavía nadie con ese perfil abrió la
    // aplicación en un teléfono. Decir que falló llenaría los registros.
    return json({ ignorado: 'los destinatarios no tienen dispositivos registrados' });
  }

  let permiso: string;
  let proyecto: string;
  try {
    const cuenta = leerCuentaDeServicio(Deno.env.get('FIREBASE_CUENTA_SERVICIO'));
    proyecto = cuenta.project_id;
    permiso = await permisoDeGoogle(cuenta);
  } catch (falla) {
    console.error('[TUMBO] No se pudo obtener el permiso de Firebase', falla);
    return json({ error: String(falla) }, 500);
  }

  const envios = await Promise.all(
    dispositivos.data.map((d) => mandarAviso(d.token, aviso, permiso, proyecto)),
  );

  /*
   * Los tokens muertos se borran acá y no en otro lado: este es el
   * único momento en que la base se entera de que un teléfono dejó de
   * existir. Sin esto, la tabla crece con filas que fallan para
   * siempre y cada aviso se vuelve más lento.
   */
  const caducos = envios.filter((e) => !e.ok && e.caduco).map((e) => e.token);
  if (caducos.length) {
    await admin.from('dispositivos_push').delete().in('token', caducos);
  }

  const fallados = envios.filter((e) => !e.ok);
  for (const f of fallados) {
    if (!f.ok) console.error('[TUMBO] Falló un aviso push', f.error);
  }

  return json({
    enviados: envios.filter((e) => e.ok).length,
    fallados: fallados.length,
    caducosBorrados: caducos.length,
  });
}
