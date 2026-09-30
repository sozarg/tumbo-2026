import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Evento = 'cliente_en_espera' | 'mesa_asignada';
type Solicitud = { evento?: Evento; usuarioId?: string };
type TokenRow = { token: string };
type UsuarioRow = { id: string; perfil: string; nombres: string; apellidos: string | null };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
    if (!url || !anonKey || !serviceKey || !serviceAccountJson) {
      return respuesta({ error: 'El servicio de push no está configurado.' }, 503);
    }

    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return respuesta({ error: 'No autenticado.' }, 401);

    const usuarioClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: identidad, error: errorIdentidad } = await usuarioClient.auth.getUser();
    if (errorIdentidad || !identidad.user) return respuesta({ error: 'Sesión inválida.' }, 401);

    const admin = createClient(url, serviceKey);
    const { data: actor } = await admin
      .from('usuarios')
      .select('id, perfil, nombres, apellidos')
      .eq('id', identidad.user.id)
      .single<UsuarioRow>();
    if (!actor) return respuesta({ error: 'Perfil inexistente.' }, 403);

    const solicitud = (await request.json()) as Solicitud;
    if (!solicitud.evento || !['cliente_en_espera', 'mesa_asignada'].includes(solicitud.evento)) {
      return respuesta({ error: 'Evento de push inválido.' }, 400);
    }
    if (solicitud.evento === 'mesa_asignada' && !['metre', 'dueno', 'supervisor'].includes(actor.perfil)) {
      return respuesta({ error: 'Solo el personal autorizado puede asignar mesas.' }, 403);
    }

    const destinatarios = solicitud.evento === 'mesa_asignada'
      ? solicitud.usuarioId ? [solicitud.usuarioId] : []
      : await idsDelPersonal(admin);
    if (!destinatarios.length) return respuesta({ enviados: 0 }, 200);

    const { data: dispositivos, error } = await admin
      .from('dispositivos_push')
      .select('token')
      .in('usuario_id', destinatarios);
    if (error) return respuesta({ error: 'No se pudieron consultar los dispositivos.' }, 500);

    const contenido = solicitud.evento === 'mesa_asignada'
      ? { title: 'Mesa asignada', body: 'El maître te asignó una mesa. Escaneá el QR de esa mesa.' }
      : { title: 'Nuevo cliente en espera', body: 'Hay un cliente nuevo en la lista de espera.' };
    const tokens = (dispositivos ?? []).map((fila: TokenRow) => fila.token);
    if (!tokens.length) return respuesta({ enviados: 0 }, 200);
    const credenciales = await tokenDeFcm(serviceAccountJson);
    const resultado = await Promise.all(tokens.map((token) => enviarFcm(
      credenciales.projectId,
      credenciales.accessToken,
      token,
      contenido,
    )));
    return respuesta({ enviados: resultado.filter(Boolean).length }, 200);
  } catch {
    return respuesta({ error: 'No se pudo enviar la notificación.' }, 500);
  }
});

async function idsDelPersonal(admin: ReturnType<typeof createClient>): Promise<string[]> {
  const { data } = await admin
    .from('usuarios')
    .select('id')
    .in('perfil', ['metre', 'dueno', 'supervisor'])
    .eq('estado', 'aprobado');
  return (data ?? []).map((fila: { id: string }) => fila.id);
}

async function enviarFcm(
  projectId: string,
  accessToken: string,
  token: string,
  contenido: { title: string; body: string },
): Promise<boolean> {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { token, notification: contenido, data: { app: 'tumbo' } } }),
  });
  return response.ok;
}

async function tokenDeFcm(json: string): Promise<{ projectId: string; accessToken: string }> {
  const cuenta = JSON.parse(json) as { project_id?: string; client_email?: string; private_key?: string };
  if (!cuenta.project_id || !cuenta.client_email || !cuenta.private_key) {
    throw new Error('La cuenta de servicio de FCM está incompleta.');
  }
  const ahora = Math.floor(Date.now() / 1000);
  const encabezado = codificar({ alg: 'RS256', typ: 'JWT' });
  const carga = codificar({
    iss: cuenta.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: ahora,
    exp: ahora + 3600,
  });
  const unsigned = `${encabezado}.${carga}`;
  const clave = await crypto.subtle.importKey(
    'pkcs8',
    pemABytes(cuenta.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    clave,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${base64Url(new Uint8Array(firma))}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!response.ok) throw new Error('No se pudo obtener el token OAuth de FCM.');
  const resultado = await response.json() as { access_token?: string };
  if (!resultado.access_token) throw new Error('FCM no devolvió un token de acceso.');
  return { projectId: cuenta.project_id, accessToken: resultado.access_token };
}

function codificar(valor: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(valor)));
}

function base64Url(bytes: Uint8Array): string {
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemABytes(pem: string): ArrayBuffer {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes.buffer;
}

function respuesta(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
