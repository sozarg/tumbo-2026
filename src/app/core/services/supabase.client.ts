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
