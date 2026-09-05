import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { cuilTieneDigitoCorrecto } from './cuil';
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

/**
 * Correo electrónico, con EXACTAMENTE la misma regla que la base.
 *
 * Es una copia literal del CHECK `formato_correo` de
 * supabase/migrations/20260901000100_tablas_base.sql. No se usa
 * `Validators.email` de Angular porque su regla es más permisiva: acepta
 * un dominio sin punto, así que da por bueno `hola@gmail`, que la base
 * después rechaza. El usuario veía el formulario en verde y recibía un
 * error del servidor al enviar.
 */
const CORREO = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** Vacío o solo espacios: lo deja pasar para que se queje `required` */
function estaVacio(valor: unknown): boolean {
  return valor === null || valor === undefined || String(valor).trim() === '';
}

/**
 * Correo válido según la misma regla que aplica PostgreSQL.
 * Reemplaza a `Validators.email`, no lo acompaña: tener los dos solo
 * agregaría un error redundante.
 */
export const correoValido: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (estaVacio(control.value)) return null;
  return CORREO.test(String(control.value)) ? null : { correoValido: true };
};

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
 * DNI argentino, exactamente como lo acepta la base.
 *
 * ESPEJA: constraint `formato_dni` de 20260901000100_tablas_base.sql
 *         dni is null or dni ~ '^[0-9]{7,8}$'
 *
 * Acepta los puntos porque el servicio se los saca antes de guardar
 * (`normalizarDni`), así que 43.210.987 y 43210987 son lo mismo. Lo que
 * NO acepta es una letra: `4321O987`, con la O en lugar del cero, tiene
 * que fallar acá y no convertirse en un DNI de otra persona.
 */
export const dniValido: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (estaVacio(control.value)) return null;
  const sinSeparadores = String(control.value).replace(/[.\s]/g, '');
  return /^[0-9]{7,8}$/.test(sinSeparadores) ? null : { dniValido: true };
};

/**
 * CUIL, exactamente como lo acepta la base.
 *
 * ESPEJA: constraint `formato_cuil` de 20260901000100_tablas_base.sql
 *         cuil is null or cuil ~ '^[0-9]{2}-?[0-9]{7,8}-?[0-9]$'
 *
 * Con guiones o sin ellos: 27-43210987-6 y 27432109876 valen igual.
 */
export const cuilValido: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (estaVacio(control.value)) return null;
  return /^[0-9]{2}-?[0-9]{7,8}-?[0-9]$/.test(String(control.value).trim())
    ? null
    : { cuilValido: true };
};

/**
 * El último número del CUIL tiene que cerrar con los otros diez.
 *
 * El dígito verificador sale de un cálculo módulo 11 sobre los diez
 * primeros. Un CUIL mal tipeado se detecta solo, sin consultarle a
 * nadie: el número se contradice a sí mismo.
 *
 * `cuilValido` mira la FORMA (once dígitos, guiones opcionales). Este
 * mira si el número EXISTE. Son dos cosas distintas y van juntas.
 *
 * OJO CON LOS DATOS VIEJOS
 * Los CUIL que trae `supabase/crear-usuarios.mjs` están inventados
 * —ninguno de los cinco tiene el dígito correcto— así que esas cuentas
 * no pasarían este validador. No importa: esto corre sobre lo que se
 * carga de ahora en más, no sobre lo que ya está guardado.
 */
export const cuilConDigitoValido: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  if (estaVacio(control.value)) return null;
  return cuilTieneDigitoCorrecto(String(control.value)) ? null : { cuilDigito: true };
};

/**
 * El CUIL tiene que contener el mismo DNI que se cargó al lado.
 *
 * CÓMO ESTÁ ARMADO UN CUIL
 *     27 - 43210987 - 6
 *     ▲      ▲        ▲
 *     │      │        └── dígito verificador
 *     │      └─────────── EL DNI, con un cero adelante si tiene 7
 *     └────────────────── prefijo (20/23/24/27 personas, 30/33 empresas)
 *
 * Los dígitos del medio SON el DNI. Así que si alguien carga el DNI
 * 43210987 y el CUIL 27-99999999-6, uno de los dos está mal y hasta
 * ahora nadie se daba cuenta: la base tampoco lo mira.
 *
 * VA EN EL GRUPO, NO EN UN CAMPO
 * Un `ValidatorFn` normal solo ve su propio control. Para comparar dos
 * campos hace falta ponerlo en el FormGroup, que sí los ve a los dos.
 *
 * El error se le cuelga igual al control del CUIL —no al grupo— para
 * que aparezca abajo de ese campo, que es donde la persona lo va a
 * buscar. Los otros errores que ya tuviera se respetan: por eso el
 * `otrosErrores` en vez de un `setErrors` a lo bruto.
 *
 * Mientras falten datos no opina. Si el DNI todavía tiene 3 dígitos
 * porque la persona está escribiendo, marcar "no coinciden" sería
 * ruido: de eso se ocupan `dniValido` y `cuilValido`.
 */
export function cuilCoincideConDni(campoDni = 'dni', campoCuil = 'cuil'): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const dni = grupo.get(campoDni);
    const cuil = grupo.get(campoCuil);
    if (!dni || !cuil) return null;

    const otrosErrores = { ...(cuil.errors ?? {}) };
    delete otrosErrores['cuilCoincide'];
    const conservar = Object.keys(otrosErrores).length > 0 ? otrosErrores : null;

    const numeroDni = String(dni.value ?? '').replace(/[.\s]/g, '');
    const numeroCuil = String(cuil.value ?? '').replace(/\D/g, '');

    if (numeroDni.length < 7 || numeroCuil.length < 10) {
      cuil.setErrors(conservar);
      return null;
    }

    // Los ceros de relleno se descartan de los dos lados: un DNI de 7
    // dígitos viaja dentro del CUIL como 0XXXXXXX.
    const sinCeros = (n: string) => n.replace(/^0+/, '');
    const coincide = sinCeros(numeroCuil.slice(2, -1)) === sinCeros(numeroDni);

    cuil.setErrors(coincide ? conservar : { ...otrosErrores, cuilCoincide: true });
    return null;
  };
}

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
