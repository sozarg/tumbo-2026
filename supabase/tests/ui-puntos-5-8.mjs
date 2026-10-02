/**
 * Puntos 5 a 8 por pantalla: clientes registrados que esperan aprobación.
 *
 * - 5 y 6: dos clientes se registran (por la API de Auth, igual que la
 *   aplicación: en el navegador la foto solo se saca con la cámara del
 *   teléfono) y queda encolada la push a gerencia por cada uno.
 * - 6: el dueño los ve en «Clientes pendientes» con nombre y foto.
 * - 7: rechaza a uno escribiendo el motivo; se encola el correo y, al
 *   intentar entrar, ese cliente ve el motivo.
 * - 8: aprueba al otro; se encola el correo y ese cliente entra.
 *
 * SOLO CONTRA EL SUPABASE LOCAL, con la misma guarda que los otros E2E.
 * Vault apunta a un puerto cerrado: nada sale de la máquina. Borra los
 * clientes y los secretos al terminar.
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const entorno = readFileSync('src/environments/environment.local.ts', 'utf8');
const url = /supabaseUrl:\s*'([^']+)'/.exec(entorno)?.[1] ?? '';
const anon = /supabaseAnonKey:\s*'([^']+)'/.exec(entorno)?.[1] ?? '';
if (!/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(url)) {
  throw Error(
    `environment.local.ts no apunta al Supabase local (${url}). No se corre contra otra base.`,
  );
}
const APP = process.env.TUMBO_APP ?? 'http://127.0.0.1:4321';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(APP))
  throw Error('La aplicación tiene que ser local.');

/** SQL contra la base LOCAL (puerto 54322 del Docker). */
const sql = (consulta) =>
  execFileSync(
    'psql',
    [
      '-h',
      '127.0.0.1',
      '-p',
      '54322',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-Atqc',
      consulta,
    ],
    { env: { ...process.env, PGPASSWORD: 'postgres' }, encoding: 'utf8' },
  ).trim();

const sufijo = Date.now() % 1000000;
const RITA = {
  correo: `rita.${sufijo}@prueba.test`,
  nombres: 'Rita',
  apellidos: 'Rechazada',
  dni: '30222111',
};
const PABLO = {
  correo: `pablo.${sufijo}@prueba.test`,
  nombres: 'Pablo',
  apellidos: 'Aprobado',
  dni: '30222112',
};
const CLAVE = 'ClaveLocal2026';
const correos = `('${RITA.correo}', '${PABLO.correo}')`;

const limpiar = () =>
  sql(`delete from auth.users where email in ${correos};
       delete from vault.secrets where name in ('tumbo_url_funciones', 'tumbo_firma_webhook');`);
limpiar();
// Vault apunta a las funciones LOCALES (`npx supabase functions serve`
// con TUMBO_FIRMA_WEBHOOK=firma-solo-local): el aviso hace el viaje
// completo trigger → pg_net → función, y lo que respondió la función
// queda en net._http_response. Sin teléfonos registrados ni clave de
// Brevo, nada sale de la máquina.
sql(`select vault.create_secret('http://kong:8000/functions/v1', 'tumbo_url_funciones');
     select vault.create_secret('firma-solo-local', 'tumbo_firma_webhook');`);
const marca = Number(
  sql(`select greatest(coalesce((select max(id) from net._http_response), 0),
                       coalesce((select max(id) from net.http_request_queue), 0))`),
);
/** Respuestas de las funciones, desde el inicio de la prueba, que contienen el texto. */
const respuestas = (texto) =>
  Number(
    sql(`select count(*) from net._http_response
          where id > ${marca} and content like '%${texto}%'`),
  );
// avisar-push con gerencia sin teléfonos registrados.
const PUSH = 'los destinatarios no tienen dispositivos registrados';
// avisar-cliente llegó hasta el envío: pasó firma, estado y perfil.
const CORREO = 'Faltan BREVO_API_KEY o REMITENTE_CORREO.';

const resultados = [];
const ok = (nombre, valor) => {
  resultados.push({ nombre, ok: !!valor });
  console.log(`${valor ? 'ok  ' : 'MAL '} ${nombre}`);
  assert.ok(valor, nombre);
};
async function esperar(nombre, condicion, ms = 12000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    try {
      if (await condicion()) return ok(nombre, true);
    } catch {
      // Una recarga en vivo puede cambiar la pantalla a mitad de la lectura.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  ok(nombre, false);
}
const confirmar = (page) => page.getByRole('button', { name: 'Confirmar', exact: true }).click();

async function registrar(persona) {
  const r = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: anon, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: persona.correo,
      password: CLAVE,
      data: {
        nombres: persona.nombres,
        apellidos: persona.apellidos,
        dni: persona.dni,
        foto_url: `${url}/storage/v1/object/public/fotos-usuarios/prueba/${persona.dni}.jpg`,
      },
    }),
  });
  return r.status;
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function ingresar(correo, clave = 'Tumbo2026') {
  const page = await (
    await browser.newContext({ viewport: { width: 360, height: 780 } })
  ).newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${APP}/ingreso`);
  await page.locator('#correo input').fill(correo);
  await page.locator('#clave input').fill(clave);
  await page.locator('.login-card__submit').click();
  return page;
}

try {
  // ── 5 y 6: registro y push a gerencia ─────────────────────────────
  ok('5 · Rita se registra', (await registrar(RITA)) === 200);
  ok('5 · Pablo se registra', (await registrar(PABLO)) === 200);
  ok(
    '5 · base: los dos quedan como clientes registrados pendientes, con DNI y foto',
    sql(`select string_agg(perfil || ' ' || estado || ' ' || dni || ' ' || (foto_url is not null), ',' order by nombres)
           from usuarios where correo in ${correos}`) ===
      'cliente_registrado pendiente 30222112 true,cliente_registrado pendiente 30222111 true',
  );
  await esperar(
    '6 · cada registro llegó a avisar-push, que buscó los teléfonos de gerencia',
    async () => respuestas(PUSH) === 2,
  );
  const pendiente = await ingresar(PABLO.correo, CLAVE);
  await esperar('5 · un cliente pendiente no puede entrar y lo explica', async () =>
    (await pendiente.locator('body').innerText()).includes(
      'Tu cuenta todavía está pendiente de aprobación.',
    ),
  );

  // ── 6: el dueño los ve ────────────────────────────────────────────
  const dueno = await ingresar('mateo@tumbo.demo');
  await dueno.waitForURL('**/operacion');
  await dueno
    .getByRole('button', { name: /^Clientes(,|$)/ })
    .first()
    .click();
  const fila = (persona) =>
    dueno.locator('.client-entry', { hasText: `${persona.nombres} ${persona.apellidos}` });
  await esperar(
    '6 · el dueño ve a los dos pendientes con su foto',
    async () =>
      (await fila(RITA).count()) === 1 &&
      (await fila(PABLO).count()) === 1 &&
      (await fila(RITA).locator('img').count()) === 1,
  );

  // ── 7: rechazo con motivo ─────────────────────────────────────────
  await fila(RITA).getByRole('button', { name: 'Rechazar', exact: true }).click();
  await fila(RITA).locator('ion-textarea textarea').fill('No pudimos verificar tu DNI');
  await fila(RITA).getByRole('button', { name: 'Confirmar rechazo' }).click();
  await confirmar(dueno);
  await esperar(
    '7 · base: rechazada con el motivo, y el aviso llegó a avisar-cliente',
    async () =>
      sql(
        `select estado || '|' || motivo_rechazo from usuarios where correo = '${RITA.correo}'`,
      ) === 'rechazado|No pudimos verificar tu DNI' && respuestas(CORREO) === 1,
  );

  // ── 8: aprobación ─────────────────────────────────────────────────
  await fila(PABLO).getByRole('button', { name: 'Aprobar' }).click();
  await confirmar(dueno);
  await esperar(
    '8 · base: aprobado, y el aviso llegó a avisar-cliente',
    async () =>
      sql(`select estado from usuarios where correo = '${PABLO.correo}'`) === 'aprobado' &&
      respuestas(CORREO) === 2,
  );
  await esperar(
    '6 · la lista de pendientes queda vacía de ellos',
    async () => (await fila(RITA).count()) + (await fila(PABLO).count()) === 0,
  );

  // ── Lo que ve cada uno al entrar ──────────────────────────────────
  const aprobado = await ingresar(PABLO.correo, CLAVE);
  await esperar('8 · el cliente aprobado entra a la aplicación', async () =>
    aprobado.url().includes('/operacion'),
  );
  const rechazada = await ingresar(RITA.correo, CLAVE);
  await esperar('7 · la clienta rechazada no entra y ve el motivo', async () =>
    (await rechazada.locator('body').innerText()).includes(
      'Tu registro fue rechazado. Motivo: No pudimos verificar tu DNI',
    ),
  );
} finally {
  await browser.close();
  limpiar();
}

const fallidos = resultados.filter((r) => !r.ok);
console.log(
  `\n${resultados.length - fallidos.length}/${resultados.length} comprobaciones correctas.`,
);
process.exitCode = fallidos.length ? 1 : 0;
