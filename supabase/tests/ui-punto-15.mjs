/**
 * Punto 15 por pantalla: los tres juegos y el descuento que decide la base.
 *
 * Camila tiene el pedido confirmado (los juegos se habilitan).
 * 1. Recolección tumbito (10 %): juega una partida de Phaser sin moverse
 *    y pierde; la partida queda registrada sin descuento.
 * 2. Adivinanza del número (15 %): gana buscando por la mitad con las
 *    pistas de la pantalla; es su primer intento en ese juego y la
 *    estadía no tenía descuento: recibe 15 %.
 * 3. Piedra, papel o tijera (20 %): juega hasta ganar; no se acumula,
 *    la cuenta sigue aplicando 15 %.
 *
 * SOLO CONTRA EL SUPABASE LOCAL, con la misma guarda que los otros E2E.
 * Prepara la estadía y la deja como estaba al terminar.
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

const S = 'eeeeeeee-0000-4000-8000-000000000015';
const CAMILA = `(select id from usuarios where correo = 'camila@tumbo.demo')`;
const limpiar = () =>
  sql(`select set_config('tumbo.sin_avisos', 'si', false);
    delete from pedidos where sesion_mesa_id = '${S}';
    delete from sesiones_mesa where id = '${S}';
    update mesas set estado = 'libre' where numero = 5
       and not exists (select 1 from sesiones_mesa s join mesas m on m.id = s.mesa_id
                        where m.numero = 5 and s.estado <> 'cerrada');`);
limpiar();
sql(`select set_config('tumbo.sin_avisos', 'si', false);
  update sesiones_mesa set estado = 'cerrada', cerrada_en = now()
   where estado <> 'cerrada' and cliente_id = ${CAMILA};
  insert into sesiones_mesa (id, mesa_id, cliente_id)
    select '${S}', m.id, ${CAMILA} from mesas m where m.numero = 5;
  insert into pedidos (sesion_mesa_id, estado, enviado_en, confirmado_en)
    values ('${S}', 'confirmado', now(), now());`);
const partidas = () =>
  sql(`select string_agg(j.porcentaje_descuento::int || ':' || p.intento || ':' || p.gano || ':' || p.descuento_otorgado::int, ' ' order by p.jugado_en)
         from partidas_juego p join juegos j on j.id = p.juego_id where p.sesion_mesa_id = '${S}'`);

const resultados = [];
const ok = (nombre, valor) => {
  resultados.push({ nombre, ok: !!valor });
  console.log(`${valor ? 'ok  ' : 'MAL '} ${nombre}`);
  assert.ok(valor, nombre);
};
async function esperar(nombre, condicion, ms = 15000) {
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
const avisos = (page) =>
  page.locator('ion-toast').evaluateAll((ts) => ts.map((t) => String(t.message ?? '')));
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
try {
  const page = await (
    await browser.newContext({ viewport: { width: 360, height: 780 } })
  ).newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${APP}/ingreso`);
  await page.locator('#correo input').fill('camila@tumbo.demo');
  await page.locator('#clave input').fill('Tumbo2026');
  await page.locator('.login-card__submit').click();
  await page.waitForURL('**/operacion');
  const abrirJuegos = async () => {
    await page
      .getByRole('button', { name: /^Juegos(,|$)/ })
      .first()
      .click();
    await page.locator('.game-card:visible').first().waitFor();
  };
  // Al volver del recolector, Ionic puede conservar la página anterior
  // oculta en el DOM: se trabaja solo con lo visible.
  const irAJuego = async (titulo) => {
    for (let i = 0; i < 4; i++) {
      if (await page.locator('.game-card h2:visible', { hasText: titulo }).count()) return;
      await page
        .locator(
          'ion-button[aria-label="Página siguiente"]:visible, ion-button:visible:has(ion-icon[name="arrow-forward-outline"])',
        )
        .first()
        .click();
      await page.waitForTimeout(200);
    }
  };

  // ── 1. Recolección tumbito ────────────────────────────────────────
  await abrirJuegos();
  await revisarAxe(page, 'pantalla de juegos');
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.waitForURL('**/juego-recoleccion');
  await esperar(
    'recolección: el juego de Phaser arranca',
    async () => (await page.locator('#phaser-game canvas').count()) === 1,
  );
  await esperar(
    'recolección: a los 10 segundos termina y, sin moverse, no llega a 50',
    async () => (await page.locator('.resultado').innerText()).startsWith('Necesitabas 50 puntos.'),
    25000,
  );
  ok('recolección, base: partida perdida sin descuento', partidas() === '10:1:false:0');
  await revisarAxe(page, 'fin del recolector');
  await page.getByRole('button', { name: 'Volver', exact: true }).click();
  await page.waitForURL('**/operacion');
  if (process.env.CAPTURAS)
    await page.screenshot({ path: process.env.CAPTURAS + '/vuelta-del-juego.png' });
  ok(
    'al volver del juego se ve el inicio con sus secciones',
    (await page.locator('.hub-title:visible').count()) === 1,
  );

  // ── 2. Adivinanza: gana buscando por la mitad ─────────────────────
  await abrirJuegos();
  await irAJuego('Adivinanza del número');
  const estadoAdivinanza = () => page.locator('tumbo-juego-adivinanza:visible .estado').innerText();
  let bajo = 1;
  let alto = 50;
  for (let i = 0; i < 6; i++) {
    const medio = Math.floor((bajo + alto) / 2);
    const previo = await estadoAdivinanza();
    await page.locator('#adivinanza-numero:visible').fill(String(medio));
    await page.locator('tumbo-juego-adivinanza:visible button[type="submit"]').click();
    // La pista cambia en cada intento (cuenta los que quedan): se espera.
    let estado = previo;
    for (let k = 0; k < 40 && estado === previo; k++) {
      await page.waitForTimeout(50);
      estado = await estadoAdivinanza();
    }
    if (estado.startsWith('¡Acertaste!')) break;
    if (estado.includes(`mayor que ${medio}`)) bajo = medio + 1;
    else alto = medio - 1;
  }
  await esperar('adivinanza: gana y la base le da 15 %', async () =>
    (await avisos(page)).includes('¡Ganaste! Tenés 15 % de descuento en la cuenta.'),
  );
  ok('adivinanza, base: 15 % al primer intento', partidas() === '10:1:false:0 15:1:true:15');
  await esperar('el chip muestra el descuento ganado', async () =>
    (await page.locator('.discount-chip:visible').innerText()).includes('15% ganado'),
  );

  // ── 3. Piedra, papel o tijera: gana, pero no se acumula ───────────
  await irAJuego('Piedra, papel o tijera');
  // Cada vuelta mira qué hay en pantalla: «Jugar de nuevo» (la mano
  // terminó: ganó o perdió) o las jugadas (empezó o hubo empate).
  let gano = false;
  const juego = page.locator('tumbo-juego-piedra-papel-tijera:visible');
  const otra = juego.getByRole('button', { name: 'Jugar de nuevo', exact: true });
  const piedra = juego.getByRole('button', { name: 'Piedra', exact: true });
  for (let i = 0; i < 60 && !gano; i++) {
    for (let k = 0; k < 40 && !(await otra.count()) && !(await piedra.count()); k++)
      await page.waitForTimeout(50);
    if (await otra.count()) {
      if ((await juego.locator('.estado').innerText()).includes('¡ganaste!')) gano = true;
      else await otra.click();
    } else {
      await piedra.click();
      await page.waitForTimeout(150);
    }
  }
  ok('piedra, papel o tijera: termina ganando', gano);
  await esperar('piedra, papel o tijera: no se acumula y lo dice', async () =>
    (await avisos(page)).includes('¡Ganaste! Ya tenías 15 % de descuento: no se acumula.'),
  );
  ok(
    'base: ninguna partida de 20 % dio descuento y la cuenta aplica 15 %',
    sql(`select count(*) from partidas_juego p join juegos j on j.id = p.juego_id
          where p.sesion_mesa_id = '${S}' and j.porcentaje_descuento = 20 and p.descuento_otorgado > 0`) ===
      '0' && sql(`select descuento_pct::int from calcular_cuenta('${S}')`) === '15',
  );
  await revisarAxe(page, 'juego de piedra, papel o tijera');
} finally {
  await browser.close();
  limpiar();
}

const fallidos = resultados.filter((r) => !r.ok);
console.log(
  `\n${resultados.length - fallidos.length}/${resultados.length} comprobaciones correctas.`,
);
process.exitCode = fallidos.length ? 1 : 0;
