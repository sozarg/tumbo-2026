import jpeg from 'npm:jpeg-js@0.4.4';
import { Buffer } from 'node:buffer';
// @deno-types="npm:@types/pngjs@6.0.5"
import { PNG } from 'npm:pngjs@7.0.0';
import { EntradaInvalida } from './validacion-altas.ts';

/** Comprueba dimensiones antes de asignar memoria y decodifica/reencodea: no confía en MIME ni extensión. */
export async function imagenSegura(archivo: File): Promise<Uint8Array> {
  if (!archivo.size || archivo.size > 5 * 1024 * 1024)
    throw new EntradaInvalida('Cada foto debe ocupar entre 1 byte y 5 MB.');
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const v = new DataView(bytes.buffer);
  let ancho = 0,
    alto = 0;
  if (bytes.length > 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)) {
    ancho = v.getUint32(16);
    alto = v.getUint32(20);
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    for (let i = 2; i + 8 < bytes.length;) {
      if (bytes[i] !== 255) break;
      const marcador = bytes[i + 1];
      if (marcador === 0xda || marcador === 0xd9) break;
      const longitud = v.getUint16(i + 2);
      if (longitud < 2 || i + 2 + longitud > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2].includes(marcador)) {
        alto = v.getUint16(i + 5);
        ancho = v.getUint16(i + 7);
        break;
      }
      i += longitud + 2;
    }
  }
  if (!ancho || !alto || ancho > 4096 || alto > 4096 || ancho * alto > 16000000)
    throw new EntradaInvalida(
      'Foto inválida: se admite JPEG o PNG de hasta 4096 px y 16 megapíxeles.',
    );
  try {
    const imagen =
      bytes[0] === 137
        ? PNG.sync.read(Buffer.from(bytes), { checkCRC: true })
        : jpeg.decode(bytes, {
            useTArray: true,
            maxResolutionInMP: 16,
            maxMemoryUsageInMB: 128,
            tolerantDecoding: false,
          });
    if (imagen.width !== ancho || imagen.height !== alto)
      throw new Error('Dimensiones incoherentes');
    return new Uint8Array(jpeg.encode(imagen, 82).data);
  } catch {
    throw new EntradaInvalida('La foto está dañada o no se puede decodificar. Elegí otra.');
  }
}
