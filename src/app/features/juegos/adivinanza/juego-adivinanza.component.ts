import { Component, OnInit, input, output, signal } from '@angular/core';

/** Cuántos números hay y cuántos intentos tiene la persona. */
export const MAXIMO = 50;
export const INTENTOS = 6;

/** La pista de cada intento: pura, para poder probarla sin pantalla. */
export function pista(secreto: number, propuesta: number): 'mayor' | 'menor' | 'acertaste' {
  return propuesta === secreto ? 'acertaste' : propuesta < secreto ? 'mayor' : 'menor';
}

/**
 * «Adivinanza del número» (punto 15, el del 15 %).
 *
 * Hay que adivinar un número del 1 al 50 en seis intentos, con la pista
 * de si es mayor o menor. Seis alcanzan siempre si se busca por la
 * mitad, así que se gana pensando, no de suerte. Al terminar avisa si
 * ganó; el descuento lo decide la base.
 */
@Component({
  selector: 'tumbo-juego-adivinanza',
  template: `
    <div class="juego">
      @if (estado() === 'jugando') {
        <form (submit)="$event.preventDefault(); probar()">
          <label for="adivinanza-numero">Tu número (1 a {{ maximo }})</label>
          <div class="fila">
            <input
              id="adivinanza-numero"
              type="number"
              inputmode="numeric"
              min="1"
              [max]="maximo"
              [value]="propuesta()"
              (input)="propuesta.set($any($event.target).value)"
              [disabled]="deshabilitado()"
            />
            <button type="submit" [disabled]="deshabilitado()">Probar</button>
          </div>
        </form>
        <p class="estado" aria-live="polite">
          {{ mensaje() }} Te quedan {{ restantes() }}
          {{ restantes() === 1 ? 'intento' : 'intentos' }}.
        </p>
      } @else {
        <p class="estado" role="status">
          {{
            estado() === 'gano'
              ? '¡Acertaste! Era el ' + secreto() + '.'
              : 'No llegaste: era el ' + secreto() + '.'
          }}
        </p>
        <button type="button" (click)="empezar()" [disabled]="deshabilitado()">
          Jugar de nuevo
        </button>
      }
    </div>
  `,
  styles: `
    .juego {
      display: grid;
      gap: 0.5rem;
      color: var(--tumbo-azul-sombra);
    }
    label {
      font-weight: 700;
    }
    .fila {
      display: flex;
      gap: 0.5rem;
    }
    input {
      width: 6rem;
      min-height: 44px;
      border: 2px solid var(--tumbo-azul-sombra);
      border-radius: 0.5rem;
      padding: 0 0.6rem;
      background: var(--tumbo-azul-brillante);
      color: var(--tumbo-azul-sombra);
      font-size: 1rem;
    }
    button {
      min-height: 44px;
      border: none;
      border-radius: 0.5rem;
      padding: 0 1rem;
      background: var(--tumbo-amarillo-marca);
      color: var(--tumbo-azul-sombra);
      font-weight: 700;
      cursor: pointer;
    }
    button:disabled,
    input:disabled {
      opacity: 0.6;
      cursor: default;
    }
    input:focus-visible,
    button:focus-visible {
      outline: 3px solid var(--tumbo-azul-sombra);
      outline-offset: 2px;
    }
    .estado {
      margin: 0;
      font-weight: 600;
    }
  `,
})
export class JuegoAdivinanza implements OnInit {
  /** Mientras se guarda una partida no se juega otra. */
  readonly deshabilitado = input(false);
  /** Para las pruebas: el número a adivinar. Sin esto, al azar. */
  readonly numeroFijo = input<number | null>(null);
  readonly terminado = output<boolean>();

  protected readonly maximo = MAXIMO;
  protected readonly secreto = signal(0);
  protected readonly propuesta = signal('');
  protected readonly restantes = signal(INTENTOS);
  protected readonly mensaje = signal('Pensé un número.');
  protected readonly estado = signal<'jugando' | 'gano' | 'perdio'>('jugando');

  ngOnInit(): void {
    this.empezar();
  }

  protected empezar(): void {
    this.secreto.set(this.numeroFijo() ?? 1 + Math.floor(Math.random() * MAXIMO));
    this.propuesta.set('');
    this.restantes.set(INTENTOS);
    this.mensaje.set('Pensé un número.');
    this.estado.set('jugando');
  }

  protected probar(): void {
    const numero = Number(this.propuesta());
    if (!Number.isInteger(numero) || numero < 1 || numero > MAXIMO) {
      this.mensaje.set(`Elegí un número entero del 1 al ${MAXIMO}.`);
      return;
    }
    const resultado = pista(this.secreto(), numero);
    this.restantes.update((n) => n - 1);
    this.propuesta.set('');
    if (resultado === 'acertaste') {
      this.estado.set('gano');
      this.terminado.emit(true);
    } else if (this.restantes() === 0) {
      this.estado.set('perdio');
      this.terminado.emit(false);
    } else {
      this.mensaje.set(`El número es ${resultado} que ${numero}.`);
    }
  }
}
