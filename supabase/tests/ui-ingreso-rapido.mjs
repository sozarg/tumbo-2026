/**
 * Ingreso rápido: el carrusel muestra solo cuentas de demostración que
 * funcionan, y cada acceso entra con el perfil que dice.
 *
 * SOLO CONTRA EL SUPABASE LOCAL, con la misma guarda que los otros E2E.
 * No escribe datos.
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
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

const resultados = [];
const ok = (nombre, valor) => {
  resultados.push({ nombre, ok: !!valor });
  console.log(`${valor ? 'ok  ' : 'MAL '} ${nombre}`);
  assert.ok(valor, nombre);
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await (
    await browser.newContext({ viewport: { width: 360, height: 780 } })
  ).newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${APP}/ingreso`);
  const acceso = page.locator('ion-button.quick-user');
  await acceso.waitFor();
  /** Avanza el carrusel y espera a que el botón muestre otra cuenta. */
  const siguiente = async (actual) => {
    await page.getByRole('button', { name: 'Perfil siguiente' }).click();
    for (let i = 0; i < 20 && (await etiquetaDe()) === actual; i++) await page.waitForTimeout(100);
  };
  // Lo que muestra el botón: perfil y nombre de la cuenta.
  const etiquetaDe = async () =>
    (await page.locator('.quick-user__texto').innerText()).replace(/\s+/g, ' ').trim();

  // Recorre el carrusel hasta volver al primero.
  const etiquetas = [];
  for (let i = 0; i < 40; i++) {
    const etiqueta = await etiquetaDe();
    if (etiquetas.includes(etiqueta)) break;
    etiquetas.push(etiqueta);
    await siguiente(etiqueta);
  }
  ok(
    `el carrusel muestra ${etiquetas.length} accesos: ${etiquetas.join(' | ')}`,
    etiquetas.length > 0,
  );
  ok(
    'ninguno es un cliente del historial',
    etiquetas.every((e) => !/Rossi|Historial/.test(e ?? '')),
  );

  for (const etiqueta of etiquetas) {
    await page.goto(`${APP}/ingreso`);
    await acceso.waitFor();
    for (let i = 0; i < 40 && (await etiquetaDe()) !== etiqueta; i++)
      await siguiente(await etiquetaDe());
    // El acceso rápido completa el formulario; se entra con «Ingresar».
    await acceso.click();
    await page.locator('.login-card__submit').click();
    const entro = await page
      .waitForURL('**/operacion', { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (!entro) {
      const error = await page.locator('[role="alert"], .login-error, ion-toast').allInnerTexts();
      ok(`«${etiqueta}» entra (${error.join(' ').trim() || 'sin mensaje'})`, false);
    }
    const visto = await page.locator('.operation-brand__text span').first().innerText();
    ok(`«${etiqueta}» entra como ${visto}`, etiqueta.toLowerCase().includes(visto.toLowerCase()));
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await page.waitForURL('**/ingreso');
  }
} finally {
  await browser.close();
}

const fallidos = resultados.filter((r) => !r.ok);
console.log(
  `\n${resultados.length - fallidos.length}/${resultados.length} comprobaciones correctas.`,
);
process.exitCode = fallidos.length ? 1 : 0;
