import { Injectable } from '@angular/core';

/**
 * Dibuja los códigos QR de la aplicación (punto 4).
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ NO ALCANZABAN LOS PNG SUELTOS
 *
 * En `public/imagenes/` hay cinco archivos hechos a mano —`qr-mesa-1`
 * a `qr-mesa-5`— y el código los buscaba por número: `qr-mesa-${n}.png`.
 * Eso se rompe de dos maneras distintas y las dos importan:
 *
 *   1. LA MESA NUEVA NO TIENE ARCHIVO. El punto 4 pide dar de alta una
 *      mesa y que su QR se genere «de forma automática». Con archivos
 *      fijos, la mesa 6 pedía `qr-mesa-6.png`, que no existe: 404 y un
 *      cuadrado roto justo en la funcionalidad que se está mostrando.
 *
 *   2. EL CONTENIDO NO COINCIDE. Esos PNG dicen `TUMBO://mesa/tumbo-
 *      mesa-1`, que es el token del modo demostración. Contra la base de
 *      verdad el token es el `qr_token` de la fila —32 caracteres al
 *      azar que pone PostgreSQL al insertar—, así que escanear el PNG
 *      viejo no encuentra ninguna mesa.
 *
 * Dibujarlo acá arregla las dos: el QR sale del token real de la fila,
 * y existe para cualquier mesa sin que nadie tenga que generar nada a
 * mano.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ `import()` Y NO UN IMPORT COMÚN
 *
 * `qrcode` pesa alrededor de 50 kB y hace falta en UNA pantalla, la de
 * mesas, y solo cuando alguien toca «Ver QR». Con un import normal entra
 * en el paquete inicial y lo carga todo el mundo —el cliente que solo
 * quiere ver el menú también—. Con `import()` viaja aparte y se baja la
 * primera vez que se abre un QR.
 */
@Injectable({ providedIn: 'root' })
export class CodigoQrService {
  /**
   * El módulo, una sola vez.
   *
   * Se guarda la PROMESA y no el módulo ya resuelto: si alguien abre dos
   * QR seguidos antes de que termine la primera carga, las dos llamadas
   * esperan la misma descarga en vez de arrancar dos.
   */
  private modulo?: Promise<typeof import('qrcode')>;

  /**
   * El contenido que se graba en el QR de una mesa.
   *
   * El formato `TUMBO://mesa/<token>` es el que ya usaban los PNG
   * hechos a mano, y por lo tanto el que el lector espera encontrar. Se
   * respeta tal cual para no tener que tocar el escaneo.
   */
  contenidoDeMesa(qrToken: string): string {
    return `TUMBO://mesa/${qrToken}`;
  }

  /**
   * Devuelve el QR como PNG en una data URL, lista para un `<img>`.
   *
   * `lado` en 512 px es el tamaño en el que se dibuja, no el que se ve:
   * en pantalla lo achica el CSS, y al descargarlo se guarda en ese
   * tamaño, que es suficiente para imprimirlo y pegarlo en la mesa.
   *
   * `margin: 2` son los módulos de silencio del borde. La norma pide 4;
   * 2 alcanza para que cualquier lector lo tome y deja el dibujo más
   * grande dentro del mismo cuadrado.
   *
   * El nivel de corrección `M` tolera un 15 % de daño, que es lo que
   * hace falta cuando el papel queda sobre una mesa y se mancha.
   */
  async comoPng(contenido: string, lado = 512): Promise<string> {
    const qrcode = await (this.modulo ??= import('qrcode'));

    return qrcode.toDataURL(contenido, {
      width: lado,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#003592ff', light: '#ffffffff' },
    });
  }
}
