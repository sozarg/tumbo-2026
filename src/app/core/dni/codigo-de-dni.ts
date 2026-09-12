import { SexoDeCuil, cuilDeDni, cuilTieneDigitoCorrecto } from '../validacion/cuil';

/**
 * Lee el código de barras del DNI argentino.
 *
 * QUÉ CÓDIGO ES
 * El enunciado dice "QR del DNI", pero el documento argentino no trae un
 * QR: trae un PDF417, que es un código de barras bidimensional distinto.
 * Por eso el lector se configura para los dos formatos —si mañana el
 * RENAPER cambia a QR, o si alguien prueba con un QR impreso, sigue
 * andando— y este parser trabaja sobre el TEXTO que devuelve el lector,
 * sin importar de qué formato salió.
 *
 * CÓMO VIENEN LOS DATOS
 * Un solo renglón con los campos separados por arroba:
 *
 *     00123456789@PEREZ GOMEZ@MARIA LAURA@F@43210987@A@01/01/1990@01/01/2015@274
 *     ─────┬───── ─────┬───── ─────┬───── ┬ ────┬─── ┬ ─────┬──── ─────┬──── ─┬─
 *       trámite     apellidos   nombres  sexo  DNI  ejemplar nacimiento emisión CUIL
 *
 * POR QUÉ NO SE LEE POR POSICIÓN FIJA
 * Hay al menos dos variantes en circulación: la vieja arranca con el
 * número de trámite y la nueva mete un campo más justo después, así que
 * todo lo demás se corre un lugar. Contar desde el principio funciona
 * con una y falla con la otra, en silencio y con los datos cambiados de
 * campo —el apellido en el nombre, el nombre en el apellido—.
 *
 * Se ancla en el sexo, que es el único campo con forma inconfundible:
 * una sola letra, M o F. Desde ahí, los vecinos son siempre los mismos:
 *
 *     apellidos = sexo - 2      nombres = sexo - 1      DNI = sexo + 1
 *
 * Eso vale para las dos variantes y para cualquier otra que agregue
 * campos adelante.
 *
 * EL CORREO
 * El DNI no lo trae. Los códigos de prueba de `tools/generar-qr-dni.mjs`
 * sí le agregan uno al final, para que la demostración no obligue a
 * tipear una dirección entera en el teléfono. El parser lo busca por su
 * forma —algo con arroba y un dominio— y no por su posición, así que un
 * documento real simplemente no tiene ninguno y devuelve `null`.
 */

export interface DatosDeDni {
  readonly nombres: string;
  readonly apellidos: string;
  readonly dni: string;
  readonly sexo: SexoDeCuil;
  /** Puede ser `null` si el código viene sin CUIL y el DNI no permite derivarlo. */
  readonly cuil: string | null;
  /**
   * El correo, si el código trae uno.
   *
   * Un DNI argentino NO lo trae. Los códigos de prueba que genera
   * `tools/generar-qr-dni.mjs` sí, y por eso el parser lo busca: si
   * está, se usa; si no —o sea, siempre que sea un documento real—
   * queda `null` y la pantalla propone uno.
   */
  readonly correo: string | null;
}

/** Un campo de sexo: exactamente una M o una F, sin nada más. */
const SEXO = /^[MF]$/;

/** El DNI: siete u ocho dígitos. Menos es un campo equivocado. */
const NUMERO_DE_DNI = /^[0-9]{7,8}$/;

/** El prefijo y el dígito del CUIL, pegados: `274`. */
const CUIL_DEL_CODIGO = /^[0-9]{3}$/;

/** Un correo, para los códigos que traen uno. El DNI real no trae. */
const CORREO = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Convierte el texto crudo del lector en datos para el formulario.
 *
 * Devuelve `null` cuando el código no es de un DNI —un QR de una mesa,
 * el de una propina, el envoltorio de una galletita—. Esa es la
 * diferencia entre "no pude leer" y "leí otra cosa", y la pantalla tiene
 * que poder decirlo distinto.
 */
export function leerCodigoDeDni(texto: string): DatosDeDni | null {
  const campos = String(texto ?? '')
    .trim()
    .split('@')
    .map((campo) => campo.trim());

  if (campos.length < 5) {
    return null;
  }

  const posicionDelSexo = campos.findIndex((campo) => SEXO.test(campo.toUpperCase()));

  // Necesita dos campos antes (apellidos, nombres) y uno después (DNI).
  if (posicionDelSexo < 2 || posicionDelSexo + 1 >= campos.length) {
    return null;
  }

  const apellidos = campos[posicionDelSexo - 2];
  const nombres = campos[posicionDelSexo - 1];
  const sexo = campos[posicionDelSexo].toUpperCase() as SexoDeCuil;
  const dni = campos[posicionDelSexo + 1];

  if (!NUMERO_DE_DNI.test(dni) || !apellidos || !nombres) {
    return null;
  }

  return {
    nombres: comoSeEscribe(nombres),
    apellidos: comoSeEscribe(apellidos),
    dni,
    sexo,
    cuil: cuilDelCodigo(campos, dni) ?? cuilDeDni(dni, sexo),
    correo: correoDelCodigo(campos),
  };
}

/**
 * El correo, si el código trae uno.
 *
 * VIENE CON LA ARROBA ESCAPADA
 * La arroba es el separador de este formato, así que un correo escrito
 * tal cual se partiría en dos campos y no quedaría nada que leer. Los
 * códigos que generamos lo escriben como `%40` y acá se desescapa.
 *
 * Un DNI real no trae ninguno: devuelve `null` y la pantalla propone uno.
 */
function correoDelCodigo(campos: readonly string[]): string | null {
  for (const campo of campos) {
    const candidato = campo.replace(/%40/gi, '@').toLowerCase();
    if (CORREO.test(candidato)) return candidato;
  }

  return null;
}

/**
 * El CUIL que trae el propio código, si es que trae uno.
 *
 * El último campo suele ser el prefijo y el dígito verificador pegados
 * (274 = 27-DNI-4). Se prefiere ese antes que calcularlo, porque es el
 * que la AFIP le asignó de verdad a esa persona: el cálculo acierta casi
 * siempre, pero el documento no tiene que adivinar.
 *
 * Igual se comprueba el dígito antes de creerle. Si no cierra, se
 * devuelve `null` y quien llama cae al cálculo.
 */
function cuilDelCodigo(campos: readonly string[], dni: string): string | null {
  // Se BUSCA el campo en vez de asumir que es el último. Antes se leía
  // `campos[campos.length - 1]`, y eso se rompía en cuanto el código
  // traía algo después del CUIL. Es el mismo criterio que con el sexo:
  // reconocer el campo por su forma, no por dónde cayó.
  for (const campo of campos) {
    if (!CUIL_DEL_CODIGO.test(campo)) continue;

    const cuil = `${campo.slice(0, 2)}-${dni.padStart(8, '0')}-${campo.slice(2)}`;
    if (cuilTieneDigitoCorrecto(cuil)) return cuil;
  }

  return null;
}

/**
 * Pasa PEREZ GOMEZ a Perez Gomez.
 *
 * El código de barras viene siempre en mayúsculas y sin tildes, que es
 * una limitación del PDF417, no cómo se llama la persona. Dejarlo tal
 * cual haría que el listado de personal mezcle NOMBRES A LOS GRITOS con
 * nombres cargados a mano. Las tildes que falten las puede completar
 * quien carga: el campo queda editable.
 */
function comoSeEscribe(texto: string): string {
  return texto
    .toLocaleLowerCase('es-AR')
    .replace(
      /(^|[\s'-])([a-záéíóúñü])/g,
      (_, antes: string, letra: string) => antes + letra.toLocaleUpperCase('es-AR'),
    );
}
