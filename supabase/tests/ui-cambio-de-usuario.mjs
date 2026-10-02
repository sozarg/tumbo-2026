/**
 * Dos clientes en el mismo teléfono, uno después del otro.
 *
 * El teléfono del restaurante pasa de mano en mano. Camila deja algo en
 * el carrito, tiene un pedido confirmado y cierra sesión; entra otro
 * cliente sin pedido. No tiene que ver nada de Camila: ni el carrito,
 * ni el pedido, ni los juegos desbloqueados.
 *
 * SOLO CONTRA EL SUPABASE LOCAL, con la misma guarda que los otros E2E.
 * Prepara sus propias estadías (y una clave conocida para un cliente del
 * historial, solo en la base local) y las borra al terminar.
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const entorno = readFileSync('src/environments/environment.local.ts', 'utf8');
const url = /supabaseUrl:\s*'([^']+)'/.exec(entorno)?.[1] ?? '';
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

const S2 = 'dddddddd-0000-4000-8000-000000000002';
const S3 = 'dddddddd-0000-4000-8000-000000000003';
const limpiar = () =>
  sql(`select set_config('tumbo.sin_avisos', 'si', false);
    delete from pedidos where sesion_mesa_id in ('${S2}', '${S3}');
    delete from sesiones_mesa where id in ('${S2}', '${S3}');
    update mesas set estado = 'libre' where numero in (2, 3);`);

limpiar();
sql(`select set_config('tumbo.sin_avisos', 'si', false);
  update auth.users set encrypted_password = extensions.crypt('Tumbo2026', extensions.gen_salt('bf'))
   where email = 'historico1@tumbo.demo';
  update sesiones_mesa set estado = 'cerrada', cerrada_en = now()
   where estado <> 'cerrada' and cliente_id in (select id from usuarios where correo in ('camila@tumbo.demo', 'historico1@tumbo.demo'));
  insert into sesiones_mesa (id, mesa_id, cliente_id)
    select '${S2}', m.id, u.id from mesas m, usuarios u where m.numero = 2 and u.correo = 'camila@tumbo.demo';
  insert into sesiones_mesa (id, mesa_id, cliente_id)
    select '${S3}', m.id, u.id from mesas m, usuarios u where m.numero = 3 and u.correo = 'historico1@tumbo.demo';
  insert into pedidos (sesion_mesa_id, estado, enviado_en, confirmado_en)
    values ('${S2}', 'confirmado', now(), now());
  insert into pedido_items (pedido_id, producto_id, cantidad)
    select (select id from pedidos where sesion_mesa_id = '${S2}'), id, 1 from productos where nombre = 'Café espresso';`);

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
const textos = (page, selector) =>
  page.locator(selector).evaluateAll((els) =>
    els.map((e) => {
      const partes = [];
      const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) partes.push(w.currentNode.textContent);
      return partes.join(' ').replace(/\s+/g, ' ').trim();
    }),
  );
const abrir = (page, nombre) =>
  page
    .getByRole('button', { name: new RegExp(`^${nombre}(,|$)`) })
    .first()
    .click();
const volver = (page) =>
  page.getByRole('button', { name: 'Volver a las secciones', exact: true }).first().click();
/**
 * `recargar: false` entra desde la pantalla de ingreso que deja el cierre
 * de sesión, SIN recargar: así lo hace una persona, y es justamente lo
 * que deja vivo el estado de la aplicación entre un usuario y el otro.
 */
async function ingresar(page, correo, { recargar = true } = {}) {
  if (recargar) await page.goto(`${APP}/ingreso`);
  await page.locator('#correo input').fill(correo);
  await page.locator('#clave input').fill('Tumbo2026');
  await page.locator('.login-card__submit').click();
  await page.waitForURL('**/operacion');
}
/** El nombre accesible de un acceso del inicio: dice si tiene candado. */
const acceso = (page, titulo) =>
  page
    .getByRole('button', { name: new RegExp(`^${titulo}(,|$)`) })
    .first()
    .getAttribute('aria-label');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  // Un solo teléfono: el mismo contexto para los dos clientes.
  const page = await (
    await browser.newContext({ viewport: { width: 360, height: 780 } })
  ).newPage();
  page.setDefaultTimeout(15000);

  await ingresar(page, 'camila@tumbo.demo');
  // Marca en la ventana: si algo recarga la página, desaparece.
  await page.evaluate(() => (window.__mismaApp = true));
  await esperar(
    'Camila: con el pedido confirmado, los juegos están habilitados',
    async () => (await acceso(page, 'Juegos')) === 'Juegos',
  );
  await abrir(page, 'Menú');
  await page.locator('.product-card h2').first().waitFor();
  await page.locator('.product-card ion-button.quantity-button').last().click();
  await esperar(
    'Camila: deja un producto en el carrito sin enviar',
    async () => (await textos(page, '.cart-bar strong')).join() !== '$ 0',
  );
  await volver(page);
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await page.waitForURL('**/ingreso');

  ok(
    'el cierre de sesión vuelve al ingreso sin recargar la aplicación',
    await page.evaluate(() => window.__mismaApp === true),
  );
  await ingresar(page, 'historico1@tumbo.demo', { recargar: false });
  await esperar(
    'el cliente siguiente: los juegos de Camila no le quedan habilitados',
    async () => (await acceso(page, 'Juegos')) === 'Juegos, se habilita con tu pedido',
  );
  await abrir(page, 'Menú');
  await page.locator('.product-card h2').first().waitFor();
  await esperar(
    'el cliente siguiente: el carrito arranca vacío',
    async () =>
      (await textos(page, '.cart-bar strong')).join() === '$ 0' &&
      (await page.getByRole('button', { name: /Enviar\s+pedido/ }).isDisabled()),
  );
  await volver(page);
  await abrir(page, 'Pedidos');
  await esperar(
    'el cliente siguiente: no ve el pedido de la mesa 2',
    async () =>
      (await page.locator('.order-summary-card').count()) === 1 &&
      !(await textos(page, '.order-summary-card__caption')).includes('Mesa 2') &&
      !(await textos(page, '.status-pill')).join().includes('Confirmado'),
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
