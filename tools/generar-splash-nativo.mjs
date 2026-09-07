import { readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const crema = '#FBF1D5';

export async function generarSplashNativo() {
  const logo = await readFile(path.join(raiz, 'public/imagenes/logo.png'));
  const plantilla = await readFile(path.join(raiz, 'public/imagenes/splash-estatica.svg'), 'utf8');
  const svg = Buffer.from(
    plantilla.replace('/imagenes/logo.png', `data:image/png;base64,${logo.toString('base64')}`),
  );
  const generar = (width, height) =>
    sharp(svg)
      .resize(width, height, { fit: 'contain', background: crema })
      .png({ compressionLevel: 9 })
      .toBuffer();

  // Fuentes de Capacitor: mismo fondo incluso si el sistema usa tema oscuro.
  const fuente = await generar(2732, 2732);
  for (const nombre of ['splash.png', 'splash-dark.png']) {
    await writeFile(path.join(raiz, 'public/assets', nombre), fuente);
  }

  // Conserva las dimensiones de cada recurso Android ya configurado.
  // No regenera ni modifica los íconos del lanzador.
  const recursos = path.join(raiz, 'android/app/src/main/res');
  if (!existsSync(recursos)) return;
  let cantidad = 0;
  for (const carpeta of await readdir(recursos)) {
    if (!carpeta.startsWith('drawable')) continue;
    const destino = path.join(recursos, carpeta, 'splash.png');
    if (!existsSync(destino)) continue;
    const { width, height } = await sharp(destino).metadata();
    await writeFile(destino, await generar(width, height));
    cantidad++;
  }
  console.log(`Splash nativo actualizado: ${cantidad} recursos Android.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generarSplashNativo();
}
