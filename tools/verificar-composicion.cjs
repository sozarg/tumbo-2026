/** QA de composición por permisos. Requiere ng serve en modo demo,
 * playwright y axe-core (admite NODE_PATH). Artefactos fuera del repositorio. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const output =
  process.env.TUMBO_QA_OUTPUT || path.join(require('node:os').tmpdir(), 'tumbo-composicion');
const roles = [
  [
    'mateo',
    'dueno',
    5,
    [
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
    ],
  ],
  [
    'ramiro',
    'supervisor',
    3,
    ['Personal', 'Productos', 'Clientes', 'Pedidos', 'Mesas', 'Espera', 'Reportes', 'Cuenta'],
  ],
  ['ignacio', 'metre', 2, ['Espera', 'Mesas', 'Clientes']],
  ['matias', 'mozo', 2, ['Pedidos', 'Mesas', 'Consultas', 'Cuenta']],
  ['alicia', 'cocinero', 0, ['Cocina', 'Platos']],
  ['bruno', 'cantinero', 0, ['Barra', 'Bebidas']],
  [
    'camila',
    'cliente_registrado',
    3,
    ['Entrada', 'Menú', 'Pedidos', 'Consultas', 'Cuenta', 'Juegos', 'Encuesta', 'Reportes'],
  ],
  [
    'anonimo',
    'cliente_anonimo',
    3,
    ['Entrada', 'Menú', 'Pedidos', 'Consultas', 'Cuenta', 'Encuesta', 'Reportes'],
  ],
];
const dimensions = [
  [320, 568],
  [360, 640],
  [390, 844],
  [768, 650],
  [1024, 768],
  [768, 360],
];
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const results = [];
  const errors = [];
  try {
    for (const [user, role, categories, accesses] of roles) {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      page.on('pageerror', (e) => errors.push({ role, error: e.message }));
      await page.goto((process.env.TUMBO_QA_URL || 'http://127.0.0.1:4200') + '/ingreso');
      await page.locator('input[type=email]').fill(user + '@tumbo.demo');
      await page.locator('input[type=password]').fill('Tumbito2026');
      await page.locator('.login-card__submit button').click();
      await page.locator('tumbo-menu-operacion').waitFor();
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const states = categories ? ['normal', 'actividad'] : ['normal', 'actividad', 'sin-pedidos'];
      if (role === 'metre') states.push('categoria-unica');
      for (const state of states) {
        const expectedCategories = state === 'categoria-unica' ? 1 : categories;
        const expectedAccesses = state === 'categoria-unica' ? ['Espera'] : accesses;
        // Fixture de presentación: ningún rol real tiene una categoría única.
        // Se restaura antes de verificar navegación; no se modifican permisos.
        if (state === 'categoria-unica')
          await page.evaluate(() => {
            const component = ng.getComponent(document.querySelector('tumbo-operacion'));
            window.qaOriginalAccesses = component.accesos;
            const singleAccess = component.accesos().filter((access) => access.id === 'espera');
            component.accesos = () => singleAccess;
            component.demo.notificaciones.set([]);
            ng.applyChanges(component);
          });
        if (state === 'actividad')
          await page.evaluate(() => {
            const component = ng.getComponent(document.querySelector('tumbo-operacion'));
            component.demo.notificaciones.set(
              Array.from({ length: 4 }, (_, index) => ({
                id: 'qa-' + index,
                mensaje: 'Pedido de la mesa 12 listo para entregar.',
                fecha: '18/09/2026 14:30',
                destinatarios: [component.usuario().perfil],
              })),
            );
            component.sesion.iniciar({
              ...component.usuario(),
              nombres: 'Nombre compuesto de prueba',
              apellidos: 'Apellido extenso de prueba',
            });
          });
        if (state === 'sin-pedidos')
          await page.evaluate(() => {
            const component = ng.getComponent(document.querySelector('tumbo-operacion'));
            component.demo.notificaciones.set([]);
            component.demo.pedidoActivo.update((pedido) => ({ ...pedido, items: [] }));
          });
        for (const [width, height] of dimensions) {
          await page.setViewportSize({ width, height });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(90);
          assert.equal(await page.locator('.dashboard-section').count(), expectedCategories);
          assert.equal(
            await page.locator('tumbo-menu-operacion nav button').count(),
            expectedAccesses.length,
          );
          for (const name of expectedAccesses)
            assert.equal(await page.getByRole('button', { name, exact: true }).count(), 1);
          const metrics = await page.evaluate(() => {
            const root = document.querySelector('tumbo-menu-operacion');
            const elements = [
              root,
              ...root.querySelectorAll('*'),
              ...document.querySelectorAll('.operation-header *'),
            ].filter((e) => e.getBoundingClientRect().width && e.getBoundingClientRect().height);
            const invalid = elements
              .filter((e) => {
                const r = e.getBoundingClientRect();
                return (
                  r.left < -1 ||
                  r.right > innerWidth + 1 ||
                  r.bottom > innerHeight + 1 ||
                  (e.clientWidth > 0 &&
                    e.scrollWidth > e.clientWidth + 1 &&
                    !(
                      getComputedStyle(e).textOverflow === 'ellipsis' &&
                      getComputedStyle(e).overflowX === 'hidden' &&
                      e.getAttribute('title')
                    ))
                );
              })
              .map((e) => ({ tag: e.tagName, cls: e.className }));
            const scrolls = elements
              .filter(
                (e) =>
                  e.scrollHeight > e.clientHeight + 1 &&
                  ['auto', 'scroll'].includes(getComputedStyle(e).overflowY),
              )
              .map((e) => e.className);
            const interactive = [...root.querySelectorAll('nav button')];
            const overlaps = interactive.flatMap((a, index) =>
              interactive
                .slice(index + 1)
                .filter((b) => {
                  const ar = a.getBoundingClientRect(),
                    br = b.getBoundingClientRect();
                  return (
                    Math.min(ar.right, br.right) - Math.max(ar.left, br.left) > 1 &&
                    Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top) > 1
                  );
                })
                .map((b) => [a.textContent.trim(), b.textContent.trim()]),
            );
            const buttons = interactive.map((e) => ({
              name: e.getAttribute('aria-label') || e.textContent.trim(),
              height: e.getBoundingClientRect().height,
              appearance: getComputedStyle(e).appearance,
            }));
            const sections = [...root.querySelectorAll('.dashboard-section')];
            const sectionBoxes = sections.map((e) => e.getBoundingClientRect());
            // Las categorías, no los botones, cubren ahora el área disponible.
            const categoryCoverageError = sections.length
              ? Math.max(
                  Math.abs(
                    Math.min(...sectionBoxes.map((r) => r.top)) -
                      root.querySelector('.dashboard').getBoundingClientRect().top,
                  ),
                  Math.abs(
                    Math.max(...sectionBoxes.map((r) => r.bottom)) -
                      root.querySelector('.dashboard').getBoundingClientRect().bottom,
                  ),
                )
              : 0;
            const oversizedPairs = [
              ...root.querySelectorAll(
                '.dashboard:not(.dashboard--sparse) .dashboard-accesses--pair',
              ),
            ].filter((group) => {
              const style = getComputedStyle(group.parentElement);
              const available =
                group.parentElement.clientWidth -
                parseFloat(style.paddingLeft) -
                parseFloat(style.paddingRight);
              const gap = parseFloat(getComputedStyle(group).columnGap);
              return (
                group.querySelector('button').getBoundingClientRect().width >
                (available - 2 * gap) / 3 + 1
              );
            }).length;
            const bottomGap =
              innerHeight -
              Math.max(
                ...[
                  ...sections,
                  root.querySelector('.sector-status__surface'),
                  root.querySelector('.activity'),
                ]
                  .filter(Boolean)
                  .map((e) => e.getBoundingClientRect().bottom),
              );
            const inner = document
              .querySelector('ion-content.operation-page')
              .shadowRoot.querySelector('.inner-scroll');
            return {
              invalid,
              overlaps,
              scrolls,
              buttons,
              bottomGap,
              categoryCoverageError,
              oversizedPairs,
              documentScroll:
                document.documentElement.scrollHeight > innerHeight ||
                document.documentElement.scrollWidth > innerWidth,
              ionicScroll: inner.scrollHeight > inner.clientHeight + 1,
            };
          });
          const violations =
            width === 360
              ? await page.evaluate(async () =>
                  (await axe.run(document.querySelector('tumbo-operacion'))).violations.map(
                    (v) => ({
                      id: v.id,
                      nodes: v.nodes.map((n) => n.target),
                    }),
                  ),
                )
              : [];
          results.push({
            role,
            state,
            width,
            height,
            categories: expectedCategories,
            accesses: expectedAccesses.length,
            ...metrics,
            violations,
          });
          if ([320, 390, 768].includes(width))
            await page.screenshot({
              path: path.join(output, `${role}-${state}-${width}x${height}.png`),
            });
        }
        if (state === 'categoria-unica')
          await page.evaluate(() => {
            const component = ng.getComponent(document.querySelector('tumbo-operacion'));
            component.accesos = window.qaOriginalAccesses;
            delete window.qaOriginalAccesses;
            ng.applyChanges(component);
          });
      }
      // Todos los accesos reales, vuelta al centro y foco del teclado.
      for (const name of accesses) {
        const button = page.getByRole('button', { name, exact: true });
        await button.focus();
        assert.equal(await button.evaluate((e) => e === document.activeElement), true);
        assert.equal(await button.evaluate((e) => getComputedStyle(e).outlineWidth), '3px');
        await page.keyboard.press('Enter');
        await page.locator('.view-content').waitFor();
        await page.getByRole('button', { name: 'Volver a las secciones', exact: true }).click();
      }
      await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
      await page.waitForURL('**/ingreso');
      await page.close();
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'roles.json'), JSON.stringify({ results, errors }, null, 2));
  }
  const failures = results.filter(
    (r) =>
      r.invalid.length ||
      r.overlaps.length ||
      r.scrolls.length ||
      r.documentScroll ||
      r.ionicScroll ||
      r.violations.length ||
      r.bottomGap > 24 ||
      r.categoryCoverageError > 2 ||
      r.oversizedPairs ||
      r.buttons.some((b) => b.height < 44 || b.height > 150 || b.appearance !== 'none'),
  );
  console.log(JSON.stringify({ checks: results.length, failures, errors }, null, 2));
  if (failures.length || errors.length) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
