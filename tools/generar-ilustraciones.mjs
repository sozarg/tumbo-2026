#!/usr/bin/env node
/**
 * Genera las versiones chicas de las ilustraciones del fondo decorativo.
 *
 * EL PROBLEMA
 * `public/imagenes/tumbito/*.webp` son los originales de diseño: miden
 * entre 1119 y 1353 píxeles de ancho. En pantalla nunca se dibujan a más
 * de 540 (escritorio) o 272 (celular). El navegador igual tiene que
 * decodificar las seis a tamaño completo: son 7,4 millones de píxeles de
 * golpe, y eso se come entre 50 y 80 milisegundos del hilo principal
 * justo cuando la splash todavía se está animando. Se ve como un tirón.
 *
 * Medido con requestAnimationFrame sobre /presentacion:
 *   con las seis ilustraciones      99, 120 y 76 ms de peor cuadro
 *   sin ninguna ilustración         42, 37 y 44 ms
 *   sin ninguna imagen              27, 32 y 32 ms
 *
 * QUÉ HACE ESTE ARCHIVO
 * Escribe, al lado de cada original, tres versiones más chicas con el
 * ancho en el nombre (`sopa-240.webp`, `sopa-480.webp`, `sopa-960.webp`).
 * El navegador elige cuál bajar según el tamaño real en pantalla y la
 * densidad del dispositivo; de eso se encarga el `srcset` del componente
 * `fondo-decorativo` junto con el cargador de imágenes de app.config.ts.
 *
 * LOS ORIGINALES NO SE TOCAN. Siguen siendo la fuente de verdad y el
 * último escalón del srcset, para pantallas grandes con mucha densidad.
 *
 * Se corre solo cuando cambian las ilustraciones:
 *
 *     npm run ilustraciones
 */
import { readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Los anchos del srcset.
 *
 * 240 cubre el café en celular (100 px de ancho por 3 de densidad = 300,
 * y el navegador redondea para arriba al escalón siguiente); 480 cubre la
 * carne y la ensalada; 960 cubre la sopa y los fideos en escritorio.
 * Arriba de eso queda el original.
 */
const ANCHOS = [240, 480, 960];

/** Reconoce `sopa-480.webp` para no generar variantes de las variantes. */
const ES_VARIANTE = /-\d+\.webp$/;

const raiz = process.cwd();
const carpeta = path.join(raiz, 'public', 'imagenes', 'tumbito');

if (!existsSync(carpeta)) {
  console.error('[ilustraciones] No existe public/imagenes/tumbito/');
  process.exit(1);
}

const originales = (await readdir(carpeta))
  .filter((nombre) => nombre.endsWith('.webp') && !ES_VARIANTE.test(nombre))
  .sort();

if (originales.length === 0) {
  console.error('[ilustraciones] No hay ilustraciones en public/imagenes/tumbito/');
  process.exit(1);
}

/**
 * ¿Hace falta rehacer esta variante?
 *
 * Comprimir las dieciocho variantes lleva más de un minuto, así que el
 * script está encadenado al `prebuild` pero se saltea el trabajo si ya
 * está hecho. Se rehace solo si la variante no existe o si el original
 * es más nuevo que ella, que es exactamente el caso "Terrile cambió una
 * ilustración". Si alguien quiere forzarlo: `npm run ilustraciones -- --forzar`.
 */
const FORZAR = process.argv.includes('--forzar');

async function estaAlDia(destino, origen) {
  if (FORZAR || !existsSync(destino)) {
    return false;
  }

  const [variante, original] = await Promise.all([stat(destino), stat(origen)]);
  return variante.mtimeMs >= original.mtimeMs;
}

let escritas = 0;
let salteadas = 0;

for (const nombre of originales) {
  const origen = path.join(carpeta, nombre);
  const base = nombre.replace(/\.webp$/, '');
  const { width, height } = await sharp(origen).metadata();

  const generados = [];

  for (const ancho of ANCHOS) {
    // Si el original ya es más chico que el escalón, ese escalón no
    // aporta nada: sería agrandar la imagen y ocupar lugar al pedo.
    if (ancho >= width) {
      continue;
    }

    const destino = path.join(carpeta, `${base}-${ancho}.webp`);

    if (await estaAlDia(destino, origen)) {
      salteadas += 1;
      continue;
    }

    const datos = await sharp(origen)
      .resize(ancho, null, { fit: 'inside', kernel: 'lanczos3' })
      .webp({ quality: 82, effort: 6 })
      .toBuffer();

    await writeFile(destino, datos);
    generados.push(`${ancho}px ${Math.round(datos.length / 1024)}kB`);
    escritas += 1;
  }

  if (generados.length > 0) {
    console.log(`  ${base.padEnd(10)} original ${width}×${height} · ${generados.join(' · ')}`);
  }
}

if (escritas === 0) {
  console.log(`[ilustraciones] Las ${salteadas} variantes ya estaban al día.`);
} else {
  console.log(
    `[ilustraciones] ${escritas} variantes escritas a partir de ${originales.length} originales` +
      (salteadas > 0 ? `, ${salteadas} ya estaban al día` : '') +
      '.\n                Los originales quedaron intactos.',
  );
}
