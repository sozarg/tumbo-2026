import { Component, computed, input } from '@angular/core';
import { DatoDeConteo } from '../../../core/models/encuesta';
import { colorDe } from './colores';

/**
 * Gráfico de barras horizontales (punto 20). Horizontales porque las
 * opciones son frases («La atención», «Los precios») y en un teléfono
 * angosto no entran debajo de una barra vertical.
 */
@Component({
  selector: 'tumbo-grafico-barras',
  template: `
    <figure>
      @if (maximo() > 0) {
        <div class="barras" role="img" [attr.aria-label]="resumen()">
          @for (dato of datos(); track dato.etiqueta; let i = $index) {
            <div class="fila">
              <span class="etiqueta">{{ dato.etiqueta }}</span>
              <span class="pista" aria-hidden="true">
                <span
                  class="barra"
                  [style.width.%]="(dato.cantidad / maximo()) * 100"
                  [style.background]="color(i)"
                ></span>
              </span>
              <strong>{{ dato.cantidad }}</strong>
            </div>
          }
        </div>
      } @else {
        <p class="vacio">Todavía no hay respuestas para mostrar.</p>
      }
    </figure>
  `,
  styleUrl: './graficos.scss',
})
export class GraficoBarras {
  readonly datos = input.required<readonly DatoDeConteo[]>();

  protected readonly color = colorDe;
  protected readonly maximo = computed(() => Math.max(0, ...this.datos().map((d) => d.cantidad)));
  protected readonly resumen = computed(
    () =>
      'Gráfico de barras: ' +
      this.datos()
        .map((d) => `${d.etiqueta}, ${d.cantidad}`)
        .join('; '),
  );
}
