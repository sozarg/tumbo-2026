#!/usr/bin/env node
/**
 * Corrige los íconos de Android que genera @capacitor/assets.
 *
 * EL PROBLEMA
 * `npx @capacitor/assets generate --android` escribe
 * `ic_launcher_foreground.png` con el tamaño del ícono ANTIGUO (48dp:
 * 192 píxeles en xxxhdpi) en lugar del tamaño del ícono ADAPTABLE
 * (108dp: 432 píxeles). El celular lo tiene que agrandar 2,25 veces para
 * dibujarlo, y se ve pixelado.
 *
 * Se nota en dos lugares:
 *   1. El ícono en la pantalla de inicio del celular.
 *   2. La pantalla de carga del sistema. Desde Android 12, el tema
 *      Theme.SplashScreen usa el ícono del lanzador, así que hereda el
 *      mismo defecto.
 *
 * Además, el `ic_launcher.xml` que genera trae un `inset` del 16,7 % en
 * las dos capas. Como nuestro `assets/icon-foreground.png` ya viene con
 * su propio aire —el 20 % que pide la zona segura de Android—, ese
 * recuadro se sumaba al nuestro y el logo terminaba ocupando el 40 % del
 * ícono en vez del 60 %. Chico y agrandado a la vez.
 *
 * QUÉ HACE ESTE ARCHIVO
 * Reescribe las dos capas del ícono adaptable en las densidades
 * correctas, el ícono clásico para los Android viejos, y los dos XML sin
 * el recuadro de más.
 *
 * Corre después de @capacitor/assets, encadenado en el script
 * `icons:android` de package.json.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const raiz = process.cwd();
const res = path.join(raiz, 'android', 'app', 'src', 'main', 'res');

if (!existsSync(res)) {
  console.log('[iconos] No hay carpeta android/. Corré antes: npx cap add android');
  process.exit(0);
}

/**
 * Densidades de Android. El multiplicador es respecto de mdpi, que es
 * la densidad de referencia (1 dp = 1 píxel).
 */
const DENSIDADES = [
  ['ldpi', 0.75],
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
];

/** El ícono adaptable mide 108dp de lado. Es lo que estaba mal. */
const LADO_ADAPTABLE = 108;
/** El ícono clásico, para Android anterior al 8, mide 48dp. */
const LADO_CLASICO = 48;

const frente = await readFile(path.join(raiz, 'assets', 'icon-foreground.png'));
const fondo = await readFile(path.join(raiz, 'assets', 'icon-background.png'));
const clasico = await readFile(path.join(raiz, 'assets', 'icon.png'));

async function escalar(imagen, lado) {
  return sharp(imagen)
    .resize(lado, lado, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

/** El ícono clásico redondo se recorta a círculo, como espera Android. */
async function recortarCirculo(imagen, lado) {
  const mascara = Buffer.from(
    `<svg width="${lado}" height="${lado}"><circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}" fill="#fff"/></svg>`,
  );
  return sharp(await escalar(imagen, lado))
    .composite([{ input: mascara, blend: 'dest-in' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

let escritos = 0;
for (const [densidad, factor] of DENSIDADES) {
  const carpeta = path.join(res, `mipmap-${densidad}`);
  await mkdir(carpeta, { recursive: true });

  const ladoAdaptable = Math.round(LADO_ADAPTABLE * factor);
  const ladoClasico = Math.round(LADO_CLASICO * factor);

  await writeFile(
    path.join(carpeta, 'ic_launcher_foreground.png'),
    await escalar(frente, ladoAdaptable),
  );
  await writeFile(
    path.join(carpeta, 'ic_launcher_background.png'),
    await escalar(fondo, ladoAdaptable),
  );
  await writeFile(path.join(carpeta, 'ic_launcher.png'), await escalar(clasico, ladoClasico));
  await writeFile(
    path.join(carpeta, 'ic_launcher_round.png'),
    await recortarCirculo(clasico, ladoClasico),
  );
  escritos += 4;
  console.log(`  ${densidad.padEnd(8)} adaptable ${ladoAdaptable}px · clásico ${ladoClasico}px`);
}

/**
 * Los XML sin `inset`. El aire ya lo trae assets/icon-foreground.png:
 * el logo ocupa el 60 % del lienzo, que entra cómodo en la zona segura
 * del 66 % que garantiza Android para cualquier forma de recorte.
 */
const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

const carpetaXml = path.join(res, 'mipmap-anydpi-v26');
await mkdir(carpetaXml, { recursive: true });
await writeFile(path.join(carpetaXml, 'ic_launcher.xml'), xml);
await writeFile(path.join(carpetaXml, 'ic_launcher_round.xml'), xml);

console.log(
  `[iconos] ${escritos} imágenes y 2 XML corregidos.\n` +
    '         El ícono adaptable ahora sale a 432px en xxxhdpi, no a 192.',
);
