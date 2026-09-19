/** Regresión visual de Operación contra el modo demostración.
 * Requiere ng serve y playwright + axe-core (también admite NODE_PATH).
 * Ver docs/revision-layout.md para reproducir y consultar el alcance.
 * Los tamaños son casos de prueba; no generan breakpoints en la aplicación.
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const output = process.env.TUMBO_QA_OUTPUT || path.join(os.tmpdir(), 'tumbo-layout-resultados');
fs.mkdirSync(output, { recursive: true });
const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const names = [
  'Personal',
  'Productos',
  'Clientes',
  'Pedidos',
  'Mesas',
  'Espera',
  'Cocina',
  'Barra',
  'Entrada',
  'Menú',
  'Juegos',
  'Encuesta',
  'Reportes',
  'Consultas',
  'Cuenta',
];
const dimensions = [
  [320, 568],
  [360, 640],
  [390, 780],
  [768, 650],
  [1024, 768],
  [768, 360],
];
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto((process.env.TUMBO_QA_URL || 'http://127.0.0.1:4200') + '/ingreso');
  await page.locator('.quick-user.hydrated button').click();
  await page.waitForFunction(
    () => document.querySelector('input[type=email]')?.value === 'mateo@tumbo.demo',
  );
  await page.locator('.login-card__submit button').click();
  await page.locator('tumbo-menu-operacion').waitFor();
  await page.addScriptTag({ content: axe });
  const results = [];
  async function check(name, w, h) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(70);
    const m = await page.evaluate(() => {
      const panel = document.querySelector('.view-content');
      const layout = document.querySelector('.operation-layout');
      const all = [...layout.querySelectorAll('*')].filter(
        (e) =>
          e.getBoundingClientRect().width &&
          e.getBoundingClientRect().height &&
          !e.closest('ion-modal'),
      );
      const box = (e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom };
      };
      const outside = all
        .filter((e) => {
          const r = e.getBoundingClientRect();
          return r.left < -1 || r.right > innerWidth + 1 || (!panel && r.bottom > innerHeight + 1);
        })
        .map((e) => ({ tag: e.tagName, cls: e.className, box: box(e) }));
      const overflowing = all
        .filter(
          (e) =>
            e.clientWidth > 0 &&
            e.scrollWidth > e.clientWidth + 1 &&
            !['ION-ICON', 'ION-MODAL'].includes(e.tagName) &&
            !e.matches('.hub-title'),
        )
        .map((e) => ({ tag: e.tagName, cls: e.className, sw: e.scrollWidth, cw: e.clientWidth }));
      const scrolls = all
        .filter(
          (e) =>
            e.scrollHeight > e.clientHeight + 1 &&
            ['auto', 'scroll'].includes(getComputedStyle(e).overflowY),
        )
        .map((e) => e.className);
      const ionic = document
        .querySelector('ion-content.operation-page')
        .shadowRoot.querySelector('.inner-scroll');
      return {
        outside,
        overflowing,
        scrolls,
        documentScroll:
          document.documentElement.scrollHeight > innerHeight ||
          document.documentElement.scrollWidth > innerWidth,
        ionicScroll: ionic.scrollHeight > ionic.clientHeight + 1,
        panel: panel ? box(panel) : null,
      };
    });
    let violations = [];
    if (w === 360) {
      violations = await page.evaluate(async () =>
        (await axe.run(document.querySelector('tumbo-operacion'), {})).violations.map((v) => ({
          id: v.id,
          help: v.help,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
      );
    }
    results.push({ name, w, h, ...m, violations });
    if (w === 360) await page.screenshot({ path: path.join(output, name + '.png') });
  }
  for (const [w, h] of dimensions) {
    await page.setViewportSize({ width: w, height: h });
    await check('Centro', w, h);
    for (const name of names) {
      await page.getByRole('button', { name, exact: true }).click();
      await page.locator('.view-content').waitFor();
      await check(name, w, h);
      if (['Personal', 'Productos', 'Clientes', 'Mesas'].includes(name)) {
        await page.locator('.view-heading ion-button').click();
        await check(name + '-formulario', w, h);
        await page.locator('.view-heading ion-button').click();
      }
      await page.getByRole('button', { name: 'Volver a las secciones', exact: true }).click();
    }
  }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ results, errors }, null, 2));
  console.log(
    JSON.stringify(
      {
        checks: results.length,
        failures: results.filter(
          (r) =>
            r.outside.length ||
            r.overflowing.length ||
            r.documentScroll ||
            r.ionicScroll ||
            r.scrolls.length > 1 ||
            r.violations.length,
        ),
        errors,
      },
      null,
      2,
    ),
  );
  const failures = results.filter(
    (r) =>
      r.outside.length ||
      r.overflowing.length ||
      r.documentScroll ||
      r.ionicScroll ||
      r.scrolls.length > 1 ||
      r.violations.length,
  );
  await browser.close();
  if (failures.length || errors.length) process.exitCode = 1;
})();
