import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.112.4';
import {
  leerCuentaDeServicio,
  mandarAviso,
  permisoDeGoogle,
  type Aviso,
} from '../_shared/push.ts';
import {
  DESTINATARIOS_DE_CUENTA,
  ESTADO_DE_CUENTA,
  ESTADOS_DEL_MOMENTO,
  GERENCIA,
  MOZOS,
  PREPARA,
  avisoDeClientePendiente,
  avisoDeCuenta,
  avisoDeMensaje,
  avisoDePedido,
  avisoDePedidoConfirmadoAlCliente,
  avisoDePedidoListo,
  clasificar,
  detalleDeItems,
  type CuerpoDelWebhook,
  type MomentoDePedido,
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
 * - Puntos 21 y 22: la cuenta pedida (al mozo), pagada (al mozo, al
 *   dueño y al supervisor) y confirmada (al dueño y al supervisor).
 * - Punto 11: la consulta del cliente a todos los mozos, y la respuesta
 *   del mozo al cliente.
 * - Puntos 12 a 14: el pedido enviado (a los mozos), rechazado (al
 *   cliente, con el motivo) y confirmado (a cocina y bar, cada uno con
 *   su parte, y al cliente).
 *
 * ───────────────────────────────────────────────────────────────────
 * QUIÉN LA LLAMA
 *
 * La base, igual que la del correo: triggers sobre `usuarios`,
 * `pedidos`, `cuentas` y `mensajes` que llaman por `encolar_aviso`. Y
 * por el mismo motivo: que el aviso sea consecuencia del hecho y no una
 * segunda acción que puede no ocurrir.
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

  if (evento.tipo === 'cuenta') {
    const cuenta = await admin
      .from('cuentas')
      .select('estado,total,sesion_mesa_id')
      .eq('id', evento.id)
      .single();
    if (cuenta.error || !cuenta.data) return json({ error: 'No se encontró la cuenta.' }, 404);
    if (cuenta.data.estado !== ESTADO_DE_CUENTA[evento.momento]) {
      return json({ ignorado: 'la cuenta ya cambió de estado' });
    }
    const mesa = await numeroDeMesa(admin, cuenta.data.sesion_mesa_id);
    return avisarAPerfiles(
      admin,
      DESTINATARIOS_DE_CUENTA[evento.momento],
      avisoDeCuenta(evento.momento, mesa, Number(cuenta.data.total)),
    );
  }

  if (evento.tipo === 'pedido') return avisarPedido(admin, evento.id, evento.momento);
  if (evento.tipo === 'mensaje') return avisarMensaje(admin, evento.id);

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

  const mesa = await numeroDeMesa(admin, pedido.data.sesion_mesa_id);
  return avisarAPerfiles(admin, MOZOS, avisoDePedidoListo(mesa));
});

/** El número de la mesa de una estadía, para que el aviso diga adónde ir. */
async function numeroDeMesa(admin: SupabaseClient, sesionId: string): Promise<number | null> {
  return (await estadia(admin, sesionId)).mesa;
}

/** La mesa y el cliente de una estadía: a quién avisar y qué mesa nombrar. */
async function estadia(
  admin: SupabaseClient,
  sesionId: string,
): Promise<{ mesa: number | null; cliente: string | null }> {
  const sesion = await admin
    .from('sesiones_mesa')
    .select('mesa_id,cliente_id')
    .eq('id', sesionId)
    .single();
  if (!sesion.data) return { mesa: null, cliente: null };
  const mesa = await admin.from('mesas').select('numero').eq('id', sesion.data.mesa_id).single();
  return { mesa: mesa.data?.numero ?? null, cliente: sesion.data.cliente_id };
}

/**
 * Puntos 12 a 14. El estado se vuelve a leer por el mismo motivo que
 * en el 18: si el mozo ya decidió otra cosa, el aviso no corresponde.
 */
async function avisarPedido(
  admin: SupabaseClient,
  id: string,
  momento: MomentoDePedido,
): Promise<Response> {
  const pedido = await admin
    .from('pedidos')
    .select('estado,sesion_mesa_id,motivo_rechazo')
    .eq('id', id)
    .single();
  if (pedido.error || !pedido.data) return json({ error: 'No se encontró el pedido.' }, 404);
  if (!ESTADOS_DEL_MOMENTO[momento].includes(pedido.data.estado)) {
    return json({ ignorado: 'el pedido ya cambió de estado' });
  }
  const { mesa, cliente } = await estadia(admin, pedido.data.sesion_mesa_id);

  if (momento === 'enviado') {
    return json(await enviarA(admin, await aprobadosCon(admin, MOZOS), avisoDePedido(momento, mesa)));
  }
  if (momento === 'rechazado') {
    const aviso = avisoDePedido(momento, mesa, { motivo: pedido.data.motivo_rechazo });
    return json(await enviarA(admin, cliente ? [cliente] : [], aviso));
  }

  // Confirmado: cada sector recibe solo lo suyo, y el cliente se entera.
  const items = await admin
    .from('pedido_items')
    .select('cantidad,sector,productos(nombre)')
    .eq('pedido_id', id);
  if (items.error) return json({ error: 'No se pudieron leer los ítems.' }, 500);

  const resumen: Record<string, unknown> = {};
  for (const [sector, perfil] of Object.entries(PREPARA)) {
    const suyos = (items.data ?? [])
      .filter((i) => i.sector === sector)
      .map((i) => ({ cantidad: i.cantidad, nombre: nombreDelProducto(i.productos) }));
    if (!suyos.length) continue;
    const aviso = avisoDePedido(momento, mesa, { detalle: detalleDeItems(suyos) });
    resumen[sector] = await enviarA(admin, await aprobadosCon(admin, [perfil]), aviso);
  }
  resumen['cliente'] = await enviarA(admin, cliente ? [cliente] : [], avisoDePedidoConfirmadoAlCliente());
  return json(resumen);
}

/** El embebido de PostgREST puede llegar como objeto o como lista. */
function nombreDelProducto(producto: unknown): string {
  const fila = Array.isArray(producto) ? producto[0] : producto;
  return (fila as { nombre?: string } | null)?.nombre ?? 'Producto';
}

/**
 * Punto 11. Quién escribió se decide por la estadía y no por el `tipo`
 * que manda la aplicación: si lo escribió el cliente de esa estadía es
 * una consulta para todos los mozos; si no, es la respuesta del mozo.
 */
async function avisarMensaje(admin: SupabaseClient, id: string): Promise<Response> {
  const mensaje = await admin
    .from('mensajes')
    .select('autor_id,cuerpo,sesion_mesa_id')
    .eq('id', id)
    .single();
  if (mensaje.error || !mensaje.data) return json({ error: 'No se encontró el mensaje.' }, 404);
  const { mesa, cliente } = await estadia(admin, mensaje.data.sesion_mesa_id);
  const deCliente = mensaje.data.autor_id === cliente;
  const aviso = avisoDeMensaje(deCliente, mesa, mensaje.data.cuerpo);
  const destinatarios = deCliente
    ? await aprobadosCon(admin, MOZOS)
    : cliente
      ? [cliente]
      : [];
  return json(await enviarA(admin, destinatarios, aviso));
}

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
  return json(await enviarA(admin, await aprobadosCon(admin, perfiles), aviso));
}

/** Los ids de las personas aprobadas con alguno de esos perfiles. */
async function aprobadosCon(admin: SupabaseClient, perfiles: readonly string[]): Promise<string[]> {
  const personas = await admin
    .from('usuarios')
    .select('id')
    .in('perfil', [...perfiles])
    .eq('estado', 'aprobado');
  return personas.data?.map((u) => u.id) ?? [];
}

/** Manda el aviso a todos los teléfonos de esas personas y resume qué pasó. */
async function enviarA(
  admin: SupabaseClient,
  usuarios: readonly string[],
  aviso: Aviso,
): Promise<Record<string, unknown>> {
  if (!usuarios.length) return { ignorado: 'no hay personas a quien avisar' };

  const dispositivos = await admin
    .from('dispositivos_push')
    .select('token')
    .in('usuario_id', [...usuarios]);

  if (dispositivos.error) return { error: 'No se pudieron leer los dispositivos.' };
  if (!dispositivos.data?.length) {
    // No es una falla: simplemente todavía nadie con ese perfil abrió la
    // aplicación en un teléfono. Decir que falló llenaría los registros.
    return { ignorado: 'los destinatarios no tienen dispositivos registrados' };
  }

  let permiso: string;
  let proyecto: string;
  try {
    const cuenta = leerCuentaDeServicio(Deno.env.get('FIREBASE_CUENTA_SERVICIO'));
    proyecto = cuenta.project_id;
    permiso = await permisoDeGoogle(cuenta);
  } catch (falla) {
    console.error('[TUMBO] No se pudo obtener el permiso de Firebase', falla);
    return { error: String(falla) };
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

  return {
    enviados: envios.filter((e) => e.ok).length,
    fallados: fallados.length,
    caducosBorrados: caducos.length,
  };
}
