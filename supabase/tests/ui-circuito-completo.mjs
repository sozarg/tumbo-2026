/**
 * El circuito completo de una mesa, de punta a punta y solo por pantalla
 * (puntos 12 a 22): nada se carga a mano en el medio.
 *
 * Camila pide desde el menú → Matías confirma → cocina y bar terminan →
 * Matías entrega → Camila confirma la recepción, pide la cuenta, lee el
 * QR de propina y paga → Matías confirma el pago → la mesa queda libre.
 *
 * SOLO CONTRA EL SUPABASE LOCAL, con la misma guarda que los otros E2E.
 * Necesita a Camila sentada en la mesa 2, sin pedidos.
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
const abrir = (page, nombre) =>
  page
    .getByRole('button', { name: new RegExp(`^${nombre}(,|$)`) })
    .first()
    .click();
const volver = (page) =>
  page.getByRole('button', { name: 'Volver a las secciones', exact: true }).first().click();
const confirmar = (page) => page.getByRole('button', { name: 'Confirmar', exact: true }).click();

/** En el menú se ve un producto por página: avanza hasta el pedido y suma unidades. */
async function sumar(page, producto, unidades) {
  for (let i = 0; i < 20; i++) {
    if ((await textos(page, '.product-card h2')).join() === producto) break;
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await page.waitForTimeout(150);
  }
  ok(`menú: aparece «${producto}»`, (await textos(page, '.product-card h2')).join() === producto);
  for (let i = 0; i < unidades; i++)
    await page.locator('.product-card ion-button.quantity-button').last().click();
}

const sesion = 'aaaaaaaa-0000-4000-8000-000000000002';
const pedidoDeCamila = `select id from pedidos where sesion_mesa_id = '${sesion}' order by creado_en desc limit 1`;

try {
  const [cliente, mozo, cocina, bar] = await Promise.all([
    ingresar('camila@tumbo.demo'),
    ingresar('matias@tumbo.demo'),
    ingresar('alicia@tumbo.demo'),
    ingresar('bruno@tumbo.demo'),
  ]);
  let qr = '';
  cliente.on('dialog', (d) => void d.accept(qr));

  // ── 12: el cliente pide ───────────────────────────────────────────
  await abrir(cliente, 'Menú');
  await sumar(cliente, 'Bife de chorizo', 2);
  await cliente.getByRole('button', { name: 'Página anterior' }).isVisible();
  await sumar(cliente, 'Café espresso', 1);
  await cliente.getByRole('button', { name: /Enviar\s+pedido/ }).click();
  await confirmar(cliente);
  await esperar(
    '12 · base: el pedido llegó con sus 2 ítems y el precio de la carta',
    async () =>
      consultar(`select estado || '|' || (select count(*) from pedido_items i where i.pedido_id = p.id) || '|' ||
      (select sum(i.cantidad * i.precio_unitario) from pedido_items i where i.pedido_id = p.id)
      from pedidos p where p.id = (${pedidoDeCamila})`) === 'pendiente_confirmacion|2|40200.00',
  );

  // ── 13/14: el mozo confirma ESE pedido ─────────────────────────────
  await abrir(mozo, 'Pedidos');
  await esperar(
    '14 · el mozo ve el pedido nuevo de la mesa 2 sin recargar',
    async () =>
      (await textos(mozo, 'tumbo-avance-pedidos h3')).includes('Mesa 2') &&
      (await textos(mozo, '.avance__nuevo')).length === 1,
  );
  ok(
    '14 · el mozo ve el detalle antes de confirmar',
    (await textos(mozo, '.avance__entrega li')).join() === 'Bife de chorizo 2 ×,Café espresso 1 ×',
  );
  await mozo.getByRole('button', { name: 'Confirmar pedido' }).click();
  await confirmar(mozo);
  await esperar(
    '14 · base: pedido confirmado, con hora y mozo',
    async () =>
      consultar(
        `select estado || '|' || (confirmado_en is not null) || '|' || (mozo_id is not null) from pedidos where id = (${pedidoDeCamila})`,
      ) === 'confirmado|true|true',
  );

  // ── 16/17/18: cocina y bar ────────────────────────────────────────
  await abrir(cocina, 'Cocina');
  await esperar(
    '16 · la cocina recibe la mesa 2 sin recargar',
    async () => (await textos(cocina, '.mesa__numero')).join() === 'Mesa 2',
  );
  await cocina
    .locator('article.mesa')
    .getByRole('button', { name: /Marcar listo/ })
    .click();
  await confirmar(cocina);
  await abrir(bar, 'Barra');
  await esperar(
    '17 · el bar recibe la mesa 2 sin recargar',
    async () => (await textos(bar, '.mesa__numero')).join() === 'Mesa 2',
  );
  await bar
    .locator('article.mesa')
    .getByRole('button', { name: /Marcar listo/ })
    .click();
  await confirmar(bar);
  await esperar('18 · el mozo ve el pedido completo sin recargar', async () =>
    (await textos(mozo, '.avance__aviso')).includes('Pedido completo: listo para entregar.'),
  );

  // ── 19: entrega y recepción ───────────────────────────────────────
  await mozo.getByRole('button', { name: 'Marcar entregado' }).click();
  await confirmar(mozo);
  await volver(cliente);
  await abrir(cliente, 'Pedidos');
  const recepcion = cliente.getByRole('button', { name: 'Confirmar recepción' });
  await esperar(
    '19 · el cliente ve el pedido entregado sin recargar',
    async () => await recepcion.isEnabled(),
  );
  await recepcion.click();
  await confirmar(cliente);
  await esperar(
    '19 · base: recepción guardada',
    async () =>
      consultar(`select recibido_en is not null from pedidos where id = (${pedidoDeCamila})`) ===
      't',
  );

  // ── 21: cuenta ────────────────────────────────────────────────────
  await volver(cliente);
  await abrir(cliente, 'Cuenta');
  await cliente.getByRole('button', { name: 'Pedir la cuenta' }).click();
  await volver(mozo);
  await abrir(mozo, 'Cuenta');
  await esperar('21 · el mozo ve que la mesa 2 pidió la cuenta', async () =>
    (await textos(mozo, '.cobro__estado')).includes('Pidió la cuenta'),
  );
  qr = 'TUMBO://propina/20';
  await cliente.getByRole('button', { name: 'Escanear QR de propina' }).click();
  await esperar(
    '21 · total con 20 % de propina, calculado por la base',
    async () => (await textos(cliente, '.total strong')).join() === '$ 48.240',
  );
  await cliente.getByRole('button', { name: /^Pagar/ }).click();
  await confirmar(cliente);

  // ── 22: confirmación y mesa libre ─────────────────────────────────
  await esperar('22 · el mozo ve el pago', async () =>
    (await textos(mozo, '.cobro__estado')).includes('Pagó: falta confirmar'),
  );
  await mozo.getByRole('button', { name: 'Confirmar pago y liberar la mesa' }).click();
  await confirmar(mozo);
  await esperar(
    '22 · base: cuenta confirmada, estadía cerrada, mesa libre, pedido pagado, espera finalizada',
    async () =>
      consultar(`select
      (select estado from cuentas where sesion_mesa_id = '${sesion}') || '|' ||
      (select estado from sesiones_mesa where id = '${sesion}') || '|' ||
      (select estado from mesas where numero = 2) || '|' ||
      (select estado from pedidos where id = (${pedidoDeCamila})) || '|' ||
      (select estado from lista_espera where cliente_id = (select id from usuarios where correo = 'camila@tumbo.demo'))`) ===
      'confirmada|cerrada|libre|pagado|finalizado',
  );
  await esperar('22 · el cliente ve el pago confirmado', async () =>
    (await textos(cliente, 'tumbo-cuenta-cliente .aviso strong')).includes('¡Pago confirmado!'),
  );
} finally {
  await browser.close();
}

const fallidos = resultados.filter((r) => !r.ok);
console.log(
  `\n${resultados.length - fallidos.length}/${resultados.length} comprobaciones correctas.`,
);
process.exitCode = fallidos.length ? 1 : 0;
