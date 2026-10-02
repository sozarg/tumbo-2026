/**
 * Puntos 16, 17 y 18 de punta a punta, con cuatro teléfonos simulados.
 *
 * SOLO CONTRA EL SUPABASE LOCAL. Se niega a correr si
 * `environment.local.ts` apunta a otro lado: estas pruebas cambian
 * estados de pedidos, y en producción eso sería tocar datos reales.
 *
 * Preparación (todo local):
 *   npx supabase start
 *   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<local> npx -y node@22 supabase/crear-usuarios.mjs
 *   cargar pedidos confirmados en la base local (mesas 2 y 4)
 *   npx ng serve --configuration local --port 4321 --host 127.0.0.1
 *   node supabase/tests/ui-puntos-16-18.mjs
 *
 * Qué comprueba:
 * - Cocina y bar ven sus pedidos agrupados por mesa, la más vieja
 *   primero, con fecha, hora, nombre y cantidad.
 * - Lo que hace un sector le llega al cliente y al mozo SIN recargar
 *   (realtime).
 * - El mozo ve cada parte y el aviso de pedido completo.
 * - Sin desplazamiento horizontal en 320, 360, 390 y 768 px, y sin
 *   violaciones de axe (WCAG 2.2 AA).
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const axe = require.resolve('axe-core/axe.min.js');

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
const CLAVE = 'Tumbo2026';
const salida = process.env.TUMBO_CAPTURAS ?? 'capturas-16-18';
mkdirSync(salida, { recursive: true });

const resultados = [];
const ok = (nombre, valor) => {
  resultados.push({ nombre, ok: !!valor });
  console.log(`${valor ? 'ok  ' : 'MAL '} ${nombre}`);
  assert.ok(valor, nombre);
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function ingresar(correo, ancho = 360) {
  const ctx = await browser.newContext({ viewport: { width: ancho, height: 780 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${APP}/ingreso`);
  await page.locator('#correo input').fill(correo);
  await page.locator('#clave input').fill(CLAVE);
  await page.locator('.login-card__submit').click();
  await page.waitForURL('**/operacion');
  return page;
}

/** El texto de cada elemento, con un espacio entre sus partes. */
const textos = (page, selector) =>
  page.locator(selector).evaluateAll((els) =>
    els.map((e) => {
      const partes = [];
      const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) partes.push(w.currentNode.textContent);
      return partes.join(' ').replace(/\s+/g, ' ').trim();
    }),
  );

/** Espera a que la condición se cumpla sin recargar la página: eso es lo que prueba realtime. */
async function esperar(nombre, condicion, ms = 10000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (await condicion()) return ok(nombre, true);
    await new Promise((r) => setTimeout(r, 250));
  }
  ok(nombre, false);
}

/** Elige una mesa con su acceso y espera a que la tarjeta muestre esa mesa. */
async function elegirMesa(page, numero) {
  await page.getByRole('button', { name: `Mesa ${numero}`, exact: true }).click();
  await esperar(
    `${numero}: se muestra la mesa elegida`,
    async () => (await textos(page, '.mesa__numero')).join() === `Mesa ${numero}`,
  );
  return page.locator('article.mesa');
}

async function revisarPantalla(page, nombre) {
  for (const [ancho, alto] of [
    [320, 568],
    [360, 640],
    [390, 844],
    [768, 1024],
  ]) {
    await page.setViewportSize({ width: ancho, height: alto });
    await page.waitForTimeout(250);
    const desborde = await page.evaluate(() => {
      const fuera = [
        ...document.querySelectorAll(
          'tumbo-sector-pedidos *, tumbo-avance-pedidos *, .sector-progress *',
        ),
      ]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && (r.right > innerWidth + 0.5 || r.left < -0.5);
        })
        .map((e) => e.className || e.tagName);
      return { pagina: document.documentElement.scrollWidth > innerWidth, fuera };
    });
    ok(
      `${nombre} ${ancho}px sin desplazamiento horizontal`,
      !desborde.pagina && !desborde.fuera.length,
    );
    await page.screenshot({ path: path.join(salida, `${nombre}-${ancho}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addScriptTag({ path: axe });
  const violaciones = await page.evaluate(async () => {
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
    });
    return r.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
    );
  });
  if (violaciones.length) console.log(violaciones.join('\n'));
  ok(`${nombre} sin violaciones de axe`, violaciones.length === 0);
  await page.setViewportSize({ width: 360, height: 780 });
}

try {
  const [cocina, bar, mozo, cliente] = await Promise.all([
    ingresar('alicia@tumbo.demo'),
    ingresar('bruno@tumbo.demo'),
    ingresar('matias@tumbo.demo'),
    ingresar('camila@tumbo.demo'),
  ]);

  // ── Punto 16: cocina ──────────────────────────────────────────────
  await cocina.getByRole('button', { name: 'Cocina', exact: true }).first().click();
  await cocina.locator('tumbo-sector-pedidos').waitFor();
  await esperar(
    'cocina: mesas agrupadas, la más vieja primero',
    async () => (await textos(cocina, '.sector__mesas button')).join() === 'Mesa 4,Mesa 2',
  );
  ok('cocina: la mesa 4 muestra sus dos pedidos', (await cocina.locator('.pedido').count()) === 2);
  const fechas = await textos(cocina, '.pedido__fecha');
  ok(
    'cocina: fecha con hora y minutos',
    fechas.every((f) => /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(f)),
  );
  const itemsMesa4 = await textos(cocina, '.pedido__items li');
  ok(
    'cocina: nombre y cantidad de cada ítem',
    itemsMesa4.join() === '2 × Bife de chorizo,1 × Ensalada de estación,1 × Flan casero',
  );
  ok(
    'cocina: no ve bebidas',
    !(await cocina.locator('tumbo-sector-pedidos').innerText()).includes('Agua mineral'),
  );
  await revisarPantalla(cocina, 'cocina');

  // ── El cliente ve los cambios sin recargar ────────────────────────
  await cliente.getByRole('button', { name: 'Pedidos', exact: true }).first().click();
  await esperar(
    'cliente: ve cada sector pendiente',
    async () =>
      (await textos(cliente, '.sector-progress li')).join() === 'Cocina Pendiente,Bar Pendiente',
  );

  const mesa2 = await elegirMesa(cocina, 2);
  await mesa2.getByRole('button', { name: /Empezar a preparar/ }).click();
  await esperar('cliente: ve «Cocina en preparación» sin recargar', async () =>
    (await textos(cliente, '.sector-progress li')).includes('Cocina En preparación'),
  );

  await mesa2.getByRole('button', { name: /Marcar listo/ }).click();
  await cocina.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await esperar('cocina: la mesa 2 sale del listado al marcarla lista', async () =>
    (await textos(cocina, '.sector__mesas button, .mesa__numero')).every((t) => t !== 'Mesa 2'),
  );
  await esperar('cliente: ve «Cocina listo» sin recargar', async () =>
    (await textos(cliente, '.sector-progress li')).includes('Cocina Listo'),
  );
  await revisarPantalla(cliente, 'cliente');

  // ── Punto 18: el mozo ve cada parte ───────────────────────────────
  await mozo.getByRole('button', { name: 'Pedidos', exact: true }).first().click();
  await mozo.locator('tumbo-avance-pedidos').waitFor();
  /**
   * Recorre las páginas del avance, desde la primera, hasta encontrar la
   * mesa 2. Si una recarga en vivo cambia los botones a mitad de camino,
   * devuelve `false` y `esperar` lo vuelve a intentar.
   */
  const irAMesa2 = async () => {
    try {
      const avance = mozo.locator('tumbo-avance-pedidos');
      const anterior = avance.getByRole('button', { name: 'Elementos anteriores' });
      while ((await anterior.count()) && (await anterior.isEnabled()))
        await anterior.click({ timeout: 2000 });
      for (let i = 0; i < 5; i++) {
        if ((await textos(mozo, 'tumbo-avance-pedidos h3')).join() === 'Mesa 2') return true;
        const siguiente = avance.getByRole('button', { name: 'Elementos siguientes' });
        if (!(await siguiente.count()) || !(await siguiente.isEnabled())) return false;
        await siguiente.click({ timeout: 2000 });
      }
    } catch {
      return false;
    }
    return false;
  };
  await esperar(
    'mozo: ve la parte de cocina lista y la de bar pendiente',
    async () =>
      (await irAMesa2()) &&
      (await textos(mozo, 'tumbo-avance-pedidos li')).join() === 'Cocina Listo,Bar Pendiente',
  );
  ok(
    'mozo: todavía no hay aviso de completo',
    (await mozo.locator('.avance__aviso').count()) === 0,
  );

  // ── Punto 17: bar ─────────────────────────────────────────────────
  await bar.getByRole('button', { name: 'Barra', exact: true }).first().click();
  await bar.locator('tumbo-sector-pedidos').waitFor();
  await esperar(
    'bar: ve las dos mesas con bebidas',
    async () => (await textos(bar, '.sector__mesas button')).join() === 'Mesa 4,Mesa 2',
  );
  ok(
    'bar: no ve platos',
    !(await bar.locator('tumbo-sector-pedidos').innerText()).includes('Bife'),
  );
  await revisarPantalla(bar, 'bar');
  const mesa2Bar = await elegirMesa(bar, 2);
  ok(
    'bar: ítems de la mesa 2',
    (await textos(bar, '.pedido__items li')).join() === '2 × Café espresso',
  );
  await mesa2Bar.getByRole('button', { name: /Marcar listo/ }).click();
  await bar.getByRole('button', { name: 'Confirmar', exact: true }).click();

  await esperar(
    'mozo: recibe «pedido completo» sin recargar',
    async () =>
      (await irAMesa2()) &&
      (await textos(mozo, '.avance__aviso')).includes('Pedido completo: listo para entregar.'),
  );
  await esperar(
    'cliente: el pedido figura listo',
    async () => (await textos(cliente, '.sector-progress li')).join() === 'Cocina Listo,Bar Listo',
  );
  await revisarPantalla(mozo, 'mozo');
} finally {
  await browser.close();
}

const fallidos = resultados.filter((r) => !r.ok);
console.log(
  `\n${resultados.length - fallidos.length}/${resultados.length} comprobaciones correctas.`,
);
process.exitCode = fallidos.length ? 1 : 0;
