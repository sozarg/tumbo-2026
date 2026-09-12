/**
 * Tipos del generador de documentos de prueba.
 *
 * El script es JavaScript porque corre con Node a secas, sin pasar por
 * el compilador de Angular. Este archivo existe para que la prueba
 * `src/app/core/dni/qr-de-prueba.spec.ts` lo pueda importar con tipos
 * en lugar de `any`, que es lo que haría inútil la comprobación.
 */

export interface DocumentoDePrueba {
  /** El texto que va adentro del QR, en el formato del DNI. */
  readonly carga: string;
  /** Cuál de las dos variantes del formato se usó. */
  readonly variante: 'vieja' | 'nueva';
  readonly nombres: string;
  readonly apellidos: string;
  readonly dni: string;
  readonly sexo: 'M' | 'F';
  /** Agregado nuestro: el DNI real no trae correo. */
  readonly correo: string;
}

export function inventarDocumento(azar: () => number, indice?: number): DocumentoDePrueba;

export function inventarTanda(cantidad: number, semilla: number): DocumentoDePrueba[];
