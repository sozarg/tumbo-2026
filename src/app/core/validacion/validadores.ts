import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { CampoConLimite, LIMITES } from './limites';

/**
 * Validadores reutilizables para todos los formularios de TUMBO.
 *
 * La idea es que las altas de los puntos 1, 2, 3 y 4 (empleado, plato,
 * bebida, mesa) no tengan que reescribir estas reglas ni inventar sus
 * propios mensajes: se arma el control con `conLimite('nombres')` y ya
 * queda validado igual que en el resto de la aplicación y coherente con
 * lo que acepta la base.
 */

/**
 * Letras (con tildes y ñ), espacios, apóstrofos y guiones.
 *
 * Se permiten el apóstrofo y el guión a propósito: "D'Angelo" y
 * "García-López" son apellidos reales. Números y símbolos, no; eso
 * además cierra la puerta a que alguien escriba `<script>` como nombre
 * y termine dibujado en la pantalla de otro usuario.
 */
const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ '-]*$/;

/** Vacío o solo espacios: lo deja pasar para que se queje `required` */
function estaVacio(valor: unknown): boolean {
  return valor === null || valor === undefined || String(valor).trim() === '';
}

/**
 * Nombre de persona: letras, espacios, tildes, ñ, apóstrofo y guión.
 * Es el mismo criterio que aplican `formato_nombres` y
 * `formato_apellidos` en la base.
 */
export const soloLetras: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (estaVacio(control.value)) return null;
  return SOLO_LETRAS.test(String(control.value)) ? null : { soloLetras: true };
};

/**
 * Rechaza un valor que solo tenga espacios.
 *
 * `Validators.required` acepta "   " porque para Angular es una cadena
 * no vacía. Sin esto, un nombre de cinco espacios pasa el formulario y
 * lo termina rebotando la base, que sí hace `trim`.
 */
export const sinEspaciosSolos: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = control.value;
  if (valor === null || valor === undefined || valor === '') return null;
  return String(valor).trim() === '' ? { sinEspaciosSolos: true } : null;
};

/** Solo dígitos. Para DNI y CUIL, que se guardan como texto. */
export const soloNumeros: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (estaVacio(control.value)) return null;
  return /^[0-9]+$/.test(String(control.value)) ? null : { soloNumeros: true };
};

/**
 * Los validadores de longitud de un campo, tomados de LIMITES.
 *
 * Se usa así:
 *   nombres: ['', [Validators.required, ...conLimite('nombres'), soloLetras]]
 */
export function conLimite(campo: CampoConLimite): ValidatorFn[] {
  const { min, max } = LIMITES[campo];
  const validadores: ValidatorFn[] = [Validators.maxLength(max)];
  if (min > 0) validadores.unshift(Validators.minLength(min));
  return validadores;
}

/**
 * El juego completo para un nombre o apellido de persona.
 * Equivale a lo que exige la base: requerido, 2 a 50, solo letras.
 */
export function validadoresDeNombre(campo: 'nombres' | 'apellidos'): ValidatorFn[] {
  return [Validators.required, sinEspaciosSolos, ...conLimite(campo), soloLetras];
}
