import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axe = require.resolve('axe-core/axe.min.js');
export async function probarBrowser({
  dueno,
  supervisor,
  cocinero,
  cantinero,
  cliente,
  productos,
  mesas,
  clave,
  ok,
  admin,
  run,
  image,
}) {
  const root = path.resolve('dist/tumbo/browser');
  const out = path.join(tmpdir(), 'tumbo-cierre-0104');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'qa-foto.jpg'), image);
  const resultados = [];
  const server = http.createServer((req, res) => {
    let f = path.join(root, decodeURI(req.url.split('?')[0]));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
    res.setHeader(
      'Content-Type',
      {
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.png': 'image/png',
      }[path.extname(f)] || 'application/octet-stream',
    );
    res.end(fs.readFileSync(f));
  });
  await new Promise((r) => server.listen(4320, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  async function login(page, actor) {
    await page.goto('http://127.0.0.1:4320/ingreso');
    await page.locator('#correo input').fill(actor.datos.correo);
    await page.locator('#clave input').fill(clave);
    await page.locator('.login-card__submit').click();
    await page.waitForURL('**/operacion');
    await page.getByRole('heading', { name: 'Secciones del restaurante', exact: true }).waitFor();
  }
  async function volver(page) {
    const cerrar = page.locator('ion-toast').getByRole('button', { name: 'Cerrar', exact: true });
    if (await cerrar.isVisible()) await cerrar.click();
    await page.getByRole('button', { name: 'Volver a las secciones', exact: true }).click();
    await page.getByRole('button', { name: 'Volver a las secciones', exact: true }).click();
  }
  async function capturar(page, nombre, width) {
    await page.waitForTimeout(200);
    const datos = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      overflow: document.documentElement.scrollWidth > innerWidth,
      cards: [...document.querySelectorAll('.person-card,.catalog-item,.mesa-tarjeta')].map((e) => {
        const r = e.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: r.height };
      }),
    }));
    if (width === 390) {
      await page.addScriptTag({ path: axe });
      datos.axe = await page.evaluate(async () => {
        const a = await axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
        });
        return a.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }));
      });
      assert.deepEqual(datos.axe, [], `AXE: ${nombre}`);
    }
    resultados.push({ nombre, ...datos });
    await page.screenshot({ path: path.join(out, `${width}-${nombre}.png`) });
    ok('sin overflow ' + nombre + ' ' + width, !datos.overflow);
  }
  try {
    const contexts = [];
    for (const actor of [dueno, supervisor, cocinero, cantinero]) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      page.setDefaultTimeout(15000);
      await login(page, actor);
      contexts.push({ ctx, page, actor });
      ok('ingreso UI real ' + actor.datos.perfil, true);
    }
    const page = contexts[0].page;
    for (const [width, height] of [
      [320, 568],
      [360, 640],
      [390, 844],
      [768, 1024],
    ]) {
      await page.setViewportSize({ width, height });
      for (const nombre of ['Personal', 'Productos', 'Mesas']) {
        await page.getByRole('button', { name: nombre, exact: true }).click();
        await capturar(page, nombre, width);
        await page
          .getByRole('button', { name: /Nuevo empleado|Nuevo producto|^Agregar$/ })
          .first()
          .click();
        await capturar(page, nombre + '-alta', width);
        const confirm = page.locator('form tumbo-boton-confirmacion ion-button').first();
        await confirm.scrollIntoViewIfNeeded();
        await confirm.click();
        await capturar(page, nombre + '-errores', width);
        await volver(page);
      }
    }
    for (const { page: p, actor } of contexts.slice(2)) {
      const tipo = actor.datos.perfil === 'cocinero' ? 'plato' : 'bebida';
      await p
        .getByRole('button', { name: tipo === 'plato' ? 'Platos' : 'Bebidas', exact: true })
        .click();
      await p.getByRole('button', { name: /Nuevo producto|Nuevo plato|Nueva bebida/ }).click();
      await p.locator('ion-input[formcontrolname="nombre"] input').fill(run + ' UI ' + tipo);
      await p
        .locator('ion-textarea[formcontrolname="descripcion"] textarea')
        .fill('Descripción extensa sintética para comprobar la carta en otra sesión.');
      for (let i = 1; i <= 3; i++) {
        const chooser = p.waitForEvent('filechooser');
        await p.getByRole('button', { name: 'Elegir foto ' + i, exact: true }).click();
        const file = await chooser;
        await file.setFiles(path.join(out, 'qa-foto.jpg'));
      }
      await capturar(p, 'producto-' + tipo + '-tres-fotos', 390);
      const resp = p.waitForResponse(
        (r) =>
          r.url().includes('/functions/v1/guardar-producto') && r.request().method() === 'POST',
      );
      await p.getByRole('button', { name: 'Agregar producto', exact: true }).click();
      await p.getByRole('button', { name: 'Confirmar', exact: true }).click();
      const r = await resp;
      const b = await r.json();
      ok('alta ' + tipo + ' desde formulario UI', b.ok === true);
      productos.push(b.id);
      await p.reload();
      await p.getByRole('heading', { name: 'Secciones del restaurante', exact: true }).waitFor();
      const catalogo = await cliente.client
        .from('productos')
        .select('nombre,producto_fotos(url,orden)')
        .eq('id', b.id)
        .single();
      ok(
        'producto UI visible tras recarga y otra sesión ' + tipo,
        catalogo.data.producto_fotos.length === 3,
      );
    }
    const clientCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const clientPage = await clientCtx.newPage();
    await login(clientPage, cliente);
    await clientPage.getByRole('button', { name: 'Menú', exact: true }).click();
    const vistos = new Set();
    for (let i = 0; i < 40; i++) {
      const card = clientPage.locator('.product-card');
      await card.waitFor();
      const nombre = await card.locator('h2').innerText();
      if (nombre.startsWith(run + ' UI ')) {
        const imgs = [];
        for (let n = 0; n < 3; n++) {
          imgs.push(await card.locator('img').getAttribute('src'));
          await card.getByRole('button', { name: 'Ver siguiente imagen' }).click();
          await clientPage.waitForFunction(
            (old) => document.querySelector('.product-card img')?.getAttribute('src') !== old,
            imgs[n],
          );
        }
        ok('carta UI tres imágenes navegables ' + nombre.slice(-6), new Set(imgs).size === 3);
        await capturar(clientPage, 'carta-' + nombre.slice(-6).trim(), 390);
        vistos.add(nombre);
      }
      const siguiente = clientPage.getByRole('button', { name: 'Página siguiente', exact: true });
      if (vistos.size === 2) break;
      if (!(await siguiente.count()) || !(await siguiente.isEnabled())) break;
      await siguiente.click();
      await clientPage.waitForFunction(
        (old) => document.querySelector('.product-card h2')?.textContent !== old,
        nombre,
      );
    }
    ok('carta UI de otra sesión muestra plato y bebida', vistos.size === 2);
    await page.setViewportSize({ width: 390, height: 480 });
    await page.getByRole('button', { name: 'Productos', exact: true }).click();
    await page.getByRole('button', { name: /Nuevo producto|Nuevo plato|Nueva bebida/ }).click();
    const submit = page.getByRole('button', { name: 'Agregar producto', exact: true });
    await submit.scrollIntoViewIfNeeded();
    ok('acción alcanzable en espacio reducido', await submit.isVisible());
    await capturar(page, 'teclado-simulado', 390);
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await page.waitForURL('**/ingreso');
    await login(page, supervisor);
    await page.getByRole('button', { name: 'Productos', exact: true }).click();
    await page.getByRole('button', { name: /Nuevo producto|Nuevo plato|Nueva bebida/ }).click();
    ok(
      'cambio usuario limpia fotos del formulario',
      (await page.locator('.product-photo img').count()) === 0,
    );
    fs.writeFileSync(path.join(out, 'visual-real.json'), JSON.stringify(resultados, null, 2));
  } catch (e) {
    console.log('BROWSER_ERROR', e.message);
    throw e;
  } finally {
    await browser.close();
    server.close();
    fs.writeFileSync(path.join(out, 'visual-real.json'), JSON.stringify(resultados, null, 2));
  }
}
