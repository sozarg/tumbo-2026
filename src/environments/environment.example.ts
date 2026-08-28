import { Entorno } from './entorno';

/**
 * Plantilla para trabajar contra Supabase.
 *
 * Copiala como environment.local.ts (ese nombre está en .gitignore) y
 * completá los dos valores que figuran en el panel del proyecto, en
 * Project Settings › API.
 *
 * Después, en lugar de  npm start,  arrancá con:
 *
 *     npm run start:local
 *
 * Los pasos completos están en supabase/README.md.
 */
export const environment: Entorno = {
  production: false,
  supabaseUrl: 'https://TU-PROYECTO.supabase.co',
  supabaseAnonKey: 'PEGAR_AQUI_LA_CLAVE_ANON_PUBLICA',
  claveDemostracion: 'Tumbito2026',
};
