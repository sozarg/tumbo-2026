#!/usr/bin/env node
/**
 * Genera src/environments/environment.ts a partir de variables de entorno.
 *
 * PARA QUÉ SIRVE
 * Angular compila la configuración adentro del paquete: no puede leer
 * variables de entorno en el navegador. Por eso hace falta escribir el
 * archivo antes de compilar.
 *
 * Se usa en el build de Vercel, donde las variables se cargan en
 * Project Settings › Environment Variables. Así el deploy apunta a
 * Supabase sin que las credenciales estén versionadas en el repositorio,
 * que es lo que exige el AGENTS.md del proyecto.
 *
 * QUÉ NO ES
 * Esto NO vuelve secreta la clave. TUMBO es una aplicación de navegador:
 * cualquier valor que use termina dentro del JavaScript que se descarga
 * el usuario. La clave publishable está pensada para ser pública y lo que
 * protege los datos es RLS. Lo que se gana acá es mantener la clave fuera
 * del historial de git y poder rotarla sin reescribir commits.
 *
 * CUÁNDO ESCRIBE
 * Solo cuando corre en un entorno de build automático (Vercel o CI) o
 * cuando se le pasa --forzar. La razón es evitar que a alguien que tenga
 * esas variables en su terminal se le ensucie un archivo versionado sin
 * darse cuenta.
 *
 * Si no hay variables, no hace nada y la aplicación queda en modo
 * demostración. Eso es a propósito: quien clona el repositorio puede
 * levantarla sin configurar nada.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'src', 'environments', 'environment.ts');

const url = (process.env.SUPABASE_URL ?? '').trim();
const clave = (process.env.SUPABASE_ANON_KEY ?? '').trim();
const claveDemo = (process.env.TUMBO_CLAVE_DEMO ?? '').trim() || 'Tumbo2026';

const automatico = Boolean(process.env.VERCEL || process.env.CI);
const forzado = process.argv.includes('--forzar');

if (!url || !clave) {
  console.log(
    '[entorno] Sin SUPABASE_URL ni SUPABASE_ANON_KEY: se deja el archivo como está ' +
      '(la aplicación arranca en modo demostración).',
  );
  process.exit(0);
}

if (!automatico && !forzado) {
  console.log(
    '[entorno] Hay variables de Supabase definidas, pero esto no es un build\n' +
      '          automático. No se toca environment.ts para no ensuciar un\n' +
      '          archivo versionado.\n\n' +
      '          Para trabajar contra Supabase en tu máquina, usá\n' +
      '          environment.local.ts y "npm run start:local".\n' +
      '          Si de verdad querés generarlo acá: node tools/generar-entorno.mjs --forzar',
  );
  process.exit(0);
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
  console.error(
    `[entorno] SUPABASE_URL no tiene la forma esperada: ${url}\n` +
      '          Se espera algo como https://tu-proyecto.supabase.co',
  );
  process.exit(1);
}

// Aviso temprano si cargaron la clave equivocada: la secret NO va acá.
if (clave.startsWith('sb_secret_') || clave.includes('service_role')) {
  console.error(
    '[entorno] La clave cargada parece ser la SECRET / service_role.\n' +
      '          Esa clave salta todas las políticas de seguridad y nunca debe\n' +
      '          viajar dentro de la aplicación. Cargá la publishable / anon.',
  );
  process.exit(1);
}

const contenido = `import { Entorno } from './entorno';

// ARCHIVO GENERADO por tools/generar-entorno.mjs durante el build.
// No editar a mano ni commitear el resultado: en el repositorio este
// archivo va siempre con los valores vacíos.
export const environment: Entorno = {
  production: true,
  supabaseUrl: '${url.replace(/\/$/, '')}',
  supabaseAnonKey: '${clave}',
  claveDemostracion: '${claveDemo}',
};
`;

writeFileSync(DESTINO, contenido, 'utf8');

console.log(
  `[entorno] environment.ts generado apuntando a ${url}\n` +
    `          clave: ${clave.slice(0, 12)}… (${clave.length} caracteres)`,
);
