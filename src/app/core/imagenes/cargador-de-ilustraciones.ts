import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { Provider } from '@angular/core';

/**
 * Los anchos que genera `tools/generar-ilustraciones.mjs`.
 *
 * Si cambian allá, cambian acá: son la misma lista y no hay forma de
 * compartirla, porque el script corre en Node y esto viaja al navegador.
 * La prueba `cargador-de-ilustraciones.spec.ts` deja constancia.
 */
export const ANCHOS_DE_ILUSTRACION = [240, 480, 960] as const;

/** `imagenes/tumbito/sopa.webp` → base `imagenes/tumbito/sopa`. */
const ILUSTRACION = /^(imagenes\/tumbito\/[a-z-]+)\.webp$/;

/**
 * Arma la ruta de la variante que el navegador pidió.
 *
 * NgOptimizedImage llama a esta función una vez por cada ancho del
 * `ngSrcset` para construir el atributo `srcset`, y una vez sin ancho
 * para el `src` de respaldo. Cuando no hay ancho, o cuando la imagen no
 * es una de las ilustraciones del fondo, devuelve la ruta tal cual: el
 * logo y el logotipo con el nombre no tienen variantes.
 */
export function cargadorDeIlustraciones({ src, width }: ImageLoaderConfig): string {
  if (!width) {
    return src;
  }

  const coincidencia = ILUSTRACION.exec(src);
  if (!coincidencia) {
    return src;
  }

  // Un ancho fuera de la lista significa el original, que es el último
  // escalón del srcset y el que mejor calidad tiene.
  if (!(ANCHOS_DE_ILUSTRACION as readonly number[]).includes(width)) {
    return src;
  }

  return `${coincidencia[1]}-${width}.webp`;
}

export function provideCargadorDeIlustraciones(): Provider {
  return { provide: IMAGE_LOADER, useValue: cargadorDeIlustraciones };
}
