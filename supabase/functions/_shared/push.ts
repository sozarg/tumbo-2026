/**
 * El envío de notificaciones automáticas por Firebase Cloud Messaging.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ ESTO NO ES UNA LLAMADA Y MEDIA COMO BREVO
 *
 * Brevo se conforma con una clave fija en una cabecera. Firebase ya no:
 * la API vieja, la que usaba una «server key», está apagada. La actual
 * exige un permiso OAuth2 de una hora, y para conseguirlo hay que
 * firmar un token con la clave privada de una cuenta de servicio y
 * canjearlo contra Google.
 *
 * Eso es todo lo que hace la primera mitad de este archivo. No es
 * complicado, es ceremonioso.
 *
 * ───────────────────────────────────────────────────────────────────
 * LA CLAVE PRIVADA
 *
 * Viene en el JSON que Firebase descarga desde Configuración del
 * proyecto › Cuentas de servicio. Es una credencial de verdad: quien la
 * tenga puede mandar notificaciones en nombre del restaurante. Vive
 * solamente como secret de Supabase, nunca en el repositorio, que es
 * público.
 */

/** Lo que interesa del JSON de la cuenta de servicio. */
interface CuentaDeServicio {
  readonly client_email: string;
  readonly private_key: string;
  readonly project_id: string;
}

const AUDIENCIA = 'https://oauth2.googleapis.com/token';
const ALCANCE = 'https://www.googleapis.com/auth/firebase.messaging';

/** Base64 «a prueba de URL», que es lo que exige un JWT. */
function base64Url(datos: ArrayBuffer | string): string {
  const texto =
    typeof datos === 'string'
      ? datos
      : String.fromCharCode(...new Uint8Array(datos));
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Convierte la clave PEM al formato binario que entiende Web Crypto.
 *
 * El PEM es base64 con encabezados y saltos de línea; hay que sacarle
 * todo eso y quedarse con los bytes.
 */
function clavePemABytes(pem: string): ArrayBuffer {
  const limpio = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binario = atob(limpio);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes.buffer;
}

/** Arma y firma el JWT que Google canjea por un permiso. */
export async function firmarAfirmacion(
  cuenta: CuentaDeServicio,
  ahora = Math.floor(Date.now() / 1000),
): Promise<string> {
  const encabezado = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const cuerpo = base64Url(
    JSON.stringify({
      iss: cuenta.client_email,
      scope: ALCANCE,
      aud: AUDIENCIA,
      iat: ahora,
      exp: ahora + 3600,
    }),
  );

  const clave = await crypto.subtle.importKey(
    'pkcs8',
    clavePemABytes(cuenta.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const firma = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    clave,
    new TextEncoder().encode(`${encabezado}.${cuerpo}`),
  );

  return `${encabezado}.${cuerpo}.${base64Url(firma)}`;
}

/*
 * EL PERMISO SE GUARDA.
 *
 * Dura una hora y las instancias de la función se reutilizan entre
 * llamadas. Pedir uno nuevo en cada notificación sería un viaje a
 * Google por cada aviso, y el push tiene que llegar rápido.
 *
 * Se descarta un minuto antes de que venza, para que una llamada que
 * arranca justo en el límite no se encuentre con un permiso muerto.
 */
let permisoEnMemoria: { token: string; vence: number } | null = null;

export async function permisoDeGoogle(cuenta: CuentaDeServicio): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000);
  if (permisoEnMemoria && permisoEnMemoria.vence - 60 > ahora) {
    return permisoEnMemoria.token;
  }

  const afirmacion = await firmarAfirmacion(cuenta, ahora);
  const respuesta = await fetch(AUDIENCIA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: afirmacion,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    throw new Error(`Google rechazó la credencial (${respuesta.status}): ${detalle.slice(0, 300)}`);
  }

  const datos = (await respuesta.json()) as { access_token: string; expires_in: number };
  permisoEnMemoria = { token: datos.access_token, vence: ahora + datos.expires_in };
  return datos.access_token;
}

/** Para las pruebas: vacía el permiso guardado. */
export function olvidarPermiso(): void {
  permisoEnMemoria = null;
}

export interface Aviso {
  readonly titulo: string;
  readonly cuerpo: string;
  /** Adónde debería llevar el toque. Lo lee la aplicación al abrirse. */
  readonly seccion?: string;
}

export type ResultadoDeEnvio =
  | { readonly ok: true; readonly token: string }
  /** `caduco` marca los tokens que hay que borrar de la base. */
  | { readonly ok: false; readonly token: string; readonly error: string; readonly caduco: boolean };

/**
 * Manda un aviso a UN dispositivo.
 *
 * Devuelve el fallo en vez de tirar porque un envío es de muchos: que
 * el teléfono del supervisor tenga un token viejo no puede impedir que
 * le llegue al dueño.
 */
export async function mandarAviso(
  token: string,
  aviso: Aviso,
  permiso: string,
  proyecto: string,
): Promise<ResultadoDeEnvio> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`https://fcm.googleapis.com/v1/projects/${proyecto}/messages:send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${permiso}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: aviso.titulo, body: aviso.cuerpo },
          // `data` viaja aparte de la notificación visible: es lo que la
          // aplicación lee para saber adónde ir cuando la tocan.
          data: aviso.seccion ? { seccion: aviso.seccion } : undefined,
          android: { priority: 'HIGH', notification: { sound: 'default' } },
        },
      }),
    });
  } catch (falla) {
    return { ok: false, token, error: `No se pudo contactar a Firebase: ${String(falla)}`, caduco: false };
  }

  if (respuesta.ok) return { ok: true, token };

  const detalle = await respuesta.text().catch(() => '');

  /*
   * 404 y 400 con UNREGISTERED significan que ese teléfono ya no existe
   * para Firebase: desinstalaron la aplicación o el token rotó. No es un
   * error para reintentar, es una fila para borrar.
   */
  const caduco =
    respuesta.status === 404 ||
    detalle.includes('UNREGISTERED') ||
    detalle.includes('INVALID_ARGUMENT');

  return { ok: false, token, error: `Firebase respondió ${respuesta.status}: ${detalle.slice(0, 300)}`, caduco };
}

/** Lee la cuenta de servicio del secret, con un error entendible si falta. */
export function leerCuentaDeServicio(crudo: string | undefined): CuentaDeServicio {
  if (!crudo) {
    throw new Error('Falta el secret FIREBASE_CUENTA_SERVICIO.');
  }

  let cuenta: Partial<CuentaDeServicio>;
  try {
    cuenta = JSON.parse(crudo) as Partial<CuentaDeServicio>;
  } catch {
    throw new Error('FIREBASE_CUENTA_SERVICIO no es un JSON válido. Pegá el archivo entero.');
  }

  if (!cuenta.client_email || !cuenta.private_key || !cuenta.project_id) {
    throw new Error(
      'FIREBASE_CUENTA_SERVICIO no tiene client_email, private_key y project_id. ' +
        'Tiene que ser el JSON que baja Firebase desde Cuentas de servicio.',
    );
  }

  return cuenta as CuentaDeServicio;
}
