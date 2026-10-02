import { Component, computed, input, output, signal } from '@angular/core';
import {
  ETIQUETA_DE_TIPO_ITEM,
  PedidoDemo,
  SectorProducto,
} from '../../core/models/demo-restaurante';
import {
  ETIQUETA_DE_ESTADO_SECTOR,
  itemsPorTipo,
  pedidoCompleto,
  pedidosEnSeguimiento,
} from '../../core/services/pedidos-por-sector';
import { BotonConfirmacion } from '../../shared/components/boton-confirmacion/boton-confirmacion.component';
import { Paginador } from '../../shared/components/paginador/paginador.component';
import { AccionDeSector } from './sector-pedidos.component';

/**
 * Los pedidos de todas las mesas, para el mozo (puntos 13, 14, 18 y 19).
 *
 * Un pedido nuevo aparece acá con su detalle, y el mozo lo confirma o lo
 * rechaza: ESE pedido, no «el pedido activo» de una sola estadía, que
 * con varias mesas era cualquiera.
 *
 * El enunciado pide que «cada parte del pedido» se vea en el listado del
 * mozo: no alcanza con un «listo» final, el mozo tiene que saber que la
 * cocina ya terminó y el bar no, para no ir a buscar media mesa.
 *
 * Cuando el pedido está completo, el mozo ve qué lleva —comidas,
 * bebidas y postres— y lo marca entregado desde acá. Después queda a la
 * espera de que el cliente confirme la recepción.
 *
 * Se muestra un pedido por página, igual que cocina y bar, para no
 * desplazar contenido.
 */
@Component({
  selector: 'tumbo-avance-pedidos',
  imports: [BotonConfirmacion, Paginador],
  template: `
    <section class="avance" aria-labelledby="avance-titulo">
      <h2 id="avance-titulo">Pedidos de las mesas</h2>
      @if (actual(); as pedido) {
        <article class="avance__pedido" [class.completo]="completo(pedido)">
          <div class="avance__encabezado">
            <h3>Mesa {{ pedido.mesa }}</h3>
            <span>{{ pedido.creadoEn }}</span>
          </div>
          @if (pedido.estado !== 'pendiente_confirmacion') {
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
          }
          @if (pedido.estado === 'pendiente_confirmacion') {
            <p class="avance__nuevo" role="status">Pedido nuevo: espera tu confirmación.</p>
            <div class="avance__entrega">
              @for (grupo of grupos(pedido); track grupo.tipo) {
                <h4>{{ etiquetaTipo[grupo.tipo] }}</h4>
                <ul>
                  @for (item of grupo.items; track item.productoId) {
                    <li>
                      <span>{{ item.nombre }}</span>
                      <strong>{{ item.cantidad }} ×</strong>
                    </li>
                  }
                </ul>
              }
            </div>
            <div class="avance__decision">
              <tumbo-boton-confirmacion
                buttonClass="reject-button"
                fill="outline"
                expand="block"
                [disabled]="procesando() === pedido.id"
                title="Rechazar pedido"
                [message]="
                  'Vas a rechazar el pedido de la mesa ' +
                  pedido.mesa +
                  ' para que el cliente lo modifique. ¿Querés continuar?'
                "
                (confirmado)="rechazar.emit({ pedidoId: pedido.id, mesa: pedido.mesa })"
              >
                Rechazar
              </tumbo-boton-confirmacion>
              <tumbo-boton-confirmacion
                buttonClass="approve-button"
                expand="block"
                [disabled]="procesando() === pedido.id"
                title="Confirmar pedido"
                [message]="
                  'Vas a confirmar el pedido de la mesa ' +
                  pedido.mesa +
                  ' y mandarlo a cocina y bar. ¿Querés continuar?'
                "
                (confirmado)="confirmar.emit({ pedidoId: pedido.id, mesa: pedido.mesa })"
              >
                Confirmar pedido
              </tumbo-boton-confirmacion>
            </div>
          } @else if (pedido.estado === 'listo') {
            <p class="avance__aviso" role="status">Pedido completo: listo para entregar.</p>
            <div class="avance__entrega">
              @for (grupo of grupos(pedido); track grupo.tipo) {
                <h4>{{ etiquetaTipo[grupo.tipo] }}</h4>
                <ul>
                  @for (item of grupo.items; track item.productoId) {
                    <li>
                      <span>{{ item.nombre }}</span>
                      <strong>{{ item.cantidad }} ×</strong>
                    </li>
                  }
                </ul>
              }
            </div>
            <tumbo-boton-confirmacion
              buttonClass="approve-button"
              expand="block"
              [disabled]="procesando() === pedido.id"
              title="Confirmar entrega"
              [message]="
                'Vas a marcar como entregado el pedido de la mesa ' +
                pedido.mesa +
                '. ¿Querés continuar?'
              "
              (confirmado)="entregar.emit({ pedidoId: pedido.id, mesa: pedido.mesa })"
            >
              Marcar entregado
            </tumbo-boton-confirmacion>
          } @else if (pedido.estado === 'entregado') {
            <p class="avance__espera" role="status">
              Entregado. Esperando que el cliente confirme la recepción.
            </p>
          }
        </article>
        <tumbo-paginador [total]="pedidos().length" [(pagina)]="pagina" />
      } @else {
        <p class="avance__vacio">No hay pedidos en curso.</p>
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
    .avance__nuevo {
      margin: 0;
      border-radius: 0.6rem;
      padding: 0.6rem 0.75rem;
      background: var(--tumbo-amarillo-marca);
      color: var(--tumbo-azul-sombra);
      font-weight: 700;
    }
    .avance__decision {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
      gap: 0.6rem;
    }
    .avance__entrega {
      display: grid;
      gap: 0.4rem;
    }
    h4 {
      margin: 0.3rem 0 0;
      font-size: 0.95rem;
    }
    .avance__espera {
      margin: 0;
      border-radius: 0.6rem;
      padding: 0.6rem 0.75rem;
      background: var(--tumbo-azul-brillante);
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
  /** El pedido que se está guardando, para no aceptar un segundo toque. */
  readonly procesando = input<string | null>(null);
  readonly entregar = output<AccionDeSector>();
  readonly confirmar = output<AccionDeSector>();
  readonly rechazar = output<AccionDeSector>();

  protected readonly etiqueta = ETIQUETA_DE_ESTADO_SECTOR;
  protected readonly etiquetaTipo = ETIQUETA_DE_TIPO_ITEM;
  protected readonly grupos = (pedido: PedidoDemo) => itemsPorTipo(pedido.items);
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
