import { Component, input, signal } from '@angular/core';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonInput } from '@ionic/angular/ion-input';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';
import { LIMITES } from '../../../core/validacion/limites';

/**
 * Un campo de contraseña con el botón de mostrar y ocultar.
 *
 * ───────────────────────────────────────────────────────────────────
 * PARA QUÉ
 *
 * Una contraseña escrita a ciegas en un teclado de teléfono se
 * equivoca seguido, y el alta pide escribirla dos veces: sin forma de
 * verla, el error aparece recién al confirmar y hay que rehacer las
 * dos. La pantalla de ingreso ya tenía el ojo; las altas no.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ UN COMPONENTE Y NO EL BOTÓN COPIADO EN CADA FORMULARIO
 *
 * Son cinco campos repartidos en tres pantallas. Copiado, cada copia
 * necesita su propia señal, su propio `aria-label` y su propio
 * posicionamiento, y basta con que alguien toque uno para que queden
 * distintos. Acá el estado de «visible» vive adentro de cada campo,
 * que es donde corresponde: ver una contraseña no tiene por qué
 * revelar la otra.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ EL `viewProviders`
 *
 * `formControlName` busca el formulario con `@Host()`, y ese alcance
 * se corta en el borde de este componente. El `viewProviders` vuelve a
 * exponer el `FormGroupDirective` del `<form>` de afuera adentro de
 * esta plantilla; es la forma estándar de que un campo propio siga
 * siendo parte del formulario reactivo de quien lo usa.
 */
@Component({
  selector: 'tumbo-campo-clave',
  imports: [IonButton, IonIcon, IonInput, ReactiveFormsModule],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  template: `
    <ion-input
      [attr.id]="idCampo()"
      [label]="etiqueta()"
      [labelPlacement]="etiqueta() ? 'stacked' : undefined"
      [formControlName]="control()"
      fill="outline"
      [type]="visible() ? 'text' : 'password'"
      [autocomplete]="autocompletado()"
      [maxlength]="maximo()"
      [placeholder]="marcador()"
      [attr.aria-invalid]="invalido() ? 'true' : null"
    />
    <ion-button
      class="campo-clave__ojo"
      fill="clear"
      type="button"
      [attr.aria-label]="visible() ? 'Ocultar la contraseña' : 'Mostrar la contraseña'"
      [attr.aria-pressed]="visible()"
      (click)="alternar()"
    >
      <ion-icon
        aria-hidden="true"
        slot="icon-only"
        [name]="visible() ? 'eye-off-outline' : 'eye-outline'"
      />
    </ion-button>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      min-width: 0;
    }

    /*
     * El campo toma prestado el aspecto de donde esté.
     *
     * Las variables de Ionic no sirven para eso: ion-input las declara
     * en su propio :host, y una declaración sobre el elemento le gana
     * siempre a lo que venga heredado de arriba. Por eso la pantalla de
     * afuera habla por las de TUMBO —--tumbo-campo-borde y compañía—,
     * que Ionic no conoce y por lo tanto no pisa, y acá se traducen.
     *
     * El alto y la tipografía tampoco se heredan por sí mismos:
     * declarándolos como heredados, el campo queda igual que los de al
     * lado tanto en el registro (52 px) como en las altas de adentro
     * (56 px), sin que este componente tenga que saber en cuál está.
     */
    ion-input {
      --background: var(--tumbo-campo-fondo, var(--tumbo-azul-brillante));
      --color: var(--tumbo-campo-texto, var(--tumbo-azul-sombra));
      --border-color: var(--tumbo-campo-borde, #7386a2);
      --border-radius: 10px;
      --padding-start: 14px;
      --padding-end: 52px;
      width: 100%;
      min-height: inherit;
      font-size: inherit;
    }

    /*
     * El ojo se centra sobre la caja en vez de colgar de arriba: con la
     * etiqueta adentro del marco (las altas) y con la etiqueta afuera
     * (el registro) la caja tiene alturas distintas, y una distancia
     * fija desde el borde superior solo queda bien en una de las dos.
     */
    .campo-clave__ojo {
      position: absolute;
      top: 50%;
      right: 4px;
      z-index: 2;
      transform: translateY(-50%);
      width: 44px;
      height: 44px;
      min-height: 44px;
      margin: 0;
      --color: var(--tumbo-azul-sombra);
      --border-radius: 8px;
    }
  `,
})
export class CampoClave {
  /** El nombre del control dentro del formulario de quien lo usa. */
  readonly control = input.required<string>();
  /** La etiqueta adentro del marco. Vacía cuando la pone el de afuera. */
  readonly etiqueta = input<string | undefined>(undefined);
  /** Para el `<label for>` del registro, que escribe su etiqueta aparte. */
  readonly idCampo = input<string | undefined>(undefined);
  readonly autocompletado = input('new-password');
  readonly maximo = input(LIMITES.clave.max);
  readonly marcador = input('');
  readonly invalido = input(false);

  /** Visible solo este campo: ver uno no revela el otro. */
  protected readonly visible = signal(false);

  constructor() {
    addIcons({ eyeOffOutline, eyeOutline });
  }

  protected alternar(): void {
    this.visible.update((visible) => !visible);
  }
}
