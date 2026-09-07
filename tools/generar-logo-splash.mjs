import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

// 768 px cubren un logo de hasta 256 CSS px en teléfonos con DPR 3.
// Conservamos el PNG maestro y su transparencia; no se altera el diseño.
const original = fileURLToPath(new URL('../public/imagenes/logo.png', import.meta.url));
const destino = fileURLToPath(new URL('../public/imagenes/logo-splash.webp', import.meta.url));
const resultado = await sharp(original)
  .resize(768, 768, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 90, alphaQuality: 100, effort: 6 })
  .toFile(destino);
console.log(`Logo del splash: ${resultado.width} × ${resultado.height}, ${resultado.size} bytes.`);
