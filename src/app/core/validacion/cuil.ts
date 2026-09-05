/**
 * El CUIL argentino: cómo se arma y cómo se comprueba.
 *
 * ESTRUCTURA
 *     27 - 43210987 - 6
 *     ▲       ▲        ▲
 *     │       │        └── dígito verificador (módulo 11)
 *     │       └─────────── el DNI, con ceros adelante hasta 8
 *     └─────────────────── prefijo: 20 varón, 27 mujer, 23 el caso raro
 *
 * EL DÍGITO VERIFICADOR NO ES UN NÚMERO CUALQUIERA
 * Sale de multiplicar los diez primeros dígitos por una serie de pesos
 * fijos, sumar, y restarle a 11 el resto de dividir por 11. Por eso un
 * CUIL mal tipeado se puede detectar sin consultar a nadie: el número
 * se contradice a sí mismo.
 *
 * EL CASO RARO
 * Cuando el resto da 1, el dígito daría 10, que no entra en un solo
 * caracter. La convención es cambiar el prefijo a 23 y recalcular. Esta
 * implementación lo recalcula de verdad en lugar de usar los valores
 * memorizados (9 para varón, 4 para mujer): da lo mismo —la diferencia
 * entre los prefijos es constante— pero así se ve por qué.
 */

/** Los pesos del módulo 11, en orden. No son arbitrarios: es el estándar. */
const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;

/**
 * El dígito que le corresponde a esos diez números.
 *
 * Devuelve `null` cuando el resto da 1, que es la señal de que hay que
 * cambiar el prefijo a 23 y volver a preguntar.
 */
function digitoDe(diezDigitos: string): number | null {
  if (!/^[0-9]{10}$/.test(diezDigitos)) {
    return null;
  }

  const suma = PESOS.reduce((total, peso, i) => total + peso * Number(diezDigitos[i]), 0);
  const resto = suma % 11;

  if (resto === 0) return 0;
  if (resto === 1) return null;
  return 11 - resto;
}

/** El prefijo según el sexo, tal como lo asigna la AFIP. */
export type SexoDeCuil = 'M' | 'F';

/**
 * Arma el CUIL que le corresponde a un DNI.
 *
 * Se usa en el simulador del lector de DNI: el código de barras del
 * documento trae el número y el sexo, y el CUIL SE DERIVA de esos dos.
 * No se inventa un dígito al azar, que es lo que había antes.
 */
export function cuilDeDni(dni: string, sexo: SexoDeCuil): string | null {
  const numero = dni.replace(/\D/g, '').padStart(8, '0');
  if (numero.length !== 8) {
    return null;
  }

  const prefijo = sexo === 'F' ? '27' : '20';
  const digito = digitoDe(prefijo + numero);

  if (digito !== null) {
    return `${prefijo}-${numero}-${digito}`;
  }

  // El caso raro: con 23 el resto nunca vuelve a dar 1.
  const digitoAlternativo = digitoDe('23' + numero);
  return digitoAlternativo === null ? null : `23-${numero}-${digitoAlternativo}`;
}

/** ¿El último número del CUIL es el que le corresponde a los otros diez? */
export function cuilTieneDigitoCorrecto(cuil: string): boolean {
  const digitos = String(cuil ?? '').replace(/\D/g, '');
  if (digitos.length !== 11) {
    return false;
  }
  return digitoDe(digitos.slice(0, 10)) === Number(digitos[10]);
}
