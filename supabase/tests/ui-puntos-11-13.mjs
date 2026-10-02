/**
 * Puntos 11 y 13 por pantalla: la consulta al mozo por mesa y el rechazo
 * con motivo que el cliente corrige y reenvía.
 *
 * - 11: Camila (mesa 2) consulta; en la mesa 3 hay otra conversación. El
 *   mozo elige la mesa, ve solo esa conversación y su respuesta queda en
 *   la estadía de Camila, que la ve sin recargar.
 * - 13: Camila pide, el mozo rechaza escribiendo el motivo, Camila lo ve,
 *   retoma el pedido en el carrito, quita un producto y lo reenvía.
 *
 * SOLO CONTRA EL SUPABASE LOCAL, con la misma guarda que los otros E2E.
 * Prepara sus propias estadías y las borra al terminar.
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
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
const CAPTURAS = process.env.CAPTURAS ?? '';
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

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

const S2 = 'cccccccc-0000-4000-8000-000000000002';
const S3 = 'cccccccc-0000-4000-8000-000000000003';
const limpiar = () =>
  sql(`select set_config('tumbo.sin_avisos', 'si', false);
    delete from mensajes where sesion_mesa_id in ('${S2}', '${S3}');
    delete from pedidos where sesion_mesa_id in ('${S2}', '${S3}');
    delete from sesiones_mesa where id in ('${S2}', '${S3}');
    update mesas set estado = 'libre' where numero in (2, 3);`);

limpiar();
sql(`select set_config('tumbo.sin_avisos', 'si', false);
  update sesiones_mesa set estado = 'cerrada', cerrada_en = now()
   where estado <> 'cerrada' and cliente_id in (select id from usuarios where correo in ('camila@tumbo.demo', 'historico1@tumbo.demo'));
  insert into sesiones_mesa (id, mesa_id, cliente_id)
    select '${S2}', m.id, u.id from mesas m, usuarios u where m.numero = 2 and u.correo = 'camila@tumbo.demo';
  insert into sesiones_mesa (id, mesa_id, cliente_id)
    select '${S3}', m.id, u.id from mesas m, usuarios u where m.numero = 3 and u.correo = 'historico1@tumbo.demo';
  insert into mensajes (sesion_mesa_id, autor_id, tipo, cuerpo, enviado_en)
    select '${S3}', id, 'consulta', '¿Puedo pedir la carta de vinos?', now() - interval '2 minutes'
      from usuarios where correo = 'historico1@tumbo.demo';`);

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
/** El texto visible de cada elemento, con un espacio entre sus partes. */
const textos = (page, selector) =>
  page.locator(selector).evaluateAll((els) =>
    els.map((e) => {
      const partes = [];
      const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) partes.push(w.currentNode.textContent);
      return partes.join(' ').replace(/\s+/g, ' ').trim();
    }),
  );
async function revisarAxe(page, nombre) {
  await page.addScriptTag({ path: axe });
  const v = await page.evaluate(async () =>
    (
      await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      })
    ).violations.map(
      (x) =>
        `${x.id}: ${x.nodes.map((n) => `${n.target.join(' ')} → ${n.any[0]?.message ?? ''}`).join(' | ')}`,
    ),
  );
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok(
    `${nombre}: sin violaciones de axe ni desplazamiento horizontal ${v.join(', ')}`,
    !v.length && !desborde,
  );
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre.replace(/\W+/g, '-')}.png` });
}

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
async function irAlProducto(page, producto) {
  // La carta se dibuja después de abrir la sección: sin esperar la
  // primera tarjeta, el recorrido arranca sobre una lista vacía.
  await page.locator('.product-card h2').first().waitFor();
  for (let i = 0; i < 20; i++) {
    if ((await textos(page, '.product-card h2')).join() === producto) return true;
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await page.waitForTimeout(150);
  }
  return false;
}
async function irAlPrimero(page) {
  const anterior = page.getByRole('button', { name: 'Página anterior' });
  await page.locator('.product-card h2').first().waitFor();
  for (let i = 0; i < 20 && (await anterior.isEnabled().catch(() => false)); i++) {
    await anterior.click();
    await page.waitForTimeout(120);
  }
}
const elegirMesa = async (page, mesa) => {
  await page.locator('ion-select.chat-mesa').click();
  const popover = page.locator('ion-popover');
  await popover
    .locator('ion-radio')
    .filter({ hasText: `Mesa ${mesa}` })
    .first()
    .click();
  // Hasta que el popover termina de cerrarse no se puede abrir otro.
  await popover.waitFor({ state: 'detached' });
};
const pedidoMasNuevo = `select id from pedidos where sesion_mesa_id = '${S2}' order by creado_en desc limit 1`;
const fechaHora = /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;

try {
  const [cliente, mozo] = await Promise.all([
    ingresar('camila@tumbo.demo'),
    ingresar('matias@tumbo.demo'),
  ]);

  // ── 11: consulta del cliente ──────────────────────────────────────
  await abrir(cliente, 'Consultas');
  await cliente.locator('.chat-form ion-input input').fill('¿Tienen opciones sin TACC?');
  await cliente.getByRole('button', { name: 'Enviar consulta' }).click();
  await esperar(
    '11 · base: la consulta queda en la estadía de Camila, como consulta',
    async () =>
      sql(`select tipo || '|' || cuerpo from mensajes where sesion_mesa_id = '${S2}'`) ===
      'consulta|¿Tienen opciones sin TACC?',
  );
  await esperar('11 · el cliente ve su consulta con mesa, fecha y hora', async () => {
    const encabezados = await textos(cliente, '.chat-message span');
    return encabezados.some((t) => t.startsWith('Vos · Mesa 2 · ') && fechaHora.test(t));
  });
  ok(
    '11 · el cliente no ve la conversación de otra mesa',
    !(await textos(cliente, '.chat-message p')).includes('¿Puedo pedir la carta de vinos?'),
  );

  // ── 11: el mozo elige la mesa y responde ──────────────────────────
  await abrir(mozo, 'Consultas');
  await esperar('11 · el mozo ve la mesa que escribió última', async () =>
    (
      await mozo.locator('ion-select.chat-mesa').evaluate((e) => e.shadowRoot?.textContent ?? '')
    ).includes('Mesa 2'),
  );
  await esperar('11 · y solo esa conversación, con mesa, fecha y hora', async () => {
    const encabezados = await textos(mozo, '.chat-message span');
    return (
      encabezados.length === 1 &&
      encabezados[0].startsWith('Cliente · Mesa 2 · ') &&
      fechaHora.test(encabezados[0])
    );
  });
  await revisarAxe(mozo, 'consulta del mozo');
  await elegirMesa(mozo, 3);
  await esperar(
    '11 · al elegir la mesa 3 ve la otra conversación',
    async () =>
      (await textos(mozo, '.chat-message p')).join() === '¿Puedo pedir la carta de vinos?',
  );
  await elegirMesa(mozo, 2);
  await esperar(
    '11 · vuelve a la mesa 2',
    async () => (await textos(mozo, '.chat-message p')).join() === '¿Tienen opciones sin TACC?',
  );
  await mozo.locator('.chat-form ion-input input').fill('Sí, el flan es sin TACC.');
  await mozo.getByRole('button', { name: 'Enviar respuesta' }).click();
  await esperar(
    '11 · base: la respuesta va a la estadía de Camila y no a la de la mesa 3',
    async () =>
      sql(`select count(*) filter (where sesion_mesa_id = '${S2}' and tipo = 'respuesta') || '|' ||
                  count(*) filter (where sesion_mesa_id = '${S3}' and tipo = 'respuesta')
             from mensajes where cuerpo = 'Sí, el flan es sin TACC.'`) === '1|0',
  );
  await esperar('11 · el cliente ve la respuesta del mozo sin recargar', async () => {
    const encabezados = await textos(cliente, '.chat-message span');
    return (
      (await textos(cliente, '.chat-message p')).includes('Sí, el flan es sin TACC.') &&
      encabezados.some((t) => t.startsWith('Mozo · Mesa 2 · '))
    );
  });
  await revisarAxe(cliente, 'consulta del cliente');

  // ── 13: pedido, rechazo con motivo, corrección y reenvío ──────────
  await volver(cliente);
  await abrir(cliente, 'Menú');
  ok('13 · menú: aparece «Bife de chorizo»', await irAlProducto(cliente, 'Bife de chorizo'));
  for (let i = 0; i < 2; i++)
    await cliente.locator('.product-card ion-button.quantity-button').last().click();
  await esperar(
    '12 · los botones de cantidad dicen el producto y cuántos hay',
    async () =>
      (await cliente
        .getByRole('button', {
          name: 'Agregar una unidad de Bife de chorizo (en el pedido: 2)',
        })
        .count()) === 1,
  );
  await revisarAxe(cliente, 'menú con cantidades');
  ok('13 · menú: aparece «Café espresso»', await irAlProducto(cliente, 'Café espresso'));
  await cliente.locator('.product-card ion-button.quantity-button').last().click();
  await cliente.getByRole('button', { name: /Enviar\s+pedido/ }).click();
  await confirmar(cliente);
  await esperar(
    '12 · base: el pedido llegó con sus 2 ítems',
    async () =>
      sql(`select estado || '|' || (select count(*) from pedido_items where pedido_id = p.id)
             from pedidos p where p.id = (${pedidoMasNuevo})`) === 'pendiente_confirmacion|2',
  );

  await volver(mozo);
  await abrir(mozo, 'Pedidos');
  await esperar('13 · el mozo ve el pedido nuevo de la mesa 2', async () =>
    (await textos(mozo, 'tumbo-avance-pedidos h3')).includes('Mesa 2'),
  );
  await mozo.getByRole('button', { name: 'Rechazar', exact: true }).click();
  const rechazo = mozo.getByRole('button', { name: 'Rechazar pedido', exact: true });
  ok('13 · sin motivo no se puede rechazar', await rechazo.isDisabled());
  await mozo.locator('.avance__rechazo ion-textarea textarea').fill('No');
  await esperar(
    '13 · un motivo demasiado corto muestra el error',
    async () =>
      (await textos(mozo, '.avance__error')).join() ===
      'El motivo tiene que tener entre 5 y 300 caracteres.',
  );
  await mozo.locator('.avance__rechazo ion-textarea textarea').fill('No queda bife de chorizo');
  await esperar('13 · con motivo válido se habilita', async () => await rechazo.isEnabled());
  await revisarAxe(mozo, 'rechazo con motivo');
  await rechazo.click();
  await confirmar(mozo);
  await esperar(
    '13 · base: rechazado con el motivo que escribió el mozo',
    async () =>
      sql(`select estado || '|' || motivo_rechazo from pedidos where id = (${pedidoMasNuevo})`) ===
      'rechazado|No queda bife de chorizo',
  );

  await volver(cliente);
  await abrir(cliente, 'Pedidos');
  await esperar(
    '13 · el cliente ve el rechazo y el motivo sin recargar',
    async () =>
      (await textos(cliente, '.order-rejected p')).join() === 'Motivo: No queda bife de chorizo',
  );
  await revisarAxe(cliente, 'pedido rechazado');
  await cliente.getByRole('button', { name: 'Modificar y reenviar' }).click();
  await esperar(
    '13 · el pedido vuelve al carrito con su importe',
    async () => (await textos(cliente, '.cart-bar strong')).join() === '$ 40.200',
  );
  await irAlPrimero(cliente);
  ok('13 · vuelve a «Bife de chorizo»', await irAlProducto(cliente, 'Bife de chorizo'));
  await cliente.locator('.product-card ion-button.quantity-button').first().click();
  await esperar(
    '13 · quitar uno actualiza el importe',
    async () => (await textos(cliente, '.cart-bar strong')).join() !== '$ 40.200',
  );
  await cliente.getByRole('button', { name: /Enviar\s+pedido/ }).click();
  await confirmar(cliente);
  await esperar(
    '13 · base: el pedido corregido llega como pedido nuevo, pendiente, con 1 bife y 1 café',
    async () =>
      sql(`select p.estado || '|' || string_agg(pr.nombre || ' ' || i.cantidad, ', ' order by pr.nombre)
             from pedidos p join pedido_items i on i.pedido_id = p.id join productos pr on pr.id = i.producto_id
            where p.id = (${pedidoMasNuevo}) group by p.estado`) ===
      'pendiente_confirmacion|Bife de chorizo 1, Café espresso 1',
  );
  await esperar(
    '13 · el mozo ve el pedido reenviado sin recargar',
    async () =>
      (await textos(mozo, '.avance__entrega li')).join() ===
      'Bife de chorizo 1 ×,Café espresso 1 ×',
  );
} finally {
  await browser.close();
  // CONSERVAR=1 deja las estadías para mirar qué pasó si algo falla.
  if (!process.env.CONSERVAR) limpiar();
}

const fallidos = resultados.filter((r) => !r.ok);
console.log(
  `\n${resultados.length - fallidos.length}/${resultados.length} comprobaciones correctas.`,
);
process.exitCode = fallidos.length ? 1 : 0;
