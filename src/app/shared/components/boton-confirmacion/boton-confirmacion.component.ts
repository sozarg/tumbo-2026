import { Component, input, output, signal } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonModal } from '@ionic/angular/ion-modal';
import { addIcons } from 'ionicons';
import { helpCircleOutline } from 'ionicons/icons';

/** Botón de acción que exige confirmar antes de emitir la operación. */
@Component({
  selector: 'tumbo-boton-confirmacion',
  imports: [IonButton, IonIcon, IonModal],
  template: `
    <ion-button
      [class]="buttonClass()"
      [disabled]="disabled()"
      [expand]="expand()"
      [fill]="fill()"
      [attr.aria-label]="ariaLabel()"
      [size]="size()"
      [type]="buttonType()"
      (click)="abrir()"
    >
      <ng-content />
    </ion-button>

    <ion-modal
      class="confirmacion"
      [attr.aria-label]="title()"
      [isOpen]="abierto()"
      [backdropDismiss]="false"
      (didDismiss)="cancelar()"
    >
      <ng-template>
        <div class="confirmacion__caja">
          <span class="confirmacion__icono" aria-hidden="true">
            <ion-icon name="help-circle-outline" />
          </span>

          <h2 class="confirmacion__titulo">{{ title() }}</h2>
          <p class="confirmacion__texto">{{ message() }}</p>

          <div class="confirmacion__acciones">
            <ion-button class="confirmacion__cancelar" fill="outline" (click)="cancelar()">
              Cancelar
            </ion-button>
            <ion-button class="confirmacion__aceptar" (click)="confirmar()">Confirmar</ion-button>
          </div>
        </div>
      </ng-template>
    </ion-modal>
  `,
  styles: `
    :host { display: contents; }
    ion-button { min-height: 52px; margin: 0; font-size: 13px; letter-spacing: normal; }
    ion-button.primary-action { min-height: 60px; --border-radius: 0.7rem; --background: #fbb103; --color: #003592; --background-hover: #e7a000; }
    ion-button.approve-button { --border-radius: 0.7rem; --background: #006ae7; --background-hover: #003592; --color: #f8fbfd; }
    ion-button.reject-button { --border-radius: 0.7rem; --color: #003592; --border-color: #003592; }
    ion-button.table-tile { width: 100%; --color: #003592; --background: rgb(220 91 2 / 10%); --border-radius: .9rem; }
    ion-button.table-tile::part(native) { display: flex; flex-direction: column; align-items: flex-start; border: .1rem solid rgb(220 91 2 / 36%); padding: .85rem; color: #003592; font: inherit; text-align: left; }
    ion-button.table-tile--free { --background: rgb(0 106 231 / 9%); }
    ion-button.table-tile--free::part(native) { border-color: rgb(0 106 231 / 35%); }
    ion-button.table-tile .table-tile__number { color: #006ae7; font-size: 1.8rem; line-height: 1; }
    ion-button.icon-danger { width: 44px; height: 44px; min-height: 44px; --color: #dc5b02; --background: #fcf1d5; --border-radius: 50%; --box-shadow: none; }
    ion-button.icon-danger::part(native) { width: 44px; height: 44px; min-height: 44px; padding: 0; border: 1px solid rgb(220 91 2 / 55%); }
    ion-button.icon-danger:hover { --background: #fcedbb; }
    /*
      EL DIÁLOGO DE CONFIRMACIÓN

      Antes usaba ion-header + ion-toolbar + ion-title, que son los
      componentes de una PANTALLA completa, no de un cartel chico. Traía
      dos problemas: la barra de arriba no se parecía al resto de la
      aplicación, y el ion-title CORTA el texto con puntos suspensivos
      —"Confirmar alta de emplea…"—, que es justo lo que el enunciado
      prohíbe.

      Ahora es una tarjeta y el título es un <h2> común, que se parte en
      dos renglones en vez de cortarse.
    */
    ion-modal.confirmacion {
      --width: min(92vw, 24rem);
      --height: auto;
      --border-radius: 1.25rem;
      --backdrop-opacity: .45;
      --box-shadow: 0 1.5rem 3rem rgb(0 53 146 / 25%);
    }
    .confirmacion__caja {
      display: flex; flex-direction: column; align-items: center;
      box-sizing: border-box; width: 100%;
      padding: 1.75rem 1.25rem 1.25rem;
      background: var(--tumbo-crema-fondo, #fbf1d5);
      text-align: center;
    }
    .confirmacion__icono {
      display: grid; place-items: center;
      width: 3.25rem; height: 3.25rem; margin-bottom: .85rem;
      border-radius: 50%;
      background: var(--tumbo-amarillo-marca, #fbb103);
      color: var(--tumbo-azul-sombra, #003592);
      font-size: 1.75rem;
    }
    .confirmacion__titulo {
      margin: 0 0 .5rem;
      color: var(--tumbo-azul-sombra, #003592);
      font-size: 1.15rem; font-weight: 700; line-height: 1.25;
      /* Que se parta en dos renglones antes que cortarse. */
      overflow-wrap: anywhere;
    }
    .confirmacion__texto {
      margin: 0 0 1.35rem;
      color: var(--tumbo-azul-sombra, #003592);
      font-size: .95rem; line-height: 1.45; opacity: .85;
    }
    .confirmacion__acciones { display: flex; gap: .6rem; width: 100%; }
    .confirmacion__acciones ion-button {
      flex: 1; min-height: 3rem; margin: 0;
      --border-radius: .75rem;
      font-size: .95rem; font-weight: 600; text-transform: none;
    }
    .confirmacion__cancelar {
      --border-color: var(--tumbo-azul-sombra, #003592);
      --border-width: .12rem;
      --color: var(--tumbo-azul-sombra, #003592);
    }
    .confirmacion__aceptar {
      --background: var(--tumbo-amarillo-marca, #fbb103);
      --background-hover: #e7a000;
      --background-activated: #e7a000;
      --color: var(--tumbo-azul-sombra, #003592);
      --box-shadow: none;
    }
    /* En pantallas muy angostas los botones van uno arriba del otro. */
    @media (max-width: 22rem) {
      .confirmacion__acciones { flex-direction: column; }
    }
  `,
})
export class BotonConfirmacion {
  readonly buttonClass = input('primary-action');
  readonly buttonType = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly expand = input<'full' | 'block' | undefined>(undefined);
  readonly fill = input<'clear' | 'default' | 'outline' | 'solid' | undefined>(undefined);
  readonly size = input<'small' | 'default' | 'large' | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly title = input('Confirmar operación');
  readonly message = input('¿Querés confirmar esta operación?');
  readonly confirmado = output<void>();

  /**
   * Se consulta ANTES de abrir el diálogo.
   *
   * POR QUÉ
   * Sin esto el cartel se abría con el formulario inválido: la persona
   * confirmaba, y del otro lado la validación cortaba y no pasaba nada.
   * O sea, confirmar una operación que ya se sabía que no iba a suceder.
   * Devolviendo `false` acá, el diálogo no se abre y quien llama muestra
   * los errores en los campos, que es donde hay que mirar.
   */
  readonly puedeConfirmar = input<(() => boolean) | undefined>(undefined);

  protected readonly abierto = signal(false);

  constructor() {
    addIcons({ helpCircleOutline });
  }

  protected abrir(): void {
    if (this.puedeConfirmar()?.() === false) return;

    this.abierto.set(true);
  }

  protected cancelar(): void { this.abierto.set(false); }

  /**
   * Emite UNA sola vez por apertura.
   *
   * POR QUÉ HACE FALTA EL GUARDA
   * Cerrar el modal es asíncrono: `abierto.set(false)` pide el cierre,
   * pero la animación de Ionic tarda, y mientras tanto el botón
   * "Confirmar" sigue en pantalla y sigue aceptando toques. Dos toques
   * rápidos emitían dos veces, y del otro lado eso son dos altas: la
   * primera entra y la segunda choca contra el DNI único. Quien lo hizo
   * ve un error y cree que no se guardó nada, cuando sí se guardó.
   *
   * Preguntar por `abierto()` alcanza: en el segundo toque ya está en
   * false y la emisión no sale.
   */
  protected confirmar(): void {
    if (!this.abierto()) return;

    this.abierto.set(false);
    this.confirmado.emit();
  }
}
