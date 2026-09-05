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

  if (errores['soloNumeros']) {
    return `${El} solo puede tener números.`;
  }

  if (errores['min'] !== undefined || errores['max'] !== undefined) {
    return `${El} está fuera del rango permitido.`;
  }

  // Red de seguridad: si mañana alguien agrega un validador y se olvida
  // de pasar por acá, el usuario ve algo entendible en vez de nada.
  return `Revisá ${el}.`;
}

/** 'la' para las palabras femeninas que usamos; 'el' para el resto. */
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
  return femeninas.includes(etiqueta) ? 'la' : 'el';
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function caracteres(cantidad: number): string {
  return cantidad === 1 ? 'caracter' : 'caracteres';
}
