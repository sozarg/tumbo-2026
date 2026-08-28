/**
 * Forma de la configuración de entorno.
 *
 * Está en un archivo aparte para que environment.ts y
 * environment.local.ts declaren exactamente los mismos campos: si
 * alguien copia el ejemplo y se olvida uno, TypeScript lo marca en vez
 * de fallar recién en tiempo de ejecución.
 */
export interface Entorno {
  readonly production: boolean;

  /** URL del proyecto de Supabase. Vacía = la aplicación usa el mock. */
  readonly supabaseUrl: string;

  /**
   * Clave anónima pública del proyecto.
   *
   * Es pública por diseño: viaja en el paquete de la aplicación y
   * cualquiera puede leerla. Lo que protege los datos es RLS, no el
   * secreto de esta clave. La que NUNCA va acá ni en el repositorio es
   * la service_role.
   */
  readonly supabaseAnonKey: string;

  /**
   * Clave común de las cuentas de demostración, la que usan los botones
   * de acceso rápido. No es un secreto: son cuentas de prueba creadas
   * por el script de siembra y solo existen para la demostración.
   */
  readonly claveDemostracion: string;
}
