import { Component, computed, input, output, signal } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { IonTextarea } from '@ionic/angular/ion-textarea';
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
  imports: [BotonConfirmacion, IonButton, IonTextarea, Paginador],
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
            @if (rechazando() === pedido.id) {
              <div class="avance__rechazo">
                <ion-textarea
                  label="Motivo del rechazo"
                  labelPlacement="stacked"
                  fill="outline"
                  autoGrow="true"
                  [maxlength]="300"
                  [value]="motivo()"
                  (ionInput)="motivo.set($any($event.target).value ?? '')"
                  placeholder="Por ejemplo: no queda bife de chorizo, elegí otro plato."
                  helperText="El cliente lo recibe para modificar el pedido."
                />
                @if (motivo().length > 0 && !motivoValido()) {
                  <p class="avance__error" role="alert">
                    El motivo tiene que tener entre 5 y 300 caracteres.
                  </p>
                }
                <div class="avance__decision">
                  <ion-button
                    class="avance__cancelar"
                    fill="clear"
                    expand="block"
                    (click)="cancelarRechazo()"
                  >
                    Cancelar
                  </ion-button>
                  <tumbo-boton-confirmacion
                    buttonClass="reject-button"
                    fill="outline"
                    expand="block"
                    [disabled]="!motivoValido() || procesando() === pedido.id"
                    title="Rechazar pedido"
                    [message]="
                      'Vas a rechazar el pedido de la mesa ' +
                      pedido.mesa +
                      ' y el cliente va a recibir el motivo. ¿Querés continuar?'
                    "
                    (confirmado)="emitirRechazo(pedido)"
                  >
                    Rechazar pedido
                  </tumbo-boton-confirmacion>
                </div>
              </div>
            } @else {
              <div class="avance__decision">
                <ion-button
                  class="reject-button"
                  fill="outline"
                  expand="block"
                  [disabled]="procesando() === pedido.id"
                  (click)="abrirRechazo(pedido.id)"
                >
                  Rechazar
                </ion-button>
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
            }
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

    .avance__rechazo {
      display: grid;
      gap: 0.6rem;
      margin-top: 0.8rem;
    }

    .avance__rechazo ion-textarea {
      --background: var(--tumbo-azul-brillante);
      --color: var(--tumbo-azul-sombra);
    }

    /* El azul de acento no llega a 4,5:1 sobre crema en texto de 14 px. */
    .avance__cancelar {
      --color: var(--tumbo-azul-sombra);
    }

    .avance__error {
      margin: 0;
      color: var(--tumbo-naranja-profundo);
      font-weight: 700;
    }
  `,
})
export class AvancePedidos {
  readonly pedidosEnCurso = input.required<readonly PedidoDemo[]>();
  /** El pedido que se está guardando, para no aceptar un segundo toque. */
  readonly procesando = input<string | null>(null);
  readonly entregar = output<AccionDeSector>();
  readonly confirmar = output<AccionDeSector>();
  /** Punto 13: el rechazo lleva el motivo que escribió el mozo. */
  readonly rechazar = output<AccionDeSector & { readonly motivo: string }>();

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

  /** El pedido para el que está abierto el recuadro del motivo, o `null`. */
  protected readonly rechazando = signal<string | null>(null);
  protected readonly motivo = signal('');
  /** Lo mismo que acepta la base (`largo_motivo_rechazo`). */
  protected readonly motivoValido = computed(() => {
    const largo = this.motivo().trim().length;
    return largo >= 5 && largo <= 300;
  });

  protected abrirRechazo(pedidoId: string): void {
    this.motivo.set('');
    this.rechazando.set(pedidoId);
  }

  protected cancelarRechazo(): void {
    this.rechazando.set(null);
    this.motivo.set('');
  }

  protected emitirRechazo(pedido: PedidoDemo): void {
    if (!this.motivoValido()) return;
    this.rechazar.emit({ pedidoId: pedido.id, mesa: pedido.mesa, motivo: this.motivo().trim() });
    this.cancelarRechazo();
  }

  protected completo(pedido: PedidoDemo): boolean {
    return pedidoCompleto(pedido.sectores);
  }
}
