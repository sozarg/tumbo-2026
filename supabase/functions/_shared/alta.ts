import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.112.4';
import {
  EntradaInvalida,
  objeto,
  puedeGestionarProducto,
  validarEmpleado,
  validarMesa,
  validarProducto,
} from './validacion-altas.ts';
import { imagenSegura } from './imagen-segura.ts';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,x-client-info,apikey,content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};
const respuesta = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Clase = 'empleado' | 'producto' | 'mesa';
interface Reserva {
  id: string;
  recurso: string;
  destino: string | null;
  finalizada: boolean;
}
interface FotoGuardada {
  orden: number;
  ruta: string;
  url: string;
}

export async function atenderAlta(
  req: Request,
  clase: Clase,
  clienteDePrueba?: SupabaseClient,
): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return respuesta({ error: 'Método no permitido.' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!,
    servicio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin =
    clienteDePrueba ??
    createClient(url, servicio, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return respuesta({ error: 'Falta iniciar sesión.' }, 401);
  const auth = await admin.auth.getUser(token);
  if (auth.error || !auth.data.user) return respuesta({ error: 'Sesión inválida.' }, 401);
  const actor = await admin
    .from('usuarios')
    .select('perfil,estado')
    .eq('id', auth.data.user.id)
    .single();
  if (actor.error || actor.data.estado !== 'aprobado')
    return respuesta({ error: 'Usuario no habilitado.' }, 403);
  if (clase !== 'producto' && !['dueno', 'supervisor'].includes(actor.data.perfil))
    return respuesta({ error: 'Solo dueño y supervisor pueden realizar esta alta.' }, 403);
  if (
    clase === 'producto' &&
    !['dueno', 'supervisor', 'cocinero', 'cantinero'].includes(actor.data.perfil)
  )
    return respuesta({ error: 'No tenés permiso para gestionar productos.' }, 403);
  let reserva: Reserva | undefined;
  const subidas: FotoGuardada[] = [];
  const bucket =
    clase === 'empleado' ? 'fotos-usuarios' : clase === 'mesa' ? 'fotos-mesas' : 'fotos-productos';
  try {
    // Límite también para solicitudes chunked, antes de construir FormData.
    const lector = req.body?.getReader();
    if (!lector) throw new EntradaInvalida('Faltan datos.');
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await lector.read();
      if (done) break;
      total += value.length;
      if (total > 16 * 1024 * 1024) {
        await lector.cancel();
        throw new EntradaInvalida('El formulario supera 16 MB.');
      }
      chunks.push(value);
    }
    const body = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      body.set(c, offset);
      offset += c.length;
    }
    const form = await new Response(body, {
      headers: { 'Content-Type': req.headers.get('Content-Type') ?? '' },
    }).formData();
    const crudo = form.get('datos');
    if (typeof crudo !== 'string') throw new EntradaInvalida('Faltan los datos del formulario.');
    const d = objeto(JSON.parse(crudo));
    const id = form.get('solicitud'),
      destino = form.get('destino');
    if (
      typeof id !== 'string' ||
      !UUID.test(id) ||
      (destino !== null && (typeof destino !== 'string' || !UUID.test(destino)))
    )
      throw new EntradaInvalida('Identificador de solicitud inválido.');
    if (clase === 'empleado' && destino !== null)
      throw new EntradaInvalida('Esta función solo crea empleados.');
    const datos =
      clase === 'empleado'
        ? validarEmpleado(d)
        : clase === 'mesa'
          ? validarMesa(d)
          : validarProducto(d);
    if (clase === 'producto') {
      const producto = validarProducto(d);
      if (!puedeGestionarProducto(actor.data.perfil, producto.tipo))
        return respuesta({ error: 'Sector no autorizado.' }, 403);
      if (destino) {
        const anterior = await admin.from('productos').select('tipo').eq('id', destino).single();
        if (
          anterior.error ||
          !puedeGestionarProducto(actor.data.perfil, anterior.data.tipo) ||
          anterior.data.tipo !== producto.tipo
        )
          return respuesta({ error: 'Producto o sector no autorizado.' }, 403);
      }
    }
    const fotos: { orden: number; archivo: File }[] = [];
    for (const [campo, valor] of form) {
      if (['datos', 'solicitud', 'destino'].includes(campo)) continue;
      if (!/^foto[123]$/.test(campo) || !(valor instanceof File))
        throw new EntradaInvalida('Campo de foto inválido.');
      fotos.push({ orden: Number(campo.slice(4)), archivo: valor });
    }
    if (
      new Set(fotos.map((f) => f.orden)).size !== fotos.length ||
      fotos.length > (clase === 'producto' ? 3 : 1) ||
      (!destino && fotos.length !== (clase === 'producto' ? 3 : 1)) ||
      (clase !== 'producto' && fotos.some((f) => f.orden !== 1))
    )
      throw new EntradaInvalida(
        clase === 'producto'
          ? 'Se requieren exactamente tres fotos, una por posición.'
          : 'La foto es obligatoria.',
      );
    // Decodificación completa antes de crear cuentas, filas u objetos.
    if (clase === 'mesa' && destino && !fotos.length) {
      const anterior = await admin.from('mesas').select('foto_url').eq('id', destino).single();
      if (anterior.error || !anterior.data.foto_url)
        throw new EntradaInvalida('La mesa necesita una foto para guardar los cambios.');
    }
    const preparadas = [];
    for (const foto of fotos) preparadas.push({ ...foto, bytes: await imagenSegura(foto.archivo) });
    const tomada = await admin.rpc('reservar_alta', {
      p_id: id,
      p_actor: auth.data.user.id,
      p_clase: clase,
      p_destino: destino,
    });
    if (tomada.error)
      return respuesta(
        {
          error:
            tomada.error.code === '55P03'
              ? 'El alta sigue en proceso. Esperá y reintentá.'
              : 'No se pudo reservar el alta. Reintentá.',
        },
        409,
      );
    reserva = tomada.data as Reserva;
    const recurso = reserva.destino ?? reserva.recurso;
    if (reserva.finalizada) {
      if (clase === 'empleado') {
        const desbloqueo = await admin.auth.admin.updateUserById(recurso, { ban_duration: 'none' });
        if (desbloqueo.error) throw new Error('Activación pendiente');
      }
      return respuesta({ id: recurso, ok: true });
    }
    for (const foto of preparadas) {
      const ruta = `${recurso}/${id}/${crypto.randomUUID()}.jpg`;
      const subida = await admin.storage
        .from(bucket)
        .upload(ruta, foto.bytes, {
          contentType: 'image/jpeg',
          upsert: false,
          cacheControl: '31536000',
        });
      if (subida.error) throw new Error('No se pudo subir la foto.');
      subidas.push({
        orden: foto.orden,
        ruta,
        url: admin.storage.from(bucket).getPublicUrl(ruta).data.publicUrl,
      });
    }
    if (clase === 'empleado') {
      const e = validarEmpleado(d);
      const existente = await admin.auth.admin.getUserById(recurso);
      if (existente.data.user) {
        if (
          existente.data.user.app_metadata['solicitud_alta'] !== id ||
          existente.data.user.email !== e.correo
        )
          throw new EntradaInvalida(
            'Esta solicitud pertenece a otro legajo. Reiniciá el formulario.',
          );
      } else {
        const creado = await admin.auth.admin.createUser({
          id: recurso,
          email: e.correo,
          password: e.clave,
          email_confirm: true,
          ban_duration: '876000h',
          user_metadata: { nombres: e.nombres, apellidos: e.apellidos, dni: e.dni, cuil: e.cuil },
          app_metadata: { solicitud_alta: id, perfil: e.perfil, estado: 'pendiente' },
        });
        if (creado.error)
          throw new EntradaInvalida(
            'No se pudo crear el empleado. Verificá que correo y DNI no estén registrados y que la contraseña cumpla la política.',
          );
      }
    }
    // Nunca se envía ni persiste la contraseña en el RPC/bitácora.
    const { clave: _clave, ...sinClave } = datos as Record<string, unknown>;
    const fin = await admin.rpc('finalizar_alta', {
      p_id: id,
      p_datos: sinClave,
      p_fotos: subidas,
    });
    if (fin.error)
      throw new EntradaInvalida(
        fin.error.code === '23505'
          ? 'Ya existe un registro con ese número, nombre, DNI o correo.'
          : 'No se pudo completar el alta. Revisá los datos y las fotos; podés reintentar.',
      );
    reserva.finalizada = true;
    if (clase === 'empleado') {
      const activada = await admin.auth.admin.updateUserById(recurso, { ban_duration: 'none' });
      if (activada.error) throw new Error('Activación pendiente');
    }
    return respuesta({ ok: true, id: recurso }, 201);
  } catch (e) {
    if (reserva) {
      // Ante una respuesta perdida, leer la confirmación antes de compensar.
      const estado = await admin
        .from('solicitudes_alta')
        .select('finalizada')
        .eq('id', reserva.id)
        .single();
      if (!estado.error && !estado.data.finalizada) {
        if (subidas.length) await admin.storage.from(bucket).remove(subidas.map((f) => f.ruta));
        await admin
          .from('solicitudes_alta')
          .update({ bloqueo_hasta: new Date().toISOString() })
          .eq('id', reserva.id)
          .eq('finalizada', false);
      }
    }
    return respuesta(
      {
        error:
          e instanceof EntradaInvalida
            ? e.message
            : 'No se completó la operación. Conservamos el formulario para reintentar de forma segura.',
      },
      e instanceof EntradaInvalida ? 400 : 503,
    );
  }
}
