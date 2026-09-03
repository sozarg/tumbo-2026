import { Component, input } from '@angular/core';

/**
 * Indicador de espera con el logo (requisito excluyente R10).
 *
 * El enunciado es explícito: TODAS las esperas llevan un indicador con
 * el logo de la empresa. Un `ion-spinner` pelado no cumple. Por eso este
 * componente reemplaza a `ion-spinner` en toda la aplicación, y no se
 * usa `ion-spinner` suelto en ningún lado.
 *
 * Se usa así:
 *   <tumbo-espera etiqueta="Ingresando" />          en línea, dentro de un botón
 *   <tumbo-espera etiqueta="Cargando" tamano="grande" />   en una pantalla vacía
 *
 * La imagen es icons/icon-192.png y no imagenes/logo.png a propósito:
 * el logo original pesa 1,2 MB y acá se dibuja a 24 o 72 píxeles.
 */
@Component({
  selector: 'tumbo-espera',
  styleUrl: './espera.component.scss',
  templateUrl: './espera.component.html',
})
export class Espera {
  /** Lo que anuncian los lectores de pantalla mientras se espera. */
  readonly etiqueta = input('Cargando');
  readonly tamano = input<'chico' | 'grande'>('chico');
}
