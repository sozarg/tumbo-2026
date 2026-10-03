import { TestBed } from '@angular/core/testing';
import { CodigoQrService } from './codigo-qr.service';

/**
 * Lo que se prueba acá es EL CONTENIDO del código, no el dibujo.
 *
 * El dibujo lo hace `qrcode`, que ya viene probado y además necesita un
 * `<canvas>` de verdad: jsdom no lo tiene, así que un test de
 * `comoPng()` no probaría nada y fallaría por una razón que no es la
 * nuestra.
 *
 * El contenido sí es nuestro y sí se puede romper en silencio. El
 * formato `TUMBO://mesa/<token>` es el que traen los PNG que ya están
 * en `public/imagenes/` y el que el lector busca al escanear: si alguien
 * le cambia una barra o la mayúscula, los códigos nuevos dejan de
 * encontrar la mesa y no hay ningún error que lo avise —el escaneo
 * simplemente no reconoce nada—. Este test es el que avisa.
 */
describe('CodigoQrService', () => {
  let servicio: CodigoQrService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(CodigoQrService);
  });

  it('arma el contenido del QR de mesa con el formato que espera el lector', () => {
    expect(servicio.contenidoDeMesa('tumbo-mesa-1')).toBe('TUMBO://mesa/tumbo-mesa-1');
  });

  it('usa el token tal cual, que contra la base es el `qr_token` de la fila', () => {
    const token = '9f3c1a7b2d4e4f8a9b0c1d2e3f4a5b6c';
    expect(servicio.contenidoDeMesa(token)).toBe(`TUMBO://mesa/${token}`);
  });

  /*
   * El PNG impreso del cartel de entrada dice `TUMBO://ingreso` y la
   * constante está en minúsculas. Mientras se compararon con `===`,
   * escanear el cartel contestaba «ese código no es el QR de
   * ingreso» y no había forma de anotarse en la lista de espera.
   */
  it('reconoce el cartel de entrada sin importar la caja del esquema', () => {
    expect(servicio.esContenidoDeEntrada('TUMBO://ingreso')).toBe(true);
    expect(servicio.esContenidoDeEntrada('tumbo://ingreso')).toBe(true);
    expect(servicio.esContenidoDeEntrada('  TUMBO://Ingreso  ')).toBe(true);
  });

  it('no confunde el cartel de entrada con otro código', () => {
    expect(servicio.esContenidoDeEntrada('TUMBO://mesa/tumbo-mesa-1')).toBe(false);
    expect(servicio.esContenidoDeEntrada('tumbo://ingreso/otra-cosa')).toBe(false);
    expect(servicio.esContenidoDeEntrada('')).toBe(false);
  });
});
