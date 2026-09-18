import { AbstractControl } from '@angular/forms';

/**
 * Traduce el error de un control al mensaje que ve el usuario.
 *
 * POR QUÉ ESTÁ CENTRALIZADO
 * Si cada formulario arma sus propios textos, terminamos con cinco
 * maneras distintas de decir lo mismo y con algún caso sin mensaje, que
 * es lo que pasaba en `ingreso` cuando se le agregó un validador nuevo:
 * el `return` final asumía que el único error posible era `minLength`,
 * así que un error nuevo mostraba el mensaje equivocado.
 *
 * `etiqueta` es cómo se llama el campo en la pantalla, en minúscula y
 * sin artículo: 'correo', 'clave', 'nombre', 'descripción'.
 */
export function mensajeDeError(control: AbstractControl, etiqueta: string): string {
  const errores = control.errors;
  if (!errores) return '';

  const el = `${articulo(etiqueta)} ${etiqueta}`;
  const El = capitalizar(el);

  if (errores['required'] || errores['sinEspaciosSolos']) {
    return `Completá ${el}.`;
  }

  if (errores['claveEnBytes'])
    return 'La contraseña no puede superar 72 bytes; las tildes y emojis ocupan más de un byte.';

  if (errores['email'] || errores['correoValido']) {
    return 'Ingresá un correo válido, por ejemplo: nombre@dominio.com.';
  }

  if (errores['minlength']) {
    const pedido = errores['minlength'].requiredLength as number;
    return `${El} tiene que tener al menos ${pedido} ${caracteres(pedido)}.`;
  }

  if (errores['maxlength']) {
    const tope = errores['maxlength'].requiredLength as number;
    const actual = errores['maxlength'].actualLength as number;
    return `${El} no puede superar los ${tope} caracteres (llevás ${actual}).`;
  }

  if (errores['soloLetras']) {
    return `${El} solo puede tener letras y espacios.`;
  }

  if (errores['dniValido']) {
    return 'El DNI tiene que ser de 7 u 8 números. Los puntos se pueden poner o no.';
  }

  /*
   * EL ORDEN DE ESTOS DOS IMPORTA.
   *
   * Si alguien cambia un dígito del MEDIO del CUIL, se rompen las dos
   * cosas al mismo tiempo: deja de coincidir con el DNI y además el
   * dígito verificador ya no cierra, porque se calcula sobre esos
   * mismos números.
   *
   * Con el otro orden ganaba «ese CUIL no existe», que manda a la
   * persona a corregir el último número —y eso no arregla nada—. Que
   * los dos campos no se correspondan es el problema de fondo y es lo
   * que hay que decir.
   *
   * «Ese CUIL no existe» queda para cuando el DNI sí está adentro y lo
   * único mal es el verificador.
   */
  if (errores['cuilCoincide']) {
    return 'El CUIL no contiene el DNI que cargaste. Revisá los dos.';
  }

  if (errores['cuilDigito']) {
    return 'Ese CUIL no existe: el último número no se corresponde con los demás.';
  }

  if (errores['cuilValido']) {
    return 'El CUIL tiene que ser de 11 números, con guiones o sin ellos.';
  }

  if (errores['fotoRequerida']) {
    /*
     * Sin la palabra «personal»: el mismo validador lo usan la foto del
     * empleado (punto 1) y la de la mesa (punto 4), y «Falta la foto
     * personal» en el alta de una mesa no tiene sentido. El `El` sale de
     * la etiqueta que pasa cada formulario, así que el mensaje se adapta
     * solo si mañana alguien le pone otro nombre al campo.
     */
    return `Falta ${el}: el alta la pide tomada con la cámara.`;
  }

  if (errores['entero']) {
    return `${El} tiene que ser un número entero, sin decimales.`;
  }

  if (errores['precioDecimales']) {
    return 'El precio puede tener como mucho dos decimales.';
  }

  if (errores['precioGrande'] || errores['precio']) {
    return 'Ingresá un precio válido, menor a 100.000.000.';
  }

  if (errores['tresFotos']) {
    const cargadas = errores['tresFotos'].cargadas as number;
    if (cargadas >= 3) return 'Se requieren exactamente tres fotos.';
    return cargadas === 0
      ? 'Faltan las tres fotos del producto.'
      : `Falta${3 - cargadas === 1 ? '' : 'n'} ${3 - cargadas} foto${3 - cargadas === 1 ? '' : 's'} para completar el producto.`;
  }

  if (errores['soloNumeros']) {
    return `${El} solo puede tener números.`;
  }

  /**
   * El rango se DICE, no se insinúa.
   *
   * Antes esto devolvía «está fuera del rango permitido», que es cierto
   * y no sirve: quien carga una mesa para 30 personas no tiene forma de
   * saber que el máximo son 20, así que prueba 25, después 22… Angular
   * ya trae el límite en el error (`{ min }` / `{ max }`), solo había
   * que mostrarlo.
   */
  const minimo = errores['min']?.min as number | undefined;
  const maximo = errores['max']?.max as number | undefined;

  if (minimo !== undefined) {
    return `${El} tiene que ser ${minimo} o más.`;
  }

  if (maximo !== undefined) {
    return `${El} no puede ser mayor que ${maximo}.`;
  }

  // Red de seguridad: si mañana alguien agrega un validador y se olvida
  // de pasar por acá, el usuario ve algo entendible en vez de nada.
  return `Revisá ${el}.`;
}

/**
 * 'la' para las palabras femeninas que usamos; 'el' para el resto.
 *
 * ─────────────────────────────────────────────────────────────────────
 * MIRA LA PRIMERA PALABRA, NO LA ETIQUETA ENTERA
 *
 * Antes comparaba la etiqueta completa contra la lista. Andaba mientras
 * las etiquetas fueran de una palabra, y se rompía sola en cuanto
 * alguien pasaba una de varias: «cantidad de comensales» no está en la
 * lista —«cantidad» sí— así que el punto 4 mostraba «EL cantidad de
 * comensales no puede ser mayor que 20».
 *
 * El género de un sustantivo compuesto lo pone su núcleo, que en
 * castellano es la primera palabra: «cantidad de comensales» es
 * femenino por «cantidad», «número de mesa» es masculino por «número».
 * Así que se mira esa y no la frase.
 */
function articulo(etiqueta: string): string {
  const femeninas = [
    'cantidad',
    'clave',
    'contraseña',
    'descripción',
    'foto',
    'imagen',
    'mesa',
    'pregunta',
    'respuesta',
  ];
  const nucleo = etiqueta.trim().split(/\s+/)[0].toLocaleLowerCase('es-AR');
  return femeninas.includes(nucleo) ? 'la' : 'el';
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function caracteres(cantidad: number): string {
  return cantidad === 1 ? 'caracter' : 'caracteres';
}
