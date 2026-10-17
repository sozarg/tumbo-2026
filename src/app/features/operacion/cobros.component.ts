import { NgOptimizedImage } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { CuentaDemo, EstadoCuenta } from '../../core/models/demo-restaurante';
import { PORCENTAJES_DE_PROPINA } from '../../core/services/cuenta-y-encuesta';
import { BotonConfirmacion } from '../../shared/components/boton-confirmacion/boton-confirmacion.component';

/** Qué cuenta se confirmó, y de qué mesa. */
export interface ConfirmacionDePago {
  readonly cuentaId: string;
  readonly mesa: number;
}

/**
 * Las cuentas de todas las mesas, para mozo, dueño y supervisor
 * (puntos 21 y 22).
 *
 * Cada cuenta tiene su propio «Confirmar pago». Antes había un solo
 * botón que confirmaba «la cuenta activa», que con varias mesas era
 * cualquiera.
 *
 * Abajo están los cinco QR de propina, para que el mozo se los muestre
 * al cliente desde su teléfono: el enunciado pide que todos los QR
 * estén también en pantalla.
 */
@Component({
  selector: 'tumbo-cobros',
  imports: [BotonConfirmacion, NgOptimizedImage],
  template: `
    <section class="cobros" aria-labelledby="cobros-titulo">
      <h2 id="cobros-titulo">Cuentas de las mesas</h2>
      <div class="cobros__lista">
        @for (cuenta of cuentas(); track cuenta.id) {
          <article class="cobro" [class.cobro--pagada]="cuenta.estado === 'pagada'">
            <div class="cobro__encabezado">
              <h3>Mesa {{ cuenta.mesa }}</h3>
              <span class="cobro__estado">{{ estado[cuenta.estado] }}</span>
            </div>
            @if (cuenta.estado !== 'solicitada') {
              <p class="cobro__total">{{ pesos(cuenta.total) }}</p>
            }
            @if (cuenta.estado === 'pagada') {
              <tumbo-boton-confirmacion
                buttonClass="approve-button"
                expand="block"
                [disabled]="procesando() === cuenta.id"
                title="Confirmar pago"
                [message]="
                  'Vas a confirmar el pago de ' +
                  pesos(cuenta.total) +
                  ' de la mesa ' +
                  cuenta.mesa +
                  ' y liberarla. ¿Querés continuar?'
                "
                (confirmado)="confirmar.emit({ cuentaId: cuenta.id, mesa: cuenta.mesa })"
              >
                Confirmar pago y liberar la mesa
              </tumbo-boton-confirmacion>
            }
          </article>
        } @empty {
          <p class="cobros__vacio">No hay cuentas pedidas ni pagos para confirmar.</p>
        }
      </div>

      <!--
        UN QR A LA VEZ, GRANDE, Y SE ELIGE CUÁL (corrección de scroll).

        Antes era un details con los cinco en grilla. Dos problemas:
        la etiqueta details arma adentro una caja propia que mide por su
        contenido y no se deja achicar —de ahí el scroll que aparecía en
        unos teléfonos y en otros no, según la versión del WebView—, y
        cinco QR chiquitos son justo lo contrario de lo que hace falta.

        Este QR se le MUESTRA al cliente para que lo escanee con su
        teléfono: lo que importa es que sea grande. Así que se elige el
        porcentaje con la fila de botones —la misma que el filtro del
        menú— y abajo va ese solo, ocupando el alto que haya. Sin scroll
        y sin paginador: a cualquiera de los cinco se llega de un toque.
      -->
      <section class="propinas" [class.propinas--abierto]="mostrarQr()">
        <button
          class="propinas__boton"
          type="button"
          [attr.aria-expanded]="mostrarQr()"
          aria-controls="propinas-panel"
          (click)="alternarQr()"
        >
          <span class="propinas__flecha" aria-hidden="true">{{ mostrarQr() ? '▾' : '▸' }}</span>
          QR de propina para mostrarle al cliente
        </button>
        @if (mostrarQr()) {
          <div class="propinas__panel" id="propinas-panel">
            <div class="propinas__opciones" role="tablist" aria-label="Porcentaje de propina">
              @for (porcentaje of porcentajes; track porcentaje) {
                <button
                  class="propinas__opcion"
                  type="button"
                  role="tab"
                  [class.propinas__opcion--activa]="propinaElegida() === porcentaje"
                  [attr.aria-selected]="propinaElegida() === porcentaje"
                  (click)="elegirPropina(porcentaje)"
                >
                  {{ porcentaje }} %
                </button>
              }
            </div>
            <figure class="propinas__figura">
              <img
                [ngSrc]="'imagenes/qr-propina-' + propinaElegida() + '.png'"
                width="140"
                height="140"
                priority
                [alt]="'QR de propina del ' + propinaElegida() + ' %'"
              />
              <figcaption>Propina del {{ propinaElegida() }} %</figcaption>
            </figure>
          </div>
        }
      </section>
    </section>
  `,
  styles: `
    /*
     * LA PANTALLA NO DESLIZA; LOS LISTADOS SÍ.
     *
     * Acá hay dos listas que crecen —las cuentas de las mesas y los
     * cinco QR de propina— y cuando el desplegable estaba abierto la
     * pantalla entera pedía scroll: 25 px en un teléfono alto y 257 en
     * uno de 640. Es lo que el profesor marcó en T2.
     *
     * La salida es la que él mismo dio en T4: el scroll va adentro del
     * listado, nunca en la pantalla. El título y el desplegable quedan
     * siempre a la vista.
     */
    :host {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .cobros {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.8rem;
      min-height: 0;
    }
    .cobros__lista {
      display: grid;
      flex: 1;
      align-content: start;
      grid-auto-rows: max-content;
      gap: 0.8rem;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
    }
    /*
     * Con el desplegable abierto manda la grilla de QR: es lo que la
     * persona abrió para mirar. El listado de cuentas cede y se queda
     * con lo suyo.
     */
    .cobros:has(.propinas--abierto) .cobros__lista {
      flex: 0 1 auto;
    }
    h2 {
      margin: 0;
      color: var(--tumbo-azul-sombra);
      font-size: clamp(1.15rem, 5vw, 1.4rem);
    }
    .cobro {
      display: grid;
      gap: 0.6rem;
      border: 0.1rem solid rgb(0 53 146 / 15%);
      border-radius: 1rem;
      padding: 1rem;
      background: var(--tumbo-crema-brillante);
      color: var(--tumbo-azul-sombra);
    }
    .cobro--pagada {
      border-color: var(--tumbo-azul-accion);
    }
    .cobro__encabezado {
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
    .cobro__estado {
      border-radius: 999px;
      padding: 0.25rem 0.6rem;
      background: rgb(0 53 146 / 8%);
      font-size: 0.8rem;
      font-weight: 700;
    }
    .cobro__total {
      margin: 0;
      font-size: 1.6rem;
      font-weight: 700;
    }
    /*
     * Sin cuentas pedidas el cartel ocupa el alto del listado, centrado.
     * El enunciado lo pide así: «las pantallas de espera, error y
     * contenido vacío deben ocupar el espacio disponible con una
     * composición intencional».
     */
    /*
     * Sin cuentas, el cartel ocupa el listado entero. Antes medía lo que
     * mide su texto y abajo quedaba una banda vacía hasta el botón de
     * los QR, que parecía puesto ahí de casualidad.
     */
    .cobros__lista:has(> .cobros__vacio) {
      grid-auto-rows: minmax(0, 1fr);
    }
    .cobros__vacio {
      display: grid;
      align-content: center;
      margin: 0;
      border: 0.1rem dashed rgb(0 53 146 / 25%);
      border-radius: 1rem;
      padding: 1rem;
      background: var(--tumbo-crema-brillante);
      color: var(--tumbo-azul-sombra);
      text-align: center;
    }
    .propinas {
      flex: 0 0 auto;
      border-radius: 1rem;
      padding: 0.85rem 1rem;
      background: var(--tumbo-crema-brillante);
      color: var(--tumbo-azul-sombra);
    }
    .propinas--abierto {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }
    .propinas__boton {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      min-height: 44px;
      border: 0;
      padding: 0;
      background: none;
      color: inherit;
      font: inherit;
      font-weight: 700;
      text-align: start;
      cursor: pointer;
    }
    .propinas__boton:focus-visible {
      outline: 3px solid var(--tumbo-azul-sombra);
      outline-offset: 2px;
    }
    .propinas__flecha {
      flex-shrink: 0;
    }
    .propinas__panel {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.6rem;
      min-height: 0;
      margin-top: 0.75rem;
    }
    .propinas__opciones {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .propinas__opcion {
      flex: 1 1 3.5rem;
      min-height: 40px;
      border: 1px solid rgb(0 53 146 / 25%);
      border-radius: 999px;
      padding: 0.3rem 0.5rem;
      background: var(--tumbo-azul-brillante);
      color: var(--tumbo-azul-sombra);
      font: inherit;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
    }
    .propinas__opcion--activa {
      border-color: var(--tumbo-azul-accion);
      background: var(--tumbo-azul-accion);
      color: var(--tumbo-azul-brillante);
    }
    .propinas__opcion:focus-visible {
      outline: 3px solid var(--tumbo-azul-sombra);
      outline-offset: 2px;
    }
    /*
     * El QR se queda con el alto que sobre y se mantiene cuadrado: es
     * lo que otro teléfono tiene que poder leer desde enfrente.
     */
    .propinas__figura {
      display: flex;
      flex: 1;
      align-items: center;
      flex-direction: column;
      gap: 0.4rem;
      min-height: 0;
      margin: 0;
    }
    /*
     * El QR toma todo el alto que le sobra al panel, recortado para
     * mantenerlo cuadrado y centrado: lo que importa acá es que se vea
     * grande desde enfrente, porque lo escanea el teléfono del cliente.
     */
    img {
      flex: 1;
      width: 100%;
      min-height: 0;
      object-fit: contain;
      border-radius: 0.5rem;
    }
    figcaption {
      font-weight: 700;
    }
  `,
})
export class Cobros {
  readonly cuentas = input.required<readonly CuentaDemo[]>();
  /** La cuenta que se está guardando, para no aceptar un segundo toque. */
  readonly procesando = input<string | null>(null);
  readonly confirmar = output<ConfirmacionDePago>();

  protected readonly porcentajes = PORCENTAJES_DE_PROPINA;
  protected readonly mostrarQr = signal(false);
  /** Qué QR se está mostrando. El 10 % es el que más se usa. */
  protected readonly propinaElegida = signal<number>(10);
  protected readonly estado: Readonly<Record<EstadoCuenta, string>> = {
    solicitada: 'Pidió la cuenta',
    pendiente_pago: 'Eligió la propina',
    pagada: 'Pagó: falta confirmar',
    confirmada: 'Confirmada',
  };

  private readonly formato = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
  protected readonly pesos = (monto: number) => this.formato.format(monto);

  protected elegirPropina(porcentaje: number): void {
    this.propinaElegida.set(porcentaje);
  }

  protected alternarQr(): void {
    this.mostrarQr.update((abierto) => !abierto);
  }
}
