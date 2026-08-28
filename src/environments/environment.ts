import { Entorno } from './entorno';

/**
 * Configuración por defecto: modo demostración.
 *
 * Este archivo está versionado y va SIEMPRE con la URL y la clave
 * vacías, para que quien clone el repositorio pueda levantar la
 * aplicación sin configurar nada y para que nadie suba credenciales sin
 * querer.
 *
 * Para trabajar contra Supabase de verdad no se toca este archivo:
 * se copia environment.example.ts a environment.local.ts (que está en
 * .gitignore) y se arranca con  npm run start:local.
 */
export const environment: Entorno = {
  production: false,
  supabaseUrl: '',
  supabaseAnonKey: '',
  claveDemostracion: 'Tumbo2026',
};
