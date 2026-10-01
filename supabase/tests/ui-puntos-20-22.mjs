/**
 * Puntos 20, 21 y 22 de punta a punta: encuesta, cuenta, pago y mesa libre.
 *
 * SOLO CONTRA EL SUPABASE LOCAL, con la misma guarda que los otros E2E.
 * Necesita la base local con el historial (`seed_data/historico.sql`),
 * las cuentas de demostración y a Camila en la mesa 2 con el pedido ya
 * recibido.
 *
 * En el navegador el lector de QR pide el contenido con un cuadro de
 * texto; acá se completa con lo que diría cada cartel.
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
const salida = process.env.TUMBO_CAPTURAS ?? 'capturas-20-22';
mkdirSync(salida, { recursive: true });

/** Consulta de solo lectura a la base LOCAL. */
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
const abrir = (page, nombre) =>
  page.getByRole('button', { name: nombre, exact: true }).first().click();
const confirmarDialogo = (page) =>
  page.getByRole('button', { name: 'Confirmar', exact: true }).click();

/** Lo que el lector «lee» la próxima vez que se abra en este teléfono. */
function prepararLectura(page) {
  const pendiente = { valor: '' };
  page.on('dialog', (dialogo) => void dialogo.accept(pendiente.valor));
  return (contenido) => {
    pendiente.valor = contenido;
  };
}

try {
  const [cliente, mozo] = await Promise.all([
    ingresar('camila@tumbo.demo'),
    ingresar('matias@tumbo.demo'),
  ]);
  const leerEnCliente = prepararLectura(cliente);
  const sesion = 'aaaaaaaa-0000-4000-8000-000000000002';

  // ── Punto 20: la encuesta, con las preguntas de la base ───────────
  await abrir(cliente, 'Encuesta');
  await esperar(
    'encuesta: arranca en la pregunta 1 de 7',
    async () => (await textos(cliente, '.encuesta__progreso')).join() === 'Pregunta 1 de 7',
  );
  const siguiente = () => cliente.locator('tumbo-encuesta-form ion-button.siguiente').click();
  await siguiente();
  await esperar(
    'encuesta: no avanza sin responder una obligatoria',
    async () =>
      (await textos(cliente, '.encuesta__error')).join() === 'Esta pregunta es obligatoria.',
  );
  await revisarPantalla(cliente, 'encuesta');
  /** Avanza y espera a que el contador muestre la pregunta siguiente. */
  const pasarA = async (numero) => {
    await siguiente();
    await esperar(
      `encuesta: pasa a la pregunta ${numero}`,
      async () =>
        (await textos(cliente, '.encuesta__progreso')).join() === `Pregunta ${numero} de 7`,
    );
  };
  await cliente.getByRole('radio', { name: '5 estrellas' }).click();
  await pasarA(2);
  await cliente.getByRole('radio', { name: 'Rápido', exact: true }).click();
  await pasarA(3);
  await cliente.getByRole('checkbox', { name: 'La comida', exact: true }).click();
  await cliente.getByRole('checkbox', { name: 'El ambiente', exact: true }).click();
  await pasarA(4);
  await cliente.locator('tumbo-encuesta-form ion-select').click();
  await cliente.locator('ion-select-popover ion-radio', { hasText: 'Redes sociales' }).click();
  await esperar(
    'encuesta: el select muestra la opción elegida',
    async () =>
      (await cliente.locator('tumbo-encuesta-form ion-select').evaluate((e) => e.value)) ===
      'Redes sociales',
  );
  await pasarA(5);
  ok(
    'encuesta: el rango arranca con un valor',
    (await textos(cliente, '.encuesta__valor')).join() === 'Elegiste: 6',
  );
  await pasarA(6);
  await pasarA(7);
  await cliente.locator('tumbo-encuesta-form ion-textarea textarea').fill('Todo muy rico.');
  await siguiente();
  await esperar('encuesta: se guarda y agradece', async () =>
    (await textos(cliente, '.locked-card strong')).includes('¡Gracias por responder!'),
  );
  ok(
    'base: la encuesta quedó con sus 7 respuestas',
    consultar(
      `select count(*) from respuestas_encuesta r join encuestas e on e.id = r.encuesta_id where e.sesion_mesa_id = '${sesion}'`,
    ) === '7',
  );
  await volverAlInicio(cliente);

  // ── Punto 21: pedir la cuenta ────────────────────────────────────
  await abrir(mozo, 'Cuenta');
  await mozo.locator('tumbo-cobros').waitFor();
  await abrir(cliente, 'Cuenta');
  await cliente.getByRole('button', { name: 'Pedir la cuenta' }).click();
  await esperar('cliente: la cuenta queda pedida', async () =>
    (await textos(cliente, 'tumbo-cuenta-cliente .aviso strong')).includes(
      'El mozo ya sabe que pediste la cuenta',
    ),
  );
  await esperar(
    'mozo: ve sin recargar que la mesa 2 pidió la cuenta',
    async () =>
      (await textos(mozo, '.cobro h3')).includes('Mesa 2') &&
      (await textos(mozo, '.cobro__estado')).includes('Pidió la cuenta'),
  );

  // ── Punto 21: propina por QR ─────────────────────────────────────
  leerEnCliente('TUMBO://mesa/tumbo-mesa-2');
  await cliente.getByRole('button', { name: 'Escanear QR de propina' }).click();
  await esperar('cliente: un QR que no es de propina se rechaza', async () =>
    (
      await cliente.locator('ion-toast').evaluateAll((ts) => ts.map((t) => String(t.message ?? '')))
    ).some((m) => m.includes('no es un QR de propina')),
  );
  leerEnCliente('TUMBO://propina/15');
  await cliente.getByRole('button', { name: 'Escanear QR de propina' }).click();
  await esperar(
    'cliente: ve el detalle con el total grande',
    async () => (await cliente.locator('.total strong').count()) === 1,
  );
  ok(
    'cliente: el detalle tiene precios unitarios e importes',
    (await textos(cliente, '.detalle li')).join(' | ') ===
      '2 × Bife de chorizo $ 18.500 c/u $ 37.000 | 1 × Café espresso $ 3.200 c/u $ 3.200 | Subtotal $ 40.200 | Propina 15 % · Muy bueno $ 6.030',
  );
  ok(
    'cliente: total = subtotal + 15 %',
    (await textos(cliente, '.total strong')).join() === '$ 46.230',
  );
  ok(
    'base: la cuenta la calculó la base',
    consultar(
      `select subtotal || '|' || propina_pct || '|' || total from cuentas where sesion_mesa_id = '${sesion}'`,
    ) === '40200.00|15.00|46230.00',
  );
  await revisarPantalla(cliente, 'cuenta-detalle');

  // ── Punto 21: pago ───────────────────────────────────────────────
  await cliente.getByRole('button', { name: /^Pagar/ }).click();
  await confirmarDialogo(cliente);
  await esperar('cliente: queda esperando al mozo', async () =>
    (await textos(cliente, 'tumbo-cuenta-cliente .aviso p')).includes(
      'Pago realizado. Esperá a que el mozo lo confirme.',
    ),
  );
  await esperar('mozo: ve el pago sin recargar', async () =>
    (await textos(mozo, '.cobro__estado')).includes('Pagó: falta confirmar'),
  );
  await revisarPantalla(mozo, 'cobros');

  // ── Punto 22: el mozo confirma y la mesa queda libre ─────────────
  await mozo.getByRole('button', { name: 'Confirmar pago y liberar la mesa' }).click();
  await confirmarDialogo(mozo);
  await esperar(
    'mozo: la cuenta sale de la lista',
    async () => (await mozo.locator('.cobros__vacio').count()) === 1,
  );
  ok(
    'base: estadía cerrada, mesa libre, pedido pagado y espera finalizada',
    consultar(`select
      (select estado from cuentas where sesion_mesa_id = '${sesion}') || '|' ||
      (select estado from sesiones_mesa where id = '${sesion}') || '|' ||
      (select estado from mesas where numero = 2) || '|' ||
      (select estado from pedidos where id = 'bbbbbbbb-0000-4000-8000-0000000000b1') || '|' ||
      (select estado from lista_espera where cliente_id = (select id from usuarios where correo = 'camila@tumbo.demo'))`) ===
      'confirmada|cerrada|libre|pagado|finalizado',
  );
  await esperar('cliente: ve el pago confirmado sin recargar', async () =>
    (await textos(cliente, 'tumbo-cuenta-cliente .aviso strong')).includes('¡Pago confirmado!'),
  );
  leerEnCliente('TUMBO://mesa/tumbo-mesa-2');
  await cliente.getByRole('button', { name: 'Verificar la mesa con su QR' }).click();
  await esperar(
    'cliente: el QR de la mesa la muestra libre',
    async () =>
      (await textos(cliente, '.verificacion')).join() ===
      'Mesa 2: libre, lista para el próximo cliente.',
  );

  // ── Puntos 20 y 22: los gráficos, uno por pantalla ───────────────
  await volverAlInicio(cliente);
  await abrir(cliente, 'Reportes');
  await esperar(
    'gráficos: cargan el historial',
    async () =>
      Number((await textos(cliente, '.resultados__encabezado span')).join().split(' ')[0]) > 100,
  );
  ok(
    'gráficos: primero la torta',
    (await textos(cliente, '.resultados__tipo')).join() === 'Gráfico de torta',
  );
  await revisarPantalla(cliente, 'grafico-torta');
  const siguienteGrafico = () =>
    cliente
      .locator('tumbo-resultados-encuesta')
      .getByRole('button', { name: 'Elementos siguientes' })
      .click();
  await siguienteGrafico();
  await esperar(
    'gráficos: después las barras, sola en su pantalla',
    async () =>
      (await textos(cliente, '.resultados__tipo')).join() === 'Gráfico de barras' &&
      (await cliente.locator('tumbo-grafico-torta').count()) === 0,
  );
  await revisarPantalla(cliente, 'grafico-barras');
  await siguienteGrafico();
  await esperar(
    'gráficos: y la línea semanal',
    async () =>
      (await textos(cliente, '.resultados__tipo')).join() === 'Gráfico de línea' &&
      (await cliente.locator('tumbo-grafico-linea circle').count()) === 4,
  );
  await revisarPantalla(cliente, 'grafico-linea');
} finally {
  await browser.close();
}

const fallidos = resultados.filter((r) => !r.ok);
console.log(
  `\n${resultados.length - fallidos.length}/${resultados.length} comprobaciones correctas.`,
);
process.exitCode = fallidos.length ? 1 : 0;
