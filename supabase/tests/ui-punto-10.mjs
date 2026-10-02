/**
 * Punto 10 por pantalla: el metre asigna una mesa a un cliente de la
 * lista de espera y el cliente se vincula escaneando el QR de ESA mesa.
 * No puede vincularse con otra, y la mesa asignada no se le puede dar a
 * otro cliente.
 *
 * SOLO CONTRA EL SUPABASE LOCAL, con la misma guarda que los otros E2E.
 * Prepara a Camila y a un cliente del historial en la lista de espera y
 * los deja como estaban al terminar.
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

const CLIENTES = `(select id from usuarios where correo in ('camila@tumbo.demo', 'historico1@tumbo.demo'))`;
const limpiar = () =>
  sql(`select set_config('tumbo.sin_avisos', 'si', false);
    update sesiones_mesa set estado = 'cerrada', cerrada_en = now()
     where estado <> 'cerrada' and cliente_id in ${CLIENTES};
    delete from lista_espera where cliente_id in ${CLIENTES};
    update mesas set estado = 'libre' where numero in (2, 3);`);
limpiar();
sql(`select set_config('tumbo.sin_avisos', 'si', false);
  insert into lista_espera (cliente_id, creado_en)
    select id, now() + interval '1 second' from usuarios where correo = 'historico1@tumbo.demo';`);
const qrDe = (numero) =>
  `TUMBO://mesa/${sql(`select qr_token from mesas where numero = ${numero}`)}`;
const camila = `(select id from usuarios where correo = 'camila@tumbo.demo')`;

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
async function revisarAxe(page, nombre) {
  await page.addScriptTag({ path: axe });
  const v = await page.evaluate(async () =>
    (
      await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      })
    ).violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
  );
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  ok(
    `${nombre}: sin violaciones de axe ni desplazamiento horizontal ${v.join(', ')}`,
    !v.length && !desborde,
  );
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

/** Busca la fila de la persona y, en sus botones de mesa, la mesa pedida. */
async function botonDeMesa(page, persona, numero) {
  // Ionic pasa el aria-label del `ion-button` al botón nativo de adentro,
  // así que se busca por rol y nombre, y se mira `disabled` en el
  // `ion-button` que lo contiene (o en el botón, si es uno común).
  const usable = async (loc) =>
    (await loc.count()) > 0 &&
    (await loc.first().evaluate((e) => !(e.disabled || (e.getRootNode().host ?? {}).disabled)));
  // El paginador de la fila puede quedar debajo de los controles de
  // página: se toca el botón directamente para no esperar a que se libere.
  const tocar = (loc) => loc.first().evaluate((e) => e.click());
  const anterior = page.getByRole('button', { name: 'Página anterior', exact: true });
  for (let k = 0; k < 20 && (await usable(anterior)); k++) await tocar(anterior);
  for (let i = 0; i < 15; i++) {
    const fila = page.locator('.wait-row', { hasText: persona });
    if (await fila.count()) {
      for (let j = 0; j < 10; j++) {
        const boton = fila.getByRole('button', { name: `Mesa ${numero}`, exact: true }).first();
        if (await boton.count()) return boton;
        const mas = fila.getByRole('button', { name: 'Elementos siguientes', exact: true });
        if (!(await usable(mas))) return null;
        await tocar(mas);
      }
      return null;
    }
    const siguiente = page.getByRole('button', { name: 'Página siguiente', exact: true });
    if (!(await usable(siguiente))) return null;
    await tocar(siguiente);
    await page.waitForTimeout(150);
  }
  return null;
}

let qr = '';
try {
  const metre = await ingresar('ignacio@tumbo.demo');
  const cliente = await ingresar('camila@tumbo.demo');
  cliente.on('dialog', (d) => void d.accept(qr));

  // ── Camila, registrada, se anota sola: a ella no se le pide foto ──
  await abrir(cliente, 'Entrada');
  qr = 'tumbo://ingreso';
  await cliente.getByRole('button', { name: 'Escanear QR de ingreso' }).click();
  await cliente.locator('.anonymous-form ion-input input').fill('Camila');
  await esperar(
    '9 · el cliente registrado se puede anotar sin foto',
    async () => await cliente.getByRole('button', { name: 'Anotarme' }).first().isEnabled(),
  );
  await cliente.getByRole('button', { name: 'Anotarme' }).first().click();
  await cliente.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await esperar(
    '9 · base: Camila quedó esperando en la lista',
    async () => sql(`select estado from lista_espera where cliente_id = ${camila}`) === 'esperando',
  );

  // ── El metre asigna la mesa 2 a Camila ────────────────────────────
  await abrir(metre, 'Espera');
  let boton = null;
  await esperar('10 · el metre ve a Camila con la mesa 2 disponible', async () => {
    boton = await botonDeMesa(metre, 'Camila', 2);
    return boton !== null;
  });
  await revisarAxe(metre, 'lista de espera con mesas');
  await boton.click();
  await esperar(
    '10 · base: espera asignada a la mesa 2 y la mesa reservada, sin estadía todavía',
    async () =>
      sql(`select e.estado || '|' || m.numero || '|' ||
                  (select count(*) from sesiones_mesa s where s.cliente_id = e.cliente_id and s.estado <> 'cerrada')
             from lista_espera e join mesas m on m.id = e.mesa_id
            where e.cliente_id = ${camila} and e.estado = 'asignado'`) === 'asignado|2|0',
  );
  const otro = sql(`select nombres from usuarios where correo = 'historico1@tumbo.demo'`);
  await esperar(
    '10 · a otro cliente se le ofrece la mesa 3 pero ya no la 2',
    async () =>
      (await botonDeMesa(metre, otro, 3)) !== null && (await botonDeMesa(metre, otro, 2)) === null,
  );
  ok(
    '10 · base: tampoco se puede forzar la mesa 2 para otro cliente',
    (() => {
      try {
        sql(`begin;
          select set_config('request.jwt.claims', json_build_object('sub', (select id from usuarios where correo = 'ignacio@tumbo.demo'), 'role', 'authenticated')::text, true);
          set local role authenticated;
          select public.asignar_mesa_a_cliente(
            (select id from lista_espera where cliente_id = (select id from usuarios where correo = 'historico1@tumbo.demo') and estado = 'esperando'),
            (select id from mesas where numero = 2));
          rollback;`);
        return false;
      } catch {
        return true;
      }
    })(),
  );

  // ── Camila se vincula escaneando el QR ────────────────────────────
  // Sigue en la entrada: la mesa asignada le aparece ahí en vivo.
  await esperar(
    '10 · el cliente ve su mesa asignada sin recargar',
    async () => (await textos(cliente, '.table-link-card strong')).join() === 'Mesa asignada: 2',
  );
  await revisarAxe(cliente, 'mesa asignada del cliente');

  qr = qrDe(3);
  await cliente.getByRole('button', { name: 'Escanear QR de mi mesa' }).click();
  await esperar(
    '10 · el QR de otra mesa se rechaza',
    async () =>
      (await textos(cliente, '.qr-link-status--error')).join() ===
      'QR rechazado. Solo podés vincular la mesa 2.',
  );
  ok(
    '10 · base: con el QR equivocado no se abrió ninguna estadía',
    sql(
      `select count(*) from sesiones_mesa where cliente_id = ${camila} and estado <> 'cerrada'`,
    ) === '0',
  );

  qr = qrDe(2);
  await cliente.getByRole('button', { name: 'Escanear QR de mi mesa' }).click();
  await esperar(
    '10 · base: con el QR de su mesa queda sentada en la mesa 2',
    async () =>
      sql(`select m.numero || '|' || s.estado from sesiones_mesa s join mesas m on m.id = s.mesa_id
            where s.cliente_id = ${camila} and s.estado = 'activa'`) === '2|activa',
  );
  await cliente.getByRole('button', { name: 'Volver a las secciones', exact: true }).click();
  await abrir(cliente, 'Menú');
  await esperar(
    '10 · el menú muestra la mesa vinculada',
    async () => (await textos(cliente, '.table-chip')).join() === 'Mesa 2',
  );

  // Ya vinculada, no puede pasarse a otra mesa (la base lo rechaza).
  ok(
    '10 · base: no puede vincularse con otra mesa',
    (() => {
      try {
        sql(`begin;
          select set_config('request.jwt.claims', json_build_object('sub', (select id from usuarios where correo = 'camila@tumbo.demo'), 'role', 'authenticated')::text, true);
          set local role authenticated;
          select public.vincular_mesa_asignada((select qr_token from mesas where numero = 3));
          rollback;`);
        return false;
      } catch {
        return true;
      }
    })(),
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
