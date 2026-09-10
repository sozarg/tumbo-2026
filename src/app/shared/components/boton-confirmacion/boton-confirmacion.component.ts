import { Component, input, output, signal } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonModal } from '@ionic/angular/ion-modal';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';

/** Botón de acción que exige confirmar antes de emitir la operación. */
@Component({
  selector: 'tumbo-boton-confirmacion',
  imports: [IonButton, IonButtons, IonHeader, IonModal, IonTitle, IonToolbar],
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
      [attr.aria-label]="title()"
      [isOpen]="abierto()"
      [backdropDismiss]="false"
      (didDismiss)="cancelar()"
    >
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ title() }}</ion-title>
            <ion-buttons slot="end">
              <ion-button fill="clear" (click)="cancelar()">Cerrar</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <div class="confirmation-content">
          <p>{{ message() }}</p>
          <div class="confirmation-actions">
            <ion-button fill="outline" (click)="cancelar()">Cancelar</ion-button>
            <ion-button class="primary-action" (click)="confirmar()">Confirmar</ion-button>
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
    ion-modal { --height: auto; --width: min(92vw, 30rem); --max-height: 90vh; --border-radius: 1rem; }
    ion-modal ion-toolbar { --min-height: 3.5rem; --background: #fcedbb; --color: #003592; }
    .confirmation-content { box-sizing: border-box; width: 100%; padding: .75rem 1rem 1rem; background: #fbf1d5; }
    .confirmation-actions { display: flex; justify-content: flex-end; gap: .6rem; flex-wrap: wrap; margin-top: 1rem; }
    .confirmation-actions ion-button { flex: 1 1 8rem; min-height: 48px; }
    ion-modal p { margin: 0; color: #003592; font-size: 1rem; line-height: 1.45; }
    @media (max-width: 480px) {
      ion-modal { --width: calc(100vw - 1.5rem); --border-radius: .85rem; }
      ion-modal ion-toolbar { --min-height: 3.25rem; }
      .confirmation-actions { gap: .5rem; margin-top: .85rem; }
      .confirmation-actions ion-button { flex-basis: 100%; min-height: 44px; }
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
  protected readonly abierto = signal(false);

  protected abrir(): void { this.abierto.set(true); }

  protected cancelar(): void { this.abierto.set(false); }

  protected confirmar(): void {
    this.abierto.set(false);
    this.confirmado.emit();
  }
}
