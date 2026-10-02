import { Component, computed, input } from '@angular/core';
import { DatoDeConteo } from '../../../core/models/encuesta';
import { colorDe } from './colores';

/** Una porción ya calculada: el dibujo y lo que dice la leyenda. */
interface Porcion {
  readonly etiqueta: string;
  readonly cantidad: number;
  readonly porcentaje: number;
  readonly color: string;
  readonly trazo: string;
}

/**
 * Gráfico de torta en SVG (punto 20). La leyenda lleva los números,
 * así que lo que dice el dibujo también se puede leer sin verlo.
 */
@Component({
  selector: 'tumbo-grafico-torta',
  template: `
    <figure>
      @if (total() > 0) {
        <svg viewBox="-110 -110 220 220" role="img" [attr.aria-label]="resumen()">
          @for (porcion of porciones(); track porcion.etiqueta) {
            <path [attr.d]="porcion.trazo" [attr.fill]="porcion.color" />
          }
        </svg>
        <ul class="leyenda">
          @for (porcion of porciones(); track porcion.etiqueta) {
            <li>
              <span class="muestra" aria-hidden="true" [style.background]="porcion.color"></span>
              <span class="etiqueta">{{ porcion.etiqueta }}</span>
              <strong>{{ porcion.porcentaje }} %</strong>
              <small>({{ porcion.cantidad }})</small>
            </li>
          }
        </ul>
      } @else {
        <p class="vacio">Todavía no hay respuestas para mostrar.</p>
      }
    </figure>
  `,
  styleUrl: './graficos.scss',
})
export class GraficoTorta {
  readonly datos = input.required<readonly DatoDeConteo[]>();

  protected readonly total = computed(() =>
    this.datos().reduce((suma, dato) => suma + dato.cantidad, 0),
  );

  protected readonly porciones = computed<Porcion[]>(() => {
    const total = this.total();
    let angulo = -Math.PI / 2;
    return this.datos()
      .filter((dato) => dato.cantidad > 0)
      .map((dato, indice) => {
        const fraccion = dato.cantidad / total;
        const desde = angulo;
        angulo += fraccion * 2 * Math.PI;
        const punto = (a: number) =>
          `${(100 * Math.cos(a)).toFixed(2)} ${(100 * Math.sin(a)).toFixed(2)}`;
        // Una porción del 100 % es un círculo: un arco de 360° no se dibuja.
        const trazo =
          fraccion >= 0.9999
            ? 'M -100 0 A 100 100 0 1 1 100 0 A 100 100 0 1 1 -100 0 Z'
            : `M 0 0 L ${punto(desde)} A 100 100 0 ${fraccion > 0.5 ? 1 : 0} 1 ${punto(angulo)} Z`;
        return {
          etiqueta: dato.etiqueta,
          cantidad: dato.cantidad,
          porcentaje: Math.round(fraccion * 100),
          color: colorDe(indice),
          trazo,
        };
      });
  });

  protected readonly resumen = computed(
    () =>
      'Gráfico de torta: ' +
      this.porciones()
        .map((p) => `${p.etiqueta}, ${p.porcentaje} %`)
        .join('; '),
  );
}
