/**
 * Límites de longitud de cada campo de texto de TUMBO.
 *
 * ESTE ARCHIVO ES EL ESPEJO DE LAS MIGRACIONES
 * supabase/migrations/20260901000600_limites_de_longitud.sql
 * supabase/migrations/20260901000700_correo_mas_corto.sql
 *
 * Si cambiás un número acá, hay que cambiarlo también allá, y al revés.
 * No están duplicados por descuido: la base es la última línea de
 * defensa (nadie la puede saltear, ni siquiera pegándole directo a la
 * API), y el formulario es la primera (es la que le muestra el error al
 * usuario antes de que apriete el botón). Si solo estuviera en la base,
 * el usuario vería un 400 incomprensible; si solo estuviera acá,
 * cualquiera con la clave anon podría mandar un nombre de 10.000
 * caracteres por PostgREST.
 *
 * Los rangos salen de R15 en CONTEXTO-PROYECTO.md.
 */
export const LIMITES = {
  /** Nombres y apellidos de personas (R15) */
  nombres: { min: 2, max: 50 },
  apellidos: { min: 2, max: 50 },
  /**
   * El máximo del estándar (RFC 5321) es 254, pero es un número que no
   * se ve nunca: ninguna dirección real se le acerca. 80 alcanza de
   * sobra para algo como nombre.apellido@subdominio.organizacion.com.ar
   * y es un límite que se puede explicar sin citar un RFC.
   *
   * El registro de correos enviados (correos_enviados.destinatario) sí
   * se queda en 254: es una bitácora, no un formulario, y ahí conviene
   * ser permisivo para no perder un registro por un tope propio.
   */
  correo: { min: 5, max: 80 },
  /** Supabase Auth exige 6; el techo evita el pegado accidental de un texto */
  clave: { min: 6, max: 72 },
  /** El DNI argentino tiene 7 u 8 dígitos */
  dni: { min: 7, max: 8 },
  /** CUIL con o sin guiones: 11 dígitos, hasta 13 caracteres */
  cuil: { min: 11, max: 13 },
  /** Nombre de un plato, bebida o postre tal como aparece en la carta */
  nombreProducto: { min: 2, max: 60 },
  descripcionProducto: { min: 10, max: 300 },
  /** Motivo de rechazo de una cuenta (punto 8) o de un pedido (punto 17) */
  motivoRechazo: { min: 5, max: 300 },
  /** Mensaje de la sala de conversación (punto 11) */
  mensaje: { min: 1, max: 500 },
  /** Texto de una pregunta de la encuesta (punto 20) */
  preguntaEncuesta: { min: 5, max: 200 },
  /** Comentario libre del cliente dentro de la encuesta */
  comentario: { min: 0, max: 500 },
} as const;

export type CampoConLimite = keyof typeof LIMITES;

/**
 * El tope de un campo, para el atributo `maxlength` del input.
 *
 * Poner `maxlength` en el HTML además del validador no es redundante:
 * el navegador directamente no deja escribir el caracter 51, así que el
 * usuario no llega a redactar un texto largo para que después se lo
 * rechacen. El validador queda igual porque `maxlength` no se aplica
 * cuando el valor se pega por programa ni cuando se rellena el formulario
 * desde el código.
 */
export function topeDe(campo: CampoConLimite): number {
  return LIMITES[campo].max;
}
