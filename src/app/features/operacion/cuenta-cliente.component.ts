import { Component, input, output } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { addIcons } from 'ionicons';
import {
  barChartOutline,
  checkmarkDoneOutline,
  logOutOutline,
  qrCodeOutline,
  receiptOutline,
  timeOutline,
  walletOutline,
} from 'ionicons/icons';
import { CuentaDemo } from '../../core/models/demo-restaurante';
import { LineaDeCuenta } from '../../core/services/cuenta-y-encuesta';
import { BotonConfirmacion } from '../../shared/components/boton-confirmacion/boton-confirmacion.component';
import { Espera } from '../../shared/components/espera/espera.component';

/**
 * La cuenta del cliente, de punta a punta (puntos 21 y 22):
 *
 * 1. pide la cuenta y el mozo recibe el aviso;
 * 2. lee el QR de propina, y sin eso la cuenta no se genera;
 * 3. ve el detalle, con el total grande como en Mercado Pago;
 * 4. paga de forma simulada y espera al mozo;
 * 5. con el pago confirmado, verifica escaneando el QR que la mesa
 *    quedó libre.
 *
 * El componente no lee QR ni habla con la base: avisa qué botón se
 * tocó y la pantalla de Operaciones hace el resto.
 */
@Component({
  selector: 'tumbo-cuenta-cliente',
  imports: [BotonConfirmacion, Espera, IonButton, IonIcon],
  template: `
    <section class="cuenta" aria-labelledby="cuenta-titulo">
      <h2 id="cuenta-titulo">Tu cuenta</h2>

      @if (!cuenta()) {
        @if (!habilitada()) {
          <div class="aviso" role="status">
            <ion-icon aria-hidden="true" name="time-outline" />
            <div>
              <strong>La cuenta se habilita con tu pedido</strong>
              <p>Confirmá que recibiste tu pedido para poder pedir la cuenta.</p>
            </div>
          </div>
        } @else {
          <div class="aviso">
            <ion-icon aria-hidden="true" name="receipt-outline" />
            <div>
              <strong>¿Terminaste?</strong>
              <p>Pedí la cuenta y el mozo recibe el aviso al instante.</p>
            </div>
          </div>
          <ion-button
            class="principal"
            expand="block"
            [disabled]="procesando()"
            (click)="pedir.emit()"
          >
            <ion-icon slot="start" name="receipt-outline" aria-hidden="true" />
            Pedir la cuenta
          </ion-button>
        }
      } @else if (cuenta(); as c) {
        @if (c.estado === 'solicitada') {
          <div class="aviso" role="status">
            <ion-icon aria-hidden="true" name="qr-code-outline" />
            <div>
              <strong>El mozo ya sabe que pediste la cuenta</strong>
              <p>
                Escaneá el QR de propina que te muestra el mozo. Sin la propina, la cuenta no se
                genera.
              </p>
            </div>
          </div>
          <ion-button
            class="principal"
            expand="block"
            [disabled]="procesando()"
            (click)="escanearPropina.emit()"
          >
            <ion-icon slot="start" name="qr-code-outline" aria-hidden="true" />
            Escanear QR de propina
          </ion-button>
        } @else {
          <div class="total">
            <span>{{ c.estado === 'confirmada' ? 'Pagaste' : 'Total a pagar' }}</span>
            <strong>{{ pesos(c.total) }}</strong>
            <small>Mesa {{ c.mesa }}</small>
          </div>

          <!--
            EL DETALLE NO VA EN EL CIERRE.

            Medido en Chromium: con el detalle puesto, el cierre —total,
            cartel y tres botones— desbordaba 51 px en 360×640 y 118 px
            en 320×568, y la lista quedaba en 0 px visibles. O sea que
            el detalle no se veía igual, pero empujaba los botones fuera
            de la pantalla.

            Y acá ya cumplió su función: la persona lo leyó antes de
            pagar, que es donde el punto 21 lo pide. Terminada la
            visita, lo que importa es cuánto pagó y a dónde ir. Sin él,
            la regla de más abajo deja el cartel ocupando el alto
            —«composición intencional»— y los botones al pie.
          -->
          @if (c.estado !== 'confirmada') {
            <div class="detalle">
              <h3>Detalle</h3>
              <ul>
                @for (linea of lineas(); track linea.productoId + linea.precioUnitario) {
                  <li>
                    <span class="detalle__producto">
                      {{ linea.cantidad }} × {{ linea.nombre }}
                      <small>{{ pesos(linea.precioUnitario) }} c/u</small>
                    </span>
                    <strong>{{ pesos(linea.importe) }}</strong>
                  </li>
                }
                <li class="detalle__subtotal">
                  <span>Subtotal</span><strong>{{ pesos(c.subtotal) }}</strong>
                </li>
                @if (c.descuento > 0) {
                  <li class="detalle__descuento">
                    <span>
                      Descuento por juego
                      <small>{{ c.porcentajeDescuento }} % ganado en tu primera partida</small>
                    </span>
                    <strong>−{{ pesos(c.descuento) }}</strong>
                  </li>
                }
                <li>
                  <span>
                    Propina
                    <small
                      >{{ c.porcentajePropina }} % · {{ satisfaccion(c.porcentajePropina) }}</small
                    >
                  </span>
                  <strong>{{ pesos(c.propina) }}</strong>
                </li>
              </ul>
            </div>
          }

          @switch (c.estado) {
            @case ('pendiente_pago') {
              <tumbo-boton-confirmacion
                buttonClass="approve-button"
                expand="block"
                [disabled]="procesando()"
                title="Pagar la cuenta"
                [message]="
                  'Vas a pagar ' + pesos(c.total) + ' de forma simulada. ¿Querés continuar?'
                "
                (confirmado)="pagar.emit()"
              >
                <ion-icon slot="start" name="wallet-outline" aria-hidden="true" />
                Pagar {{ pesos(c.total) }}
              </tumbo-boton-confirmacion>
              <ion-button
                fill="outline"
                class="secundario"
                expand="block"
                [disabled]="procesando()"
                (click)="escanearPropina.emit()"
              >
                Cambiar la propina
              </ion-button>
            }
            @case ('pagada') {
              <div class="aviso" role="status">
                <tumbo-espera etiqueta="Esperando la confirmación del mozo" />
                <p>Pago realizado. Esperá a que el mozo lo confirme.</p>
              </div>
            }
            @case ('confirmada') {
              <!--
                EL CIERRE DE LA VISITA, CON PUERTA DE SALIDA.

                Acá terminaba todo: el cartel de «gracias por venir» y
                nada más. La visita estaba cerrada pero la aplicación no
                lo decía ni ofrecía a dónde ir, así que la persona
                quedaba mirando una pantalla terminada sin salida.

                No se cierra la sesión sola. Quien confirma el pago es
                el mozo, desde OTRO teléfono: una aplicación que te
                manda al login sin que hayas tocado nada se lee como
                que se colgó. Y el punto 22 pide justamente que después
                de liberarse la mesa el cliente siga pudiendo verificar
                el QR y consultar los resultados de las encuestas. Así
                que las tres puertas están, y la persona elige.
              -->
              <div class="aviso aviso--listo" role="status">
                <ion-icon aria-hidden="true" name="checkmark-done-outline" />
                <div>
                  <strong>¡Pago confirmado!</strong>
                  <p>Gracias por venir. Tu mesa quedó libre.</p>
                </div>
              </div>
              <ion-button
                fill="outline"
                class="secundario"
                expand="block"
                (click)="verificarMesa.emit()"
              >
                <ion-icon slot="start" name="qr-code-outline" aria-hidden="true" />
                Verificar la mesa con su QR
              </ion-button>
              @if (verificacion()) {
                <p class="verificacion" role="status">{{ verificacion() }}</p>
              }
              <ion-button
                fill="outline"
                class="secundario"
                expand="block"
                (click)="verResultados.emit()"
              >
                <ion-icon slot="start" name="bar-chart-outline" aria-hidden="true" />
                Ver resultados de encuestas
              </ion-button>
              <!--
                Sin diálogo de confirmación, al revés que «Pagar». Acá
                no hay nada que perder: la visita ya está cerrada, el
                registrado vuelve con su correo y el código del anónimo
                murió con la mesa. Un «¿estás seguro?» sería un paso de
                más para salir de una pantalla que ya terminó.
              -->
              <ion-button class="principal" expand="block" (click)="salir.emit()">
                <ion-icon slot="start" name="log-out-outline" aria-hidden="true" />
                Salir
              </ion-button>
            }
          }
        }
      }
    </section>
  `,
  styleUrl: './cuenta-cliente.component.scss',
})
export class CuentaCliente {
  readonly cuenta = input.required<CuentaDemo | null>();
  readonly lineas = input.required<readonly LineaDeCuenta[]>();
  /** Si el cliente ya confirmó la recepción (punto 19). */
  readonly habilitada = input.required<boolean>();
  readonly procesando = input(false);
  /** Lo que dio la última verificación de la mesa por QR (punto 22). */
  readonly verificacion = input<string | null>(null);

  readonly pedir = output<void>();
  readonly escanearPropina = output<void>();
  readonly pagar = output<void>();
  readonly verificarMesa = output<void>();
  /** Las dos salidas del cierre de la visita (punto 22). */
  readonly verResultados = output<void>();
  readonly salir = output<void>();

  private readonly formato = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
  protected readonly pesos = (monto: number) => this.formato.format(monto);

  /** El nombre de cada nivel de propina, como en `niveles_propina`. */
  protected satisfaccion(porcentaje: number | null): string {
    const nombres: Readonly<Record<number, string>> = {
      20: 'Excelente',
      15: 'Muy bueno',
      10: 'Bueno',
      5: 'Regular',
      0: 'Malo',
    };
    return porcentaje === null ? '' : (nombres[porcentaje] ?? '');
  }

  constructor() {
    addIcons({
      barChartOutline,
      checkmarkDoneOutline,
      logOutOutline,
      qrCodeOutline,
      receiptOutline,
      timeOutline,
      walletOutline,
    });
  }
}
