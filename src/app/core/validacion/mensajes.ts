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
