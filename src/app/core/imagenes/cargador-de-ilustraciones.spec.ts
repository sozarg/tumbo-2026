import { ANCHOS_DE_ILUSTRACION, cargadorDeIlustraciones } from './cargador-de-ilustraciones';

describe('cargadorDeIlustraciones', () => {
  it('devuelve la ruta tal cual cuando no le piden un ancho', () => {
    // Es el `src` de respaldo que arma NgOptimizedImage para los
    // navegadores que ignoran srcset.
    expect(cargadorDeIlustraciones({ src: 'imagenes/tumbito/sopa.webp' })).toBe(
      'imagenes/tumbito/sopa.webp',
    );
  });

  it('arma el nombre de la variante para cada ancho generado', () => {
    for (const ancho of ANCHOS_DE_ILUSTRACION) {
      expect(cargadorDeIlustraciones({ src: 'imagenes/tumbito/ensalada.webp', width: ancho })).toBe(
        `imagenes/tumbito/ensalada-${ancho}.webp`,
      );
    }
  });

  it('cae al original cuando el ancho no es uno de los generados', () => {
    // El último escalón del ngSrcset es el ancho nativo de cada imagen.
    expect(cargadorDeIlustraciones({ src: 'imagenes/tumbito/sopa.webp', width: 1218 })).toBe(
      'imagenes/tumbito/sopa.webp',
    );
  });

  it('no toca las imágenes que no son ilustraciones del fondo', () => {
    // El logo y el logotipo con el nombre no tienen variantes: si el
    // cargador les inventara una ruta, quedarían rotos.
    expect(cargadorDeIlustraciones({ src: 'imagenes/logo.png', width: 480 })).toBe(
      'imagenes/logo.png',
    );
    expect(cargadorDeIlustraciones({ src: 'imagenes/logo-nombre.png', width: 240 })).toBe(
      'imagenes/logo-nombre.png',
    );
  });

  /**
   * La lista de anchos vive dos veces: acá y en
   * `tools/generar-ilustraciones.mjs`, que corre en Node y no puede
   * compartir código con lo que viaja al navegador. Que los archivos
   * existan de verdad no lo puede comprobar esta prueba —corre en el
   * navegador, sin acceso al disco—: de eso se encarga el `prebuild`,
   * que corre el generador antes de cada compilación y rehace lo que
   * falte. Esto solo congela los números para que no se cambien de un
   * lado sin mirar el otro.
   */
  it('los anchos declarados son los tres que genera el script', () => {
    expect([...ANCHOS_DE_ILUSTRACION]).toEqual([240, 480, 960]);
  });
});
