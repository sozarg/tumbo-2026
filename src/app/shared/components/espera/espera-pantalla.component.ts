import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EsperaGlobal } from '../../../core/ui/espera-global.service';
import { Espera } from './espera.component';

/**
 * El indicador de espera que ocupa la pantalla (requisito excluyente R10).
 *
 * Vive una sola vez, en el componente raíz, y se prende solo cuando
 * `EsperaGlobal` dice que hay algo en curso. Ninguna pantalla lo
 * declara ni lo posiciona: por eso el indicador es el mismo en toda la
 * aplicación y aparece siempre en el mismo lugar, que es la mitad de lo
 * que el profesor pidió.
 *
 * La otra mitad es que sea independiente de los controles. Esta capa
 * cubre todo y se come los toques, así que mientras se guarda algo la
 * pantalla no acepta nada: el indicador no solo avisa, impide.
 */
@Component({
  selector: 'tumbo-espera-pantalla',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Espera],
  template: `
    @if (espera.esperando()) {
      <div class="velo" aria-busy="true">
        <div class="velo__caja">
          <tumbo-espera [etiqueta]="espera.etiqueta()" tamano="grande" />
          <p class="velo__texto">{{ espera.etiqueta() }}…</p>
        </div>
      </div>
    }
  `,
  styles: `
    .velo {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: grid;
      place-items: center;
      /* Tapa pero deja ver: la pantalla de atrás sigue dando contexto de
         qué se está guardando. */
      background: rgb(0 53 146 / 72%);
      backdrop-filter: blur(2px);
      padding: 24px;
      animation: velo-aparecer 140ms ease-out;
    }

    .velo__caja {
      display: grid;
      justify-items: center;
      gap: 14px;
      max-width: 20rem;
      padding: 26px 30px;
      border-radius: 18px;
      background: var(--tumbo-crema-fondo, #fbf1d5);
      box-shadow: 0 18px 44px rgb(0 0 0 / 32%);
      text-align: center;
    }

    .velo__texto {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.35;
      /* El mismo azul del anillo: el texto y el indicador se leen como
         una sola cosa y no como dos elementos que coincidieron. */
      color: var(--tumbo-azul-sombra, #003592);
      overflow-wrap: anywhere;
    }

    @keyframes velo-aparecer {
      from {
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .velo {
        animation: none;
      }
    }
  `,
})
export class EsperaPantalla {
  protected readonly espera = inject(EsperaGlobal);
}
