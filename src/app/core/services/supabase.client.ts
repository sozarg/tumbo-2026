import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Database } from '../models/base-de-datos';
import { almacenamientoSesion } from './almacenamiento-sesion';

/**
 * Cliente único de Supabase, tipado con el esquema real de la base.
 *
 * Es `null` mientras el proyecto de Supabase no esté configurado. Eso
 * es lo que le permite a app.config.ts elegir el adaptador mock sin que
 * la aplicación se rompa, y lo que deja al equipo trabajar en las
 * pantallas antes de que la base exista.
 *
 * Nunca se importa desde un componente: siempre a través de un servicio
 * de core. Así, si mañana hay que cambiar de proveedor, el cambio queda
 * contenido en esta carpeta.
 */
export const supabaseConfigurado: boolean = Boolean(
  environment.supabaseUrl && environment.supabaseAnonKey,
);

export const supabaseClient: SupabaseClient<Database> | null = supabaseConfigurado
  ? createClient<Database>(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        storage: almacenamientoSesion,
        persistSession: true,
        autoRefreshToken: true,
        // En Capacitor la aplicación no se abre desde una URL con el
        // token en el fragmento, y dejarlo activado hace que el cliente
        // intente leer `window.location` en contextos donde no aplica.
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Un cliente aparte, que no guarda ninguna sesión.
 *
 * ───────────────────────────────────────────────────────────────────
 * PARA QUÉ EXISTE
 *
 * `signUp` no solo crea la cuenta: deja logueado al usuario recién
 * creado. En el cliente de arriba eso escribiría la sesión nueva encima
 * de la que estuviera guardada, así que el metre que da de alta a un
 * cliente —«Perfiles: cliente o metre», dice el punto 5— terminaría
 * adentro de la aplicación como ese cliente, y sin poder volver.
 *
 * Con `persistSession: false` la sesión del alta vive solo en memoria,
 * dentro de este objeto, y se va con él. Alcanza para subir la foto, que
 * es lo único que necesita estar autenticado, y no toca el
 * almacenamiento donde vive la sesión de quien está operando.
 *
 * `storageKey` propio además evita el aviso de «Multiple GoTrueClient
 * instances» que sale cuando dos clientes comparten la misma clave.
 */
export function clienteAislado(): SupabaseClient<Database> {
  return createClient<Database>(environment.supabaseUrl, environment.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'tumbo-alta-aislada',
    },
  });
}

/**
 * Devuelve el cliente o falla con un mensaje que se puede mostrar.
 * Evita repetir la misma comprobación en cada servicio y garantiza que
 * el error que llega a la pantalla esté en español.
 */
export function exigirCliente(): SupabaseClient<Database> {
  if (!supabaseClient) {
    throw new Error(
      'Supabase todavía no está configurado en esta copia del proyecto. ' +
        'Completá src/environments/environment.local.ts siguiendo supabase/README.md.',
    );
  }
  return supabaseClient;
}
