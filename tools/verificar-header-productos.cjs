const { chromium } = require('playwright'),
  fs = require('fs'),
  path = require('path'),
  assert = require('node:assert/strict');
const out =
  process.env.TUMBO_QA_OUTPUT || path.join(require('node:os').tmpdir(), 'tumbo-header-productos');
fs.mkdirSync(out, { recursive: true });
let activeBrowser, activePage;
(async () => {
  const browser = (activeBrowser = await chromium.launch());
  const page = (activePage = await browser.newPage());
  const results = [];
  await page.goto('http://127.0.0.1:4200/ingreso');
  await page.locator('input[type=email]').fill('mateo@tumbo.demo');
  await page.locator('input[type=password]').fill('Tumbito2026');
  await page.waitForTimeout(200);
  await page.locator('.login-card__submit button').click();
  await page.locator('tumbo-menu-operacion').waitFor();
  async function header() {
    return page.evaluate(() => {
      const b = (s) => {
        const r = document.querySelector(s).getBoundingClientRect();
        return { y: r.y, h: r.height, w: r.width, x: r.x };
      };
      return {
        header: b('.operation-top'),
        logo: b('.operation-brand__lockup'),
        logout: b('.logout-button'),
      };
    });
  }
  for (const [width, height] of [
    [320, 568],
    [360, 640],
    [390, 844],
    [768, 650],
    [1024, 768],
    [768, 360],
  ]) {
    await page.setViewportSize({ width, height });
    const baseline = await header();
    for (const name of [
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
    ]) {
      await page.getByRole('button', { name, exact: true }).click();
      await page.locator('.view-content').waitFor();
      const current = await header();
      assert.deepEqual(current.header, baseline.header);
      assert.deepEqual(current.logout, baseline.logout);
      assert.equal(current.logo.h, baseline.logo.h);
      assert.equal(current.logo.y, baseline.logo.y);
      assert.equal(current.logo.w, baseline.logo.w);
      if (name === 'Productos') {
        const bounds = await page.locator('.catalog-item').evaluateAll((cards) =>
          cards.map((c) => {
            const media = c.querySelector('img,.catalog-item__placeholder').getBoundingClientRect(),
              info = c.querySelector('.catalog-item__details').getBoundingClientRect(),
              actions = c.querySelector('.catalog-item__actions').getBoundingClientRect();
            return {
              valid: media.right <= info.left && info.right <= actions.left,
              overflow: c.scrollWidth > c.clientWidth,
              images: c.querySelectorAll('img').length,
            };
          }),
        );
        assert.ok(bounds.every((b) => b.valid && !b.overflow && b.images <= 1));
      }
      if (width === 390 && ['Personal', 'Productos'].includes(name))
        await page.screenshot({ path: path.join(out, name + '.png') });
      if (width === 1024 && name === 'Productos')
        await page.screenshot({ path: path.join(out, 'Productos-amplio.png') });
      await page.getByRole('button', { name: 'Volver a las secciones', exact: true }).click();
      await page.locator('tumbo-menu-operacion').waitFor();
      await page.waitForFunction(() =>
        [...document.querySelectorAll('tumbo-menu-operacion ion-icon')].every((icon) =>
          icon.shadowRoot?.querySelector('svg'),
        ),
      );
    }
    results.push({ width, height, header: baseline, sections: 15 });
    if (width === 390) await page.screenshot({ path: path.join(out, 'Centro.png') });
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('button', { name: 'Productos', exact: true }).click();
  await page.evaluate(() => {
    const c = ng.getComponent(document.querySelector('tumbo-operacion'));
    window.productsSnapshot = structuredClone(c.demo.productos());
    const base = c.demo.productos()[0];
    c.demo.productos.set(
      Array.from({ length: 30 }, (_, i) => ({
        ...base,
        id: 'qa-' + i,
        nombre: i === 0 ? 'Té' : 'ProductoLarguísimo'.repeat(12),
        precio: 999999999.99,
        minutos: 999,
        fotos: i % 2 ? [] : base.fotos,
      })),
    );
  });
  await page.waitForFunction(() => document.querySelectorAll('.catalog-item').length === 30);
  assert.equal(await page.locator('.catalog-item').count(), 30);
  assert.equal(await page.locator('.catalog-item img').count(), 15);
  await page.screenshot({ path: path.join(out, 'Productos-stress.png') });
  assert.equal(
    await page.locator('.view-content').evaluate((e) => e.scrollWidth > e.clientWidth),
    false,
  );
  assert.equal(
    await page.locator('.view-content').evaluate((e) => e.scrollHeight > e.clientHeight),
    true,
  );
  await page.evaluate(() => {
    const c = ng.getComponent(document.querySelector('tumbo-operacion'));
    c.demo.productos.set(window.productsSnapshot);
    c.dandoDeBaja.set(window.productsSnapshot[0].id);
  });
  await page.locator('.catalog-item__espera').waitFor();
  assert.equal(
    await page
      .locator('.catalog-item')
      .first()
      .evaluate((e) => e.scrollWidth > e.clientWidth),
    false,
  );
  assert.equal(
    await page.locator('.catalog-item__espera').evaluate((e) => e.getBoundingClientRect().width),
    44,
  );
  await page.evaluate(() =>
    ng.getComponent(document.querySelector('tumbo-operacion')).dandoDeBaja.set(null),
  );
  await page.locator('.view-heading ion-button').click();
  await page.locator('[formcontrolname=nombre] input').fill('Producto QA único');
  await page
    .locator('[formcontrolname=descripcion] textarea')
    .fill('Descripción de prueba para una sola imagen.');
  const png = fs.readFileSync(path.join(__dirname, '../public/imagenes/tumbito/carne.webp'));
  async function choose(name) {
    const chooser = page.waitForEvent('filechooser');
    await page.locator('.product-photo__slot').click();
    await (await chooser).setFiles({ name, mimeType: 'image/webp', buffer: png });
    await page.locator('.product-photo img').waitFor();
    assert.equal(await page.locator('.product-photo').count(), 1);
    assert.equal(await page.locator('.product-photo img').count(), 1);
  }
  await choose('primera.webp');
  await choose('reemplazo.webp');
  assert.equal(
    await page.evaluate(
      () =>
        ng.getComponent(document.querySelector('tumbo-operacion')).productoForm.controls.fotos.value
          .length,
    ),
    1,
  );
  await page.screenshot({ path: path.join(out, 'alta-preview.png') });
  await page.getByRole('button', { name: 'Agregar producto', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.locator('.catalog-item').filter({ hasText: 'Producto QA único' }).waitFor();
  const card = page.locator('.catalog-item').filter({ hasText: 'Producto QA único' });
  assert.equal(await card.locator('img').count(), 1);
  await card.locator('img').evaluate((img) => img.decode());
  await card.getByRole('button', { name: 'Editar Producto QA único', exact: true }).click();
  await page.locator('.product-photo img').waitFor();
  assert.equal(await page.locator('.product-photo img').count(), 1);
  await choose('edicion.webp');
  await page.screenshot({ path: path.join(out, 'edicion-preview.png') });
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await card.waitFor();
  await card.locator('img').evaluate((img) => img.decode());
  await card.getByRole('button', { name: 'Eliminar Producto QA único', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await card.waitFor();
  await card.getByRole('button', { name: 'Eliminar Producto QA único', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await card.waitFor({ state: 'detached' });
  await page.evaluate(() => {
    ng.getComponent(document.querySelector('tumbo-operacion')).demo.productos.set([]);
  });
  await page.waitForFunction(() => document.querySelectorAll('.catalog-item').length === 0);
  assert.equal(await page.locator('.catalog-item').count(), 0);
  await page.screenshot({ path: path.join(out, 'Productos-vacio.png') });
  fs.writeFileSync(
    path.join(out, 'header-flujo.json'),
    JSON.stringify(
      {
        results,
        flow: 'alta, reemplazo, edición, cancelación y eliminación OK; listas vacía y larga OK',
      },
      null,
      2,
    ),
  );
  console.log('90 comparaciones de header + flujo de imagen y productos OK');
  await browser.close();
})().catch(async (e) => {
  console.error(e);
  if (activePage) {
    await activePage.screenshot({ path: path.join(out, 'error.png') });
    console.log(await activePage.locator('body').innerText());
  }
  await activeBrowser?.close();
  process.exitCode = 1;
});
