import { Component, computed, input, signal } from '@angular/core';
import { ResultadosDeEncuesta } from '../../core/models/encuesta';
import { GraficoBarras } from '../../shared/components/graficos/grafico-barras.component';
import { GraficoLinea } from '../../shared/components/graficos/grafico-linea.component';
import { GraficoTorta } from '../../shared/components/graficos/grafico-torta.component';
import { Paginador } from '../../shared/components/paginador/paginador.component';

type TipoDeGrafico = 'torta' | 'barras' | 'linea';

/**
 * Los resultados de la encuesta, un gráfico por pantalla (puntos 20 y
 * 22). El enunciado lo pide así, y es requisito excluyente: nada de
 * los tres juntos en un tablero.
 *
 * Los datos son los de la base (`resultados_encuesta()`), con las
 * cuatro semanas de historial y lo que respondieron los clientes.
 */
@Component({
  selector: 'tumbo-resultados-encuesta',
  imports: [GraficoBarras, GraficoLinea, GraficoTorta, Paginador],
  template: `
    <section class="resultados" aria-labelledby="resultados-titulo">
      <div class="resultados__encabezado">
        <h2 id="resultados-titulo">Resultados de las encuestas</h2>
        @if (resultados(); as datos) {
          <span>{{ datos.total }} {{ datos.total === 1 ? 'encuesta' : 'encuestas' }}</span>
        }
      </div>

      @if (!resultados()) {
        <p class="resultados__vacio" role="status">Cargando los resultados…</p>
      } @else if (graficos().length) {
        @if (actual(); as grafico) {
          <article class="resultados__grafico" [attr.aria-label]="'Gráfico ' + (indice() + 1)">
            <p class="resultados__tipo">{{ nombre[grafico.tipo] }}</p>
            <h3>{{ grafico.pregunta }}</h3>
            @switch (grafico.tipo) {
              @case ('torta') {
                <tumbo-grafico-torta [datos]="resultados()!.torta!.datos" />
              }
              @case ('barras') {
                <tumbo-grafico-barras [datos]="resultados()!.barras!.datos" />
              }
              @case ('linea') {
                <tumbo-grafico-linea
                  [datos]="resultados()!.linea!.datos"
                  [minimo]="1"
                  [maximo]="5"
                />
                <p class="resultados__nota">
                  Promedio de estrellas de cada una de las últimas cuatro semanas.
                </p>
              }
            }
          </article>
        }
        <tumbo-paginador [total]="graficos().length" [(pagina)]="pagina" />
      } @else {
        <p class="resultados__vacio">Todavía no hay preguntas con resultados para graficar.</p>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      margin-top: clamp(1rem, 4vw, 2rem);
    }
    .resultados {
      display: grid;
      gap: 0.9rem;
    }
    .resultados__encabezado {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
    }
    h2 {
      margin: 0;
      color: var(--tumbo-azul-sombra);
      font-size: clamp(1.1rem, 5vw, 1.35rem);
    }
    .resultados__encabezado span {
      color: var(--tumbo-naranja-profundo);
      font-weight: 700;
    }
    .resultados__grafico {
      display: grid;
      gap: 0.75rem;
      border-radius: 1rem;
      padding: clamp(0.9rem, 4vw, 1.25rem);
      background: var(--tumbo-crema-brillante);
      box-shadow: 0 0.5rem 1.3rem rgb(0 53 146 / 8%);
    }
    .resultados__tipo {
      margin: 0;
      color: var(--tumbo-naranja-profundo);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h3 {
      margin: 0;
      color: var(--tumbo-azul-sombra);
      font-size: 1.05rem;
    }
    .resultados__nota,
    .resultados__vacio {
      margin: 0;
      color: var(--tumbo-azul-sombra);
      font-size: 0.85rem;
    }
  `,
})
export class ResultadosEncuesta {
  readonly resultados = input.required<ResultadosDeEncuesta | null>();

  protected readonly nombre: Readonly<Record<TipoDeGrafico, string>> = {
    torta: 'Gráfico de torta',
    barras: 'Gráfico de barras',
    linea: 'Gráfico de línea',
  };
  protected readonly pagina = signal(0);

  /** Solo los gráficos que la base pudo armar, en el orden torta, barras, línea. */
  protected readonly graficos = computed(() => {
    const r = this.resultados();
    if (!r) return [];
    const tipos: readonly TipoDeGrafico[] = ['torta', 'barras', 'linea'];
    return tipos.flatMap((tipo) => (r[tipo] ? [{ tipo, pregunta: r[tipo]!.pregunta }] : []));
  });
  protected readonly indice = computed(() =>
    Math.max(0, Math.min(this.pagina(), this.graficos().length - 1)),
  );
  protected readonly actual = computed(() => this.graficos()[this.indice()]);
}
