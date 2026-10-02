/**
 * Punto 9 por pantalla: el cliente anónimo entra por el QR de ingreso,
 * carga nombre y foto y se anota en la lista de espera; el metre lo ve
 * con su foto y lo puede quitar. El anónimo puede ver las encuestas.
 *
 * SOLO CONTRA EL SUPABASE LOCAL, con la misma guarda que los otros E2E,
 * y con los ingresos anónimos activos (`enable_anonymous_sign_ins` en
 * `supabase/config.toml`). En producción están activos desde el
 * 02/10/2026 (`supabase config push` con solo esa propiedad declarada).
 * Borra al cliente anónimo al terminar.
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

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

// Solo letras, como exige la base; el sufijo hace único al nombre.
const NOMBRE = `Lucía Anónima ${'abcdefghij'
  .split('')
  .sort(() => Math.random() - 0.5)
  .join('')
  .slice(0, 6)}`;
const FOTO = path.resolve('public/icons/icon-192.png');
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
const avisos = (page) =>
  page.locator('ion-toast').evaluateAll((ts) => ts.map((t) => String(t.message ?? '')));
const confirmar = (page) => page.getByRole('button', { name: 'Confirmar', exact: true }).click();
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

/** Lo último que vio el metre, para entender una falla. */
let visto = null;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  // ── El cliente anónimo, sin sesión, desde el QR de ingreso ────────
  const anonimo = await (
    await browser.newContext({ viewport: { width: 360, height: 780 } })
  ).newPage();
  anonimo.setDefaultTimeout(15000);
  anonimo.on('dialog', (d) => void d.accept('tumbo://ingreso'));
  await anonimo.goto(`${APP}/ingreso`);
  await anonimo.getByRole('button', { name: 'Entrar sin cuenta con el QR de ingreso' }).click();
  await esperar(
    '9 · desde el ingreso se llega a la entrada sin cuenta',
    async () =>
      (await textos(anonimo, '#operation-title')).join() === 'Entrada' ||
      (await anonimo.getByRole('button', { name: 'Escanear QR de ingreso' }).count()) === 1,
  );

  // Punto 22: desde la entrada, sin cuenta, se consultan las encuestas.
  await anonimo.getByRole('button', { name: 'Ver resultados de encuestas previas' }).click();
  await esperar(
    '22 · sin cuenta se ven los gráficos de las encuestas',
    async () => (await anonimo.locator('tumbo-grafico-torta').count()) === 1,
  );
  await revisarAxe(anonimo, 'resultados sin cuenta');
  await anonimo.getByRole('button', { name: 'Volver', exact: true }).click();
  await anonimo.getByRole('button', { name: 'Escanear QR de ingreso' }).click();
  await esperar('9 · el QR de ingreso se valida', async () =>
    (await textos(anonimo, '.form-hint')).includes(
      'QR validado. Completá tus datos para anotarte.',
    ),
  );
  await revisarAxe(anonimo, 'entrada del anónimo');

  await anonimo.locator('.anonymous-form ion-input input').fill(NOMBRE);
  await esperar(
    '9 · sin foto no se puede anotar y la pantalla dice por qué',
    async () =>
      (await anonimo.getByRole('button', { name: 'Anotarme' }).first().isDisabled()) &&
      (await textos(anonimo, '.form-hint')).includes(
        'La foto es obligatoria para registrarte como cliente anónimo.',
      ),
  );

  const selector = anonimo.waitForEvent('filechooser');
  await anonimo.getByRole('button', { name: 'Agregar foto' }).click();
  await (await selector).setFiles(FOTO);
  await anonimo.getByAltText('Vista previa de tu foto').waitFor();

  await anonimo.locator('.anonymous-form ion-input input').fill('Lucía 2');
  await anonimo.getByRole('button', { name: 'Anotarme' }).click();
  await confirmar(anonimo);
  await esperar('9 · un nombre con números se rechaza en español, antes de crear nada', async () =>
    (await avisos(anonimo)).includes('El nombre solo puede tener letras y espacios.'),
  );
  ok(
    '9 · base: con datos inválidos no se creó ninguna identidad anónima',
    sql(`select count(*) from usuarios where nombres in ('${NOMBRE}', 'Lucía 2')`) === '0',
  );

  await anonimo.locator('.anonymous-form ion-input input').fill(NOMBRE);
  await anonimo.getByRole('button', { name: 'Anotarme' }).click();
  await confirmar(anonimo);
  await esperar('9 · con nombre y foto se anota', async () =>
    (await avisos(anonimo)).includes('Te anotamos en la lista de espera.'),
  );
  await esperar(
    '9 · base: cliente anónimo con foto, esperando en la lista',
    async () =>
      sql(`select u.perfil || '|' || (u.foto_url is not null) || '|' || e.estado
             from usuarios u join lista_espera e on e.cliente_id = u.id
            where u.nombres = '${NOMBRE}'`) === 'cliente_anonimo|true|esperando',
  );

  // El anónimo solo consulta las encuestas previas.
  await anonimo.getByRole('button', { name: 'Ver resultados de encuestas previas' }).click();
  await esperar(
    '9 · el anónimo ve los resultados de las encuestas',
    async () => (await anonimo.locator('tumbo-grafico-torta').count()) === 1,
  );

  // ── El metre ──────────────────────────────────────────────────────
  const metre = await (
    await browser.newContext({ viewport: { width: 360, height: 780 } })
  ).newPage();
  metre.setDefaultTimeout(15000);
  await metre.goto(`${APP}/ingreso`);
  await metre.locator('#correo input').fill('ignacio@tumbo.demo');
  await metre.locator('#clave input').fill('Tumbo2026');
  await metre.locator('.login-card__submit').click();
  await metre.waitForURL('**/operacion');
  await metre
    .getByRole('button', { name: /^Espera(,|$)/ })
    .first()
    .click();
  /** La lista se pagina según el alto de la pantalla: busca la fila página por página. */
  const buscarEnLaLista = async () => {
    const anterior = metre.getByRole('button', { name: 'Página anterior' });
    while ((await anterior.count()) && (await anterior.isEnabled())) await anterior.click();
    for (let i = 0; i < 15; i++) {
      if (await metre.locator('.wait-row', { hasText: NOMBRE }).count()) return true;
      const siguiente = metre.getByRole('button', { name: 'Página siguiente' });
      if (!(await siguiente.count()) || !(await siguiente.isEnabled())) return false;
      await siguiente.click();
      await metre.waitForTimeout(150);
    }
    return false;
  };
  await esperar('9 · el metre lo ve en la lista con su foto', async () => {
    visto = [
      await textos(metre, '.wait-row strong'),
      await metre.locator('.wait-row img').evaluateAll((i) => i.map((x) => x.getAttribute('src'))),
    ];
    if (!(await buscarEnLaLista())) return false;
    const src = await metre
      .locator('.wait-row', { hasText: NOMBRE })
      .locator('img')
      .getAttribute('src');
    return !!src && src.includes('fotos-usuarios');
  });
  await revisarAxe(metre, 'lista de espera del metre');
  await metre
    .locator('.wait-row', { hasText: NOMBRE })
    .getByRole('button', { name: 'Eliminar de la lista' })
    .click();
  await confirmar(metre);
  await esperar(
    '9 · base: el metre lo quitó de la lista',
    async () =>
      sql(
        `select estado from lista_espera where cliente_id = (select id from usuarios where nombres = '${NOMBRE}')`,
      ) === 'eliminado',
  );
  await esperar(
    '9 · ya no aparece en la lista del metre',
    async () => (await metre.locator('.wait-row', { hasText: NOMBRE }).count()) === 0,
  );
} finally {
  if (resultados.some((r) => !r.ok) && visto)
    console.log('    el metre veía:', JSON.stringify(visto));
  await browser.close();
  sql(`delete from lista_espera where cliente_id in (select id from usuarios where nombres = '${NOMBRE}');
       delete from auth.users where id in (select id from usuarios where nombres = '${NOMBRE}');`);
}

const fallidos = resultados.filter((r) => !r.ok);
console.log(
  `\n${resultados.length - fallidos.length}/${resultados.length} comprobaciones correctas.`,
);
process.exitCode = fallidos.length ? 1 : 0;
