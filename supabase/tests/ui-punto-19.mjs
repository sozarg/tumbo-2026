/**
 * Punto 19 de punta a punta: el mozo entrega y el cliente confirma.
 *
 * SOLO CONTRA EL SUPABASE LOCAL, con la misma guarda que
 * `ui-puntos-16-18.mjs`. Necesita la base local preparada como ese
 * script (cuentas de demostración y el pedido de la mesa 2 de Camila),
 * con el pedido de la mesa 2 ya LISTO.
 *
 * Qué comprueba:
 * - El mozo ve lo que lleva por tipo y marca entregado ESE pedido.
 * - El cliente ve «Entregado» sin recargar y confirma la recepción.
 * - Antes de confirmar, encuesta y cuenta están bloqueadas (con candado
 *   en el inicio); después se habilitan.
 * - La base guarda la entrega y la recepción con su hora.
 * - Sin desplazamiento horizontal en 320 a 768 px y sin violaciones de axe.
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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
const salida = process.env.TUMBO_CAPTURAS ?? 'capturas-19';
mkdirSync(salida, { recursive: true });

/** Consulta de solo lectura a la base LOCAL (puerto 54322 de Docker). */
const consultar = (sql) =>
  execFileSync(
    'psql',
    ['-h', '127.0.0.1', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-Atc', sql],
    {
      env: { ...process.env, PGPASSWORD: 'postgres' },
      encoding: 'utf8',
    },
  ).trim();

const resultados = [];
const ok = (nombre, valor) => {
  resultados.push({ nombre, ok: !!valor });
  console.log(`${valor ? 'ok  ' : 'MAL '} ${nombre}`);
  assert.ok(valor, nombre);
};
async function esperar(nombre, condicion, ms = 10000) {
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

const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function ingresar(correo) {
  const page = await (
    await browser.newContext({ viewport: { width: 360, height: 780 } })
  ).newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${APP}/ingreso`);
  await page.locator('#correo input').fill(correo);
  await page.locator('#clave input').fill('Tumbo2026');
  await page.locator('.login-card__submit').click();
  await page.waitForURL('**/operacion');
  return page;
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
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok(`${nombre} ${ancho}px sin desplazamiento horizontal`, !desborde);
    await page.screenshot({ path: path.join(salida, `${nombre}-${ancho}.png`) });
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
const volverAlInicio = (page) =>
  page.getByRole('button', { name: 'Volver a las secciones', exact: true }).first().click();

try {
  const [mozo, cliente] = await Promise.all([
    ingresar('matias@tumbo.demo'),
    ingresar('camila@tumbo.demo'),
  ]);

  // ── El cliente, antes de la entrega ──────────────────────────────
  await esperar('cliente: encuesta y cuenta con candado en el inicio', async () => {
    const bloqueadas = await cliente
      .locator('.dashboard-action--bloqueada')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    return (
      bloqueadas.includes('Encuesta, se habilita con tu pedido') &&
      bloqueadas.includes('Cuenta, se habilita con tu pedido')
    );
  });
  await cliente.getByRole('button', { name: 'Encuesta, se habilita con tu pedido' }).click();
  await esperar('cliente: la encuesta explica que se habilita con el pedido', async () =>
    (await textos(cliente, '.locked-card strong')).includes(
      'La encuesta se habilita con tu pedido',
    ),
  );
  await revisarPantalla(cliente, 'encuesta-bloqueada');
  await volverAlInicio(cliente);
  await cliente.getByRole('button', { name: 'Pedidos', exact: true }).first().click();
  await cliente.locator('.order-summary-card').waitFor();

  // ── El mozo entrega ──────────────────────────────────────────────
  await mozo.getByRole('button', { name: 'Pedidos', exact: true }).first().click();
  const avance = mozo.locator('tumbo-avance-pedidos');
  await avance.waitFor();
  /**
   * Recorre las páginas del avance hasta la mesa 2. Después de cada clic
   * espera a que el contador «N de M» cambie: Angular redibuja de forma
   * asíncrona, y leer el título enseguida devuelve el de la página
   * anterior y hace pasarse de largo.
   */
  const contador = () => textos(mozo, 'tumbo-avance-pedidos tumbo-paginador span');
  const paginar = async (nombre) => {
    const boton = avance.getByRole('button', { name: nombre });
    if (!(await boton.count()) || !(await boton.isEnabled())) return false;
    const antes = (await contador()).join();
    await boton.click({ timeout: 2000 });
    await mozo.waitForFunction(
      (previo) =>
        [...document.querySelectorAll('tumbo-avance-pedidos tumbo-paginador span')]
          .map((e) => e.textContent.trim())
          .join() !== previo,
      antes,
      { timeout: 2000 },
    );
    return true;
  };
  const irAMesa2 = async () => {
    while (await paginar('Elementos anteriores'));
    for (let i = 0; i < 5; i++) {
      if ((await textos(mozo, 'tumbo-avance-pedidos h3')).join() === 'Mesa 2') return true;
      if (!(await paginar('Elementos siguientes'))) return false;
    }
    return false;
  };
  await esperar(
    'mozo: la mesa 2 está lista para entregar',
    async () =>
      (await irAMesa2()) &&
      (await textos(mozo, '.avance__aviso')).includes('Pedido completo: listo para entregar.'),
  );
  await esperar(
    'mozo: ve lo que lleva por tipo, con los postres aparte',
    async () =>
      (await irAMesa2()) &&
      (await textos(mozo, '.avance__entrega h4')).join() === 'Bebidas,Postres' &&
      (await textos(mozo, '.avance__entrega li')).join() ===
        'Café espresso 2 ×,Helado artesanal 1 ×',
  );
  await revisarPantalla(mozo, 'mozo-entrega');
  await esperar('mozo: vuelve a la mesa 2 para entregar', irAMesa2);
  await avance.getByRole('button', { name: 'Marcar entregado' }).click();
  await mozo.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await esperar(
    'mozo: queda esperando la confirmación del cliente',
    async () =>
      (await irAMesa2()) &&
      (await textos(mozo, '.avance__espera')).includes(
        'Entregado. Esperando que el cliente confirme la recepción.',
      ),
  );
  ok(
    'base: el pedido quedó entregado con hora',
    consultar(
      "select estado || ',' || (entregado_en is not null) from pedidos where id='bbbbbbbb-0000-4000-8000-0000000000b1'",
    ) === 'entregado,true',
  );

  // ── El cliente confirma, sin recargar ────────────────────────────
  const confirmarRecepcion = cliente.getByRole('button', { name: 'Confirmar recepción' });
  await esperar(
    'cliente: ve el pedido entregado sin recargar',
    async () => await confirmarRecepcion.isEnabled(),
  );
  await revisarPantalla(cliente, 'cliente-entregado');
  await confirmarRecepcion.click();
  await cliente.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await esperar(
    'base: la recepción quedó guardada',
    async () =>
      consultar(
        "select recibido_en is not null from pedidos where id='bbbbbbbb-0000-4000-8000-0000000000b1'",
      ) === 't',
  );
  await esperar('mozo: el pedido recibido sale de su lista', async () => !(await irAMesa2()));

  // ── Se habilitan encuesta y cuenta ───────────────────────────────
  await volverAlInicio(cliente);
  await esperar(
    'cliente: sin candados en el inicio',
    async () => (await cliente.locator('.dashboard-action--bloqueada').count()) === 0,
  );
  await cliente.getByRole('button', { name: 'Encuesta', exact: true }).click();
  await esperar(
    'cliente: la encuesta se puede responder',
    async () => (await cliente.locator('tumbo-encuesta-form').count()) === 1,
  );
  await volverAlInicio(cliente);
  await cliente.getByRole('button', { name: 'Cuenta', exact: true }).click();
  await esperar(
    'cliente: puede pedir la cuenta',
    async () => (await cliente.getByRole('button', { name: 'Pedir la cuenta' }).count()) === 1,
  );
} finally {
  await browser.close();
}

const fallidos = resultados.filter((r) => !r.ok);
console.log(
  `\n${resultados.length - fallidos.length}/${resultados.length} comprobaciones correctas.`,
);
process.exitCode = fallidos.length ? 1 : 0;
