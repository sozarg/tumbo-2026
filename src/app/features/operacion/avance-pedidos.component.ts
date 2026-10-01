import { Component, computed, input, signal } from '@angular/core';
import { PedidoDemo, SectorProducto } from '../../core/models/demo-restaurante';
import {
  ETIQUETA_DE_ESTADO_SECTOR,
  pedidoCompleto,
  pedidosEnSeguimiento,
} from '../../core/services/pedidos-por-sector';
import { Paginador } from '../../shared/components/paginador/paginador.component';

/**
 * Lo que el mozo ve de cada parte del pedido (punto 18).
 *
 * El enunciado pide que «cada parte del pedido» se vea en el listado del
 * mozo: no alcanza con un «listo» final, el mozo tiene que saber que la
 * cocina ya terminó y el bar no, para no ir a buscar media mesa.
 *
 * Se muestra un pedido por página, igual que cocina y bar, para no
 * desplazar contenido.
 */
@Component({
  selector: 'tumbo-avance-pedidos',
  imports: [Paginador],
  template: `
    <section class="avance" aria-labelledby="avance-titulo">
      <h2 id="avance-titulo">Avance en cocina y bar</h2>
      @if (actual(); as pedido) {
        <article class="avance__pedido" [class.completo]="completo(pedido)">
          <div class="avance__encabezado">
            <h3>Mesa {{ pedido.mesa }}</h3>
            <span>{{ pedido.creadoEn }}</span>
          </div>
          <ul>
            @for (sector of sectores; track sector.id) {
              @if (pedido.sectores[sector.id] !== 'sin_items') {
                <li [class.listo]="pedido.sectores[sector.id] === 'listo'">
                  <span>{{ sector.nombre }}</span>
                  <strong>{{ etiqueta[pedido.sectores[sector.id]] }}</strong>
                </li>
              }
            }
          </ul>
          @if (completo(pedido)) {
            <p class="avance__aviso" role="status">Pedido completo: listo para entregar.</p>
          }
        </article>
        <tumbo-paginador [total]="pedidos().length" [(pagina)]="pagina" />
      } @else {
        <p class="avance__vacio">No hay pedidos en cocina ni en bar.</p>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      margin-top: 1.25rem;
    }
    .avance {
      display: grid;
      gap: 0.75rem;
    }
    h2 {
      margin: 0;
      color: var(--tumbo-azul-sombra);
      font-size: 1.1rem;
    }
    .avance__pedido {
      display: grid;
      gap: 0.6rem;
      border: 0.1rem solid rgb(0 53 146 / 15%);
      border-radius: 1rem;
      padding: 1rem;
      background: var(--tumbo-crema-brillante);
      color: var(--tumbo-azul-sombra);
    }
    .avance__pedido.completo {
      border-color: var(--tumbo-azul-accion);
    }
    .avance__encabezado {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.4rem;
    }
    h3 {
      margin: 0;
      font-size: 1.3rem;
    }
    ul {
      display: grid;
      gap: 0.4rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      border-radius: 0.6rem;
      padding: 0.55rem 0.75rem;
      background: var(--tumbo-azul-brillante);
    }
    li.listo strong {
      color: var(--tumbo-azul-accion);
    }
    .avance__aviso {
      margin: 0;
      border-radius: 0.6rem;
      padding: 0.6rem 0.75rem;
      background: var(--tumbo-azul-accion);
      color: var(--tumbo-azul-brillante);
      font-weight: 700;
    }
    .avance__vacio {
      margin: 0;
      border: 0.1rem dashed rgb(0 53 146 / 25%);
      border-radius: 1rem;
      padding: 1rem;
      background: var(--tumbo-crema-brillante);
      color: var(--tumbo-azul-sombra);
      text-align: center;
    }
  `,
})
export class AvancePedidos {
  readonly pedidosEnCurso = input.required<readonly PedidoDemo[]>();

  protected readonly etiqueta = ETIQUETA_DE_ESTADO_SECTOR;
  protected readonly sectores: readonly { id: SectorProducto; nombre: string }[] = [
    { id: 'cocina', nombre: 'Cocina' },
    { id: 'bar', nombre: 'Bar' },
  ];
  protected readonly pedidos = computed(() => pedidosEnSeguimiento(this.pedidosEnCurso()));
  protected readonly pagina = signal(0);
  protected readonly actual = computed<PedidoDemo | undefined>(
    () => this.pedidos()[Math.max(0, Math.min(this.pagina(), this.pedidos().length - 1))],
  );

  protected completo(pedido: PedidoDemo): boolean {
    return pedidoCompleto(pedido.sectores);
  }
}
