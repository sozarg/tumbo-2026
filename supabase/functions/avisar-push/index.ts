import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import {
  leerCuentaDeServicio,
  mandarAviso,
  permisoDeGoogle,
  type Aviso,
} from '../_shared/push.ts';

/**
 * Las notificaciones automáticas que pide el enunciado.
 *
 * La primera es la del punto 6: «Verificar que el registro se visualice
 * en el listado de clientes pendientes de aprobación. (push
 * notification)». Cuando alguien se registra, al dueño y al supervisor
 * les tiene que sonar el teléfono.
 *
 * ───────────────────────────────────────────────────────────────────
 * QUIÉN LA LLAMA
 *
 * La base, igual que la del correo: un trigger sobre `usuarios`, esta
 * vez en el INSERT. Y por el mismo motivo — que el aviso sea
 * consecuencia del hecho y no una segunda acción que puede no ocurrir.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ NO LE CREE AL PAYLOAD
 *
 * Mismo criterio que `avisar-cliente`: el cuerpo dice a quién mirar y
 * los datos salen de la base con `service_role`. Una llamada forzada
 * desde afuera solo puede reenviar un aviso verdadero.
 */

const FIRMA = 'x-tumbo-firma';

/** Los que deciden sobre los clientes, según el punto 5. */
const GERENCIA = ['dueno', 'supervisor'];

interface FilaUsuario {
  id?: string;
  perfil?: string;
  estado?: string;
}

interface CuerpoDelWebhook {
  type?: string;
  table?: string;
  record?: FilaUsuario;
}

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

  const fila = cuerpo.record;
  if (cuerpo.type !== 'INSERT' || cuerpo.table !== 'usuarios' || !fila?.id) {
    return json({ ignorado: 'no es un alta de usuarios' });
  }
  if (fila.perfil !== 'cliente_registrado' || fila.estado !== 'pendiente') {
    return json({ ignorado: 'no es un cliente pendiente' });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const nuevo = await admin
    .from('usuarios')
    .select('nombres,apellidos,perfil,estado')
    .eq('id', fila.id)
    .single();

  if (nuevo.error || !nuevo.data) return json({ error: 'No se encontró al cliente.' }, 404);
  if (nuevo.data.estado !== 'pendiente') {
    return json({ ignorado: 'el cliente ya fue resuelto' });
  }

  /*
   * Los destinatarios salen de cruzar dos tablas: quiénes son gerencia
   * y qué teléfonos tienen registrados. Una persona puede tener varios
   * —el enunciado se demuestra con cuatro dispositivos— y hay que
   * avisarle a todos.
   */
  const gerencia = await admin.from('usuarios').select('id').in('perfil', GERENCIA).eq('estado', 'aprobado');
  if (gerencia.error || !gerencia.data?.length) {
    return json({ ignorado: 'no hay gerencia aprobada a quien avisar' });
  }

  const dispositivos = await admin
    .from('dispositivos_push')
    .select('token')
    .in(
      'usuario_id',
      gerencia.data.map((u) => u.id),
    );

  if (dispositivos.error) return json({ error: 'No se pudieron leer los dispositivos.' }, 500);
  if (!dispositivos.data?.length) {
    // No es una falla: simplemente todavía nadie de gerencia abrió la
    // aplicación en un teléfono. Decir que falló llenaría los registros.
    return json({ ignorado: 'gerencia no tiene dispositivos registrados' });
  }

  const nombre = `${nuevo.data.nombres ?? ''} ${nuevo.data.apellidos ?? ''}`.trim() || 'Un cliente';
  const aviso: Aviso = {
    titulo: 'Nuevo cliente para aprobar',
    cuerpo: `${nombre} se registró y espera tu aprobación.`,
    seccion: 'clientes',
  };

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
   * siempre y cada alta se vuelve más lenta.
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
});
