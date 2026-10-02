import { Component, input, output, signal } from '@angular/core';

export type Jugada = 'piedra' | 'papel' | 'tijera';
export const JUGADAS: readonly Jugada[] = ['piedra', 'papel', 'tijera'];

/** Quién gana una mano: pura, para poder probarla sin pantalla. */
export function ganador(persona: Jugada, tumbito: Jugada): 'persona' | 'tumbito' | 'empate' {
  if (persona === tumbito) return 'empate';
  const leGana: Record<Jugada, Jugada> = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' };
  return leGana[persona] === tumbito ? 'persona' : 'tumbito';
}

const NOMBRE: Record<Jugada, string> = { piedra: 'Piedra', papel: 'Papel', tijera: 'Tijera' };

/**
 * «Piedra, papel o tijera» (punto 15, el del 20 %).
 *
 * Una mano contra Tumbito; si empatan se vuelve a elegir. Es el de más
 * descuento y el de más suerte: el enunciado no pide que sean difíciles,
 * pide que el descuento valga solo si se gana en el primer intento.
 */
@Component({
  selector: 'tumbo-juego-piedra-papel-tijera',
  template: `
    <div class="juego">
      @if (resultado() === null || resultado() === 'empate') {
        <div class="jugadas" role="group" aria-label="Elegí tu jugada">
          @for (jugada of jugadas; track jugada) {
            <button type="button" [disabled]="deshabilitado()" (click)="jugar(jugada)">
              {{ nombre[jugada] }}
            </button>
          }
        </div>
      } @else {
        <button type="button" [disabled]="deshabilitado()" (click)="resultado.set(null)">
          Jugar de nuevo
        </button>
      }
      <p class="estado" aria-live="polite">{{ mensaje() }}</p>
    </div>
  `,
  styles: `
    .juego {
      display: grid;
      gap: 0.5rem;
      color: var(--tumbo-azul-sombra);
    }
    .jugadas {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
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
    button:disabled {
      opacity: 0.6;
      cursor: default;
    }
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
export class JuegoPiedraPapelTijera {
  readonly deshabilitado = input(false);
  /** Para las pruebas: la jugada de Tumbito. Sin esto, al azar. */
  readonly jugadaFija = input<Jugada | null>(null);
  readonly terminado = output<boolean>();

  protected readonly jugadas = JUGADAS;
  protected readonly nombre = NOMBRE;
  protected readonly resultado = signal<'persona' | 'tumbito' | 'empate' | null>(null);
  protected readonly mensaje = signal('Elegí piedra, papel o tijera.');

  protected jugar(persona: Jugada): void {
    const tumbito = this.jugadaFija() ?? JUGADAS[Math.floor(Math.random() * JUGADAS.length)];
    const quien = ganador(persona, tumbito);
    this.resultado.set(quien);
    const contra = `${NOMBRE[persona]} contra ${NOMBRE[tumbito].toLowerCase()}:`;
    if (quien === 'empate') {
      this.mensaje.set(`${contra} empate. Elegí de nuevo.`);
      return;
    }
    this.mensaje.set(`${contra} ${quien === 'persona' ? '¡ganaste!' : 'ganó Tumbito.'}`);
    this.terminado.emit(quien === 'persona');
  }
}
