import { Component, computed, input } from '@angular/core';
import { DatoDePromedio } from '../../../core/models/encuesta';

/** Un punto ya ubicado en el dibujo. */
interface Punto {
  readonly etiqueta: string;
  readonly promedio: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Gráfico de línea (punto 20): cómo evolucionó un promedio semana a
 * semana. El eje vertical va del mínimo al máximo de la escala para que
 * la línea no exagere diferencias chicas.
 */
@Component({
  selector: 'tumbo-grafico-linea',
  template: `
    <figure>
      @if (puntos().length) {
        <svg viewBox="0 0 320 200" role="img" [attr.aria-label]="resumen()">
          @for (marca of marcas(); track marca.valor) {
            <line class="guia" x1="36" x2="308" [attr.y1]="marca.y" [attr.y2]="marca.y" />
            <text class="eje" x="28" [attr.y]="marca.y + 4" text-anchor="end">
              {{ marca.valor }}
            </text>
          }
          <polyline class="linea" [attr.points]="trazo()" />
          @for (punto of puntos(); track punto.etiqueta) {
            <circle class="punto" [attr.cx]="punto.x" [attr.cy]="punto.y" r="6" />
            <text class="valor" [attr.x]="punto.x" [attr.y]="punto.y - 12" text-anchor="middle">
              {{ punto.promedio.toFixed(1) }}
            </text>
            <text class="eje" [attr.x]="punto.x" y="194" text-anchor="middle">
              {{ punto.etiqueta }}
            </text>
          }
        </svg>
      } @else {
        <p class="vacio">Todavía no hay respuestas para mostrar.</p>
      }
    </figure>
  `,
  styleUrl: './graficos.scss',
})
export class GraficoLinea {
  readonly datos = input.required<readonly DatoDePromedio[]>();
  readonly minimo = input(1);
  readonly maximo = input(5);

  private readonly y = (valor: number) =>
    170 - ((valor - this.minimo()) / (this.maximo() - this.minimo())) * 150;

  protected readonly puntos = computed<Punto[]>(() => {
    const datos = this.datos();
    const paso = datos.length > 1 ? 252 / (datos.length - 1) : 0;
    return datos.flatMap((dato, indice) =>
      dato.promedio === null
        ? []
        : [
            {
              etiqueta: dato.etiqueta,
              promedio: dato.promedio,
              x: 46 + indice * paso,
              y: this.y(dato.promedio),
            },
          ],
    );
  });

  protected readonly marcas = computed(() => {
    const marcas = [];
    for (let valor = this.minimo(); valor <= this.maximo(); valor++)
      marcas.push({ valor, y: this.y(valor) });
    return marcas;
  });

  protected readonly trazo = computed(() =>
    this.puntos()
      .map((p) => `${p.x},${p.y}`)
      .join(' '),
  );

  protected readonly resumen = computed(
    () =>
      'Gráfico de línea: ' +
      this.puntos()
        .map((p) => `${p.etiqueta}, ${p.promedio.toFixed(1)}`)
        .join('; '),
  );
}
