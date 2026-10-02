import { Component, computed, input, output, signal } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { addIcons } from 'ionicons';
import { checkmarkDoneOutline, flameOutline, timeOutline } from 'ionicons/icons';
import { SectorProducto } from '../../core/models/demo-restaurante';
import { ETIQUETA_DE_ESTADO_SECTOR, MesaDeSector } from '../../core/services/pedidos-por-sector';
import { BotonConfirmacion } from '../../shared/components/boton-confirmacion/boton-confirmacion.component';
import { Paginador } from '../../shared/components/paginador/paginador.component';

/** Qué pidió el sector hacer con un pedido. */
export interface AccionDeSector {
  readonly pedidoId: string;
  readonly mesa: number;
}

/**
 * Los pedidos pendientes de cocina o bar, agrupados por mesa (puntos 16 y 17).
 *
 * Es la misma pantalla para los dos sectores: cambia solo cuál de las
 * dos partes del pedido se muestra. Se ve una mesa por página, con todos
 * sus ítems juntos, porque la aplicación no desplaza contenido: pasar de
 * a un ítem obligaba al cocinero a tocar «siguiente» para enterarse de
 * qué pidió una sola mesa.
 *
 * El componente no habla con la base: recibe las mesas ya agrupadas y
 * avisa qué botón se tocó. Quién guarda y cómo se muestran los errores
 * lo decide la pantalla de Operaciones, igual que en el resto de las
 * secciones.
 */
@Component({
  selector: 'tumbo-sector-pedidos',
  imports: [IonButton, IonIcon, BotonConfirmacion, Paginador],
  template: `
    <section class="sector" [attr.aria-labelledby]="'sector-' + sector()">
      <div class="sector__encabezado">
        <h2 [id]="'sector-' + sector()">Sector {{ sector() === 'cocina' ? 'cocina' : 'bar' }}</h2>
        <span class="sector__cuenta">
          {{ mesas().length }} {{ mesas().length === 1 ? 'mesa' : 'mesas' }}
        </span>
      </div>

      @if (actual(); as mesa) {
        @if (mesas().length > 1) {
          <nav class="sector__mesas" aria-label="Mesas con pedidos pendientes">
            @for (otra of mesas(); track otra.mesa; let i = $index) {
              <button
                type="button"
                [class.elegida]="i === indice()"
                [attr.aria-current]="i === indice() ? 'true' : null"
                (click)="pagina.set(i)"
              >
                Mesa {{ otra.mesa }}
              </button>
            }
          </nav>
        }

        <article class="mesa" [attr.aria-label]="'Mesa ' + mesa.mesa">
          <h3 class="mesa__numero">Mesa {{ mesa.mesa }}</h3>
          @for (pedido of mesa.pedidos; track pedido.id) {
            <section class="pedido" [attr.aria-label]="'Pedido del ' + pedido.creadoEn">
              <div class="pedido__datos">
                <p class="pedido__fecha">
                  <ion-icon name="time-outline" aria-hidden="true" />
                  {{ pedido.creadoEn }}
                </p>
                <span class="pedido__estado" [class.en-curso]="pedido.estado === 'en_preparacion'">
                  {{ etiqueta[pedido.estado] }}
                </span>
              </div>
              <ul class="pedido__items">
                @for (item of pedido.items; track item.productoId) {
                  <li>
                    <strong>{{ item.cantidad }} ×</strong>
                    <span>{{ item.nombre }}</span>
                  </li>
                }
              </ul>
              <div class="pedido__acciones">
                @if (pedido.estado === 'pendiente') {
                  <ion-button
                    class="empezar"
                    expand="block"
                    [disabled]="procesando() === pedido.id"
                    (click)="empezar.emit({ pedidoId: pedido.id, mesa: mesa.mesa })"
                  >
                    <ion-icon slot="start" name="flame-outline" aria-hidden="true" />
                    Empezar a preparar
                  </ion-button>
                }
                <tumbo-boton-confirmacion
                  buttonClass="primary-action"
                  expand="block"
                  [disabled]="procesando() === pedido.id"
                  title="Marcar listo"
                  [message]="
                    'Vas a avisar que la parte de ' +
                    (sector() === 'cocina' ? 'cocina' : 'bar') +
                    ' de la mesa ' +
                    mesa.mesa +
                    ' está lista. ¿Querés continuar?'
                  "
                  (confirmado)="listo.emit({ pedidoId: pedido.id, mesa: mesa.mesa })"
                >
                  <ion-icon slot="start" name="checkmark-done-outline" aria-hidden="true" />
                  Marcar listo
                </tumbo-boton-confirmacion>
              </div>
            </section>
          }
        </article>

        <tumbo-paginador [total]="mesas().length" [(pagina)]="pagina" />
      } @else {
        <div class="sector__vacio" role="status">
          <ion-icon name="checkmark-done-outline" aria-hidden="true" />
          <h3>{{ sector() === 'cocina' ? 'Cocina' : 'Bar' }} al día</h3>
          <p>No hay pedidos pendientes. Los nuevos aparecen acá solos.</p>
        </div>
      }
    </section>
  `,
  styleUrl: './sector-pedidos.component.scss',
})
export class SectorPedidos {
  readonly sector = input.required<SectorProducto>();
  readonly mesas = input.required<readonly MesaDeSector[]>();
  /** El pedido que se está guardando, para no aceptar un segundo toque. */
  readonly procesando = input<string | null>(null);
  readonly empezar = output<AccionDeSector>();
  readonly listo = output<AccionDeSector>();

  protected readonly etiqueta = ETIQUETA_DE_ESTADO_SECTOR;
  protected readonly pagina = signal(0);
  /**
   * La página nunca apunta afuera de la lista: cuando la última mesa se
   * marca lista y desaparece, se muestra la anterior en vez de nada.
   */
  protected readonly indice = computed(() =>
    Math.max(0, Math.min(this.pagina(), this.mesas().length - 1)),
  );
  protected readonly actual = computed<MesaDeSector | undefined>(() => this.mesas()[this.indice()]);

  constructor() {
    addIcons({ checkmarkDoneOutline, flameOutline, timeOutline });
  }
}
