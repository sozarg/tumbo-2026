import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = process.cwd();
const source = path.join(root, 'public', 'imagenes', 'logo.png');
const output = path.join(root, 'public', 'icons');
const salidaCapacitor = path.join(root, 'assets');
const regularSizes = [16, 32, 48, 180, 192, 512];

// Colores de marca, los mismos que declara src/styles.scss
const CREMA = { r: 251, g: 241, b: 213, alpha: 1 }; // --tumbo-crema-fondo
const CREMA_BRILLANTE = { r: 252, g: 237, b: 187, alpha: 1 }; // --tumbo-crema-brillante

await mkdir(output, { recursive: true });
await mkdir(salidaCapacitor, { recursive: true });
const logo = await readFile(source);

async function createIcon(size, paddingRatio = 0.08, background = { r: 0, g: 0, b: 0, alpha: 0 }) {
  const contentSize = Math.round(size * (1 - paddingRatio * 2));
  const content = await sharp(logo)
    .resize(contentSize, contentSize, { fit: 'contain', withoutEnlargement: false })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: size <= 48 })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: content, gravity: 'center' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: size <= 48 })
    .toBuffer();
}

const generated = new Map();
for (const size of regularSizes) {
  const file = path.join(output, `icon-${size}.png`);
  const buffer = await createIcon(size);
  await writeFile(file, buffer);
  generated.set(size, buffer);
}

for (const size of [192, 512]) {
  const buffer = await createIcon(size, 0.14, CREMA_BRILLANTE);
  await writeFile(path.join(output, `icon-${size}-maskable.png`), buffer);
}

// ───────────────────────────────────────────────────────────────────
// FUENTES PARA EL ÍCONO DE ANDROID
//
// Estos cuatro archivos NO son los íconos finales: son las imágenes de
// las que parte `npx @capacitor/assets generate --android`, que se
// encarga de recortarlas a todas las densidades que pide Android.
//
// Van en assets/ con estos nombres exactos porque es donde los busca
// esa herramienta. Cambiarles el nombre la deja sin material.
// ───────────────────────────────────────────────────────────────────

// Ícono clásico: el que se ve en Android viejo y en la lista de apps.
await writeFile(
  path.join(salidaCapacitor, 'icon.png'),
  await createIcon(1024, 0.08, CREMA),
);

// Ícono adaptable: Android lo recorta con la forma que tenga configurada
// el celular (círculo, cuadrado redondeado, gota). Solo garantiza que se
// vea el 66% central, así que el logo va con 20% de aire de cada lado:
// con menos, el recorte circular le come el borde naranja.
await writeFile(
  path.join(salidaCapacitor, 'icon-foreground.png'),
  await createIcon(1024, 0.2),
);

await writeFile(
  path.join(salidaCapacitor, 'icon-background.png'),
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: CREMA } })
    .png({ compressionLevel: 9 })
    .toBuffer(),
);

// Pantalla de carga nativa. El requisito excluyente R14 pide que la
// presentación estática muestre el ícono, el nombre del grupo y los
// apellidos y nombres de los cuatro integrantes, así que NO se genera
// desde el logo pelado: se rasteriza public/imagenes/splash-estatica.svg,
// que ya tiene todo eso.
//
// El <image> del SVG apunta al logo con una ruta absoluta que sharp no
// resuelve —no carga archivos externos, por seguridad—, así que se
// incrusta el PNG como data URI antes de rasterizar. Sin esto el círculo
// del medio sale vacío.
const svg = (await readFile(path.join(root, 'public', 'imagenes', 'splash-estatica.svg'), 'utf8'))
  .replace('href="/imagenes/logo.png"', `href="data:image/png;base64,${logo.toString('base64')}"`);

// El diseño es vertical (1080x1920) y Android recorta la splash al alto
// y ancho de cada pantalla. Se lo deja a 2400 de alto dentro de un lienzo
// cuadrado de 2732: así el recorte de un celular en vertical se come solo
// el margen crema y ningún texto queda cortado.
const presentacion = await sharp(Buffer.from(svg))
  .resize({ height: 2400 })
  .png({ compressionLevel: 9 })
  .toBuffer();

const splash = await sharp({
  create: { width: 2732, height: 2732, channels: 4, background: CREMA },
})
  .composite([{ input: presentacion, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(path.join(salidaCapacitor, 'splash.png'), splash);
await writeFile(path.join(salidaCapacitor, 'splash-dark.png'), splash);

await writeFile(path.join(root, 'public', 'apple-touch-icon.png'), generated.get(180));
await writeFile(path.join(root, 'public', 'favicon.ico'), await pngToIco([
  path.join(output, 'icon-16.png'),
  path.join(output, 'icon-32.png'),
  path.join(output, 'icon-48.png'),
]));

console.log(
  'Íconos TUMBO generados desde public/imagenes/logo.png\n' +
    '  public/icons/   → los del navegador y la PWA\n' +
    '  assets/         → las fuentes del ícono de Android\n\n' +
    'Para que lleguen al APK falta: npm run icons:android',
);
