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

      <details class="propinas" [open]="mostrarQr()" (toggle)="alternarQr($event)">
        <summary>QR de propina para mostrarle al cliente</summary>
        <div class="propinas__grilla">
          @for (porcentaje of porcentajes; track porcentaje) {
            <figure>
              <img
                [ngSrc]="'imagenes/qr-propina-' + porcentaje + '.png'"
                width="140"
                height="140"
                [alt]="'QR de propina del ' + porcentaje + ' %'"
              />
              <figcaption>{{ porcentaje }} %</figcaption>
            </figure>
          }
        </div>
      </details>
    </section>
  `,
  styles: `
    :host {
      display: block;
      margin-top: clamp(1rem, 4vw, 2rem);
    }
    .cobros {
      display: grid;
      gap: 0.8rem;
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
    .cobros__vacio {
      margin: 0;
      border: 0.1rem dashed rgb(0 53 146 / 25%);
      border-radius: 1rem;
      padding: 1rem;
      background: var(--tumbo-crema-brillante);
      color: var(--tumbo-azul-sombra);
      text-align: center;
    }
    .propinas {
      border-radius: 1rem;
      padding: 0.85rem 1rem;
      background: var(--tumbo-crema-brillante);
      color: var(--tumbo-azul-sombra);
    }
    summary {
      min-height: 44px;
      align-content: center;
      font-weight: 700;
      cursor: pointer;
    }
    summary:focus-visible {
      outline: 3px solid var(--tumbo-azul-sombra);
      outline-offset: 2px;
    }
    .propinas__grilla {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
      gap: 0.75rem;
      margin-top: 0.75rem;
    }
    figure {
      display: grid;
      justify-items: center;
      gap: 0.3rem;
      margin: 0;
    }
    img {
      width: 100%;
      max-width: 140px;
      height: auto;
      object-fit: contain;
      border-radius: 0.5rem;
      background: var(--tumbo-azul-brillante);
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

  protected alternarQr(evento: Event): void {
    this.mostrarQr.set((evento.target as HTMLDetailsElement).open);
  }
}
