import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = process.cwd();
const source = path.join(root, 'public', 'imagenes', 'logo.png');
const output = path.join(root, 'public', 'icons');
const regularSizes = [16, 32, 48, 180, 192, 512];

await mkdir(output, { recursive: true });
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
  const buffer = await createIcon(size, 0.14, { r: 252, g: 237, b: 187, alpha: 1 });
  await writeFile(path.join(output, `icon-${size}-maskable.png`), buffer);
}

await writeFile(path.join(root, 'public', 'apple-touch-icon.png'), generated.get(180));
await writeFile(path.join(root, 'public', 'favicon.ico'), await pngToIco([
  path.join(output, 'icon-16.png'),
  path.join(output, 'icon-32.png'),
  path.join(output, 'icon-48.png'),
]));

console.log('Íconos TUMBO generados desde public/imagenes/logo.png');
