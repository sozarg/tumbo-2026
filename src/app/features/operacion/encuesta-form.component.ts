import { Component, computed, effect, input, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { IonButton } from '@ionic/angular/ion-button';
import { IonCheckbox } from '@ionic/angular/ion-checkbox';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonRadio } from '@ionic/angular/ion-radio';
import { IonRadioGroup } from '@ionic/angular/ion-radio-group';
import { IonRange } from '@ionic/angular/ion-range';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonTextarea } from '@ionic/angular/ion-textarea';
import { IonToggle } from '@ionic/angular/ion-toggle';
import { addIcons } from 'ionicons';
import { star, starOutline } from 'ionicons/icons';
import {
  PreguntaDeEncuesta,
  RespuestasDeEncuesta,
  ValorDeRespuesta,
} from '../../core/models/encuesta';
import { errorDeRespuesta } from '../../core/services/cuenta-y-encuesta';

/**
 * La encuesta del punto 20 con las preguntas reales de la base.
 *
 * Cada pregunta trae su tipo de control, y el enunciado pide justamente
 * eso: variedad de controles, no siempre el mismo. Se responde de a una
 * pregunta por pantalla, porque la aplicación no desplaza contenido, y
 * no se avanza con una respuesta inválida.
 *
 * La validación es la misma regla que aplica la base al guardar
 * (`errorDeRespuesta` espeja a `responder_encuesta()`).
 */
@Component({
  selector: 'tumbo-encuesta-form',
  imports: [
    IonButton,
    IonCheckbox,
    IonIcon,
    IonRadio,
    IonRadioGroup,
    IonRange,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonToggle,
    ReactiveFormsModule,
  ],
  template: `
    @if (actual(); as pregunta) {
      <form class="encuesta" [formGroup]="formulario()" (ngSubmit)="avanzar()" novalidate>
        <p class="encuesta__progreso" aria-live="polite">
          Pregunta {{ paso() + 1 }} de {{ preguntas().length }}
        </p>
        <fieldset [attr.aria-describedby]="error() ? 'error-' + pregunta.id : null">
          <legend>
            {{ pregunta.texto }}
            @if (!pregunta.requerida) {
              <small>(opcional)</small>
            }
          </legend>

          @switch (pregunta.tipo) {
            @case ('estrellas') {
              <div class="estrellas" role="radiogroup" [attr.aria-label]="pregunta.texto">
                @for (valor of escala(pregunta); track valor) {
                  <button
                    type="button"
                    role="radio"
                    [attr.aria-checked]="control(pregunta).value === valor"
                    [attr.aria-label]="valor + (valor === 1 ? ' estrella' : ' estrellas')"
                    (click)="elegir(pregunta, valor)"
                  >
                    <ion-icon
                      aria-hidden="true"
                      [name]="numero(control(pregunta).value) >= valor ? 'star' : 'star-outline'"
                    />
                  </button>
                }
              </div>
            }
            @case ('radio') {
              <ion-radio-group [formControlName]="pregunta.id">
                @for (opcion of pregunta.opciones; track opcion) {
                  <ion-radio [value]="opcion" labelPlacement="end" justify="start">{{
                    opcion
                  }}</ion-radio>
                }
              </ion-radio-group>
            }
            @case ('checkbox') {
              <div class="opciones">
                @for (opcion of pregunta.opciones; track opcion) {
                  <ion-checkbox
                    labelPlacement="end"
                    justify="start"
                    [checked]="marcada(pregunta, opcion)"
                    (ionChange)="alternar(pregunta, opcion, $event.detail.checked)"
                    >{{ opcion }}</ion-checkbox
                  >
                }
              </div>
            }
            @case ('select') {
              <ion-select
                [formControlName]="pregunta.id"
                interface="popover"
                label="Elegí una opción"
                labelPlacement="stacked"
                fill="outline"
                placeholder="Elegí una opción"
              >
                @for (opcion of pregunta.opciones; track opcion) {
                  <ion-select-option [value]="opcion">{{ opcion }}</ion-select-option>
                }
              </ion-select>
            }
            @case ('rango') {
              <ion-range
                [formControlName]="pregunta.id"
                [min]="pregunta.minimo ?? 1"
                [max]="pregunta.maximo ?? 10"
                [step]="1"
                [ticks]="true"
                [snaps]="true"
                [pin]="true"
                [attr.aria-label]="pregunta.texto"
              >
                <span slot="start">{{ pregunta.minimo ?? 1 }}</span>
                <span slot="end">{{ pregunta.maximo ?? 10 }}</span>
              </ion-range>
              <p class="encuesta__valor">Elegiste: {{ control(pregunta).value ?? '—' }}</p>
            }
            @case ('interruptor') {
              <ion-toggle [formControlName]="pregunta.id" labelPlacement="end" justify="start">
                {{ control(pregunta).value ? 'Sí' : 'No' }}
              </ion-toggle>
            }
            @case ('texto_largo') {
              <ion-textarea
                [formControlName]="pregunta.id"
                label="Tu comentario"
                labelPlacement="stacked"
                fill="outline"
                [autoGrow]="true"
                [counter]="true"
                [maxlength]="500"
                placeholder="Contanos lo que quieras."
              />
            }
          }

          @if (error(); as mensaje) {
            <p class="encuesta__error" [id]="'error-' + pregunta.id" role="alert">{{ mensaje }}</p>
          }
        </fieldset>

        <div class="encuesta__acciones">
          @if (paso() > 0) {
            <ion-button fill="outline" class="anterior" type="button" (click)="volver()">
              Anterior
            </ion-button>
          }
          <ion-button class="siguiente" type="submit" [disabled]="enviando()">
            {{ esUltima() ? 'Enviar encuesta' : 'Siguiente' }}
          </ion-button>
        </div>
      </form>
    }
  `,
  styleUrl: './encuesta-form.component.scss',
})
export class EncuestaForm {
  readonly preguntas = input.required<readonly PreguntaDeEncuesta[]>();
  readonly enviando = input(false);
  readonly enviar = output<RespuestasDeEncuesta>();

  protected readonly paso = signal(0);
  protected readonly intento = signal(false);

  /** Un control por pregunta, con la misma validación que la base. */
  protected readonly formulario = computed(() => {
    const controles: Record<string, FormControl<ValorDeRespuesta>> = {};
    for (const pregunta of this.preguntas()) {
      controles[pregunta.id] = new FormControl<ValorDeRespuesta>(
        this.valorInicial(pregunta),
        (control: AbstractControl): ValidationErrors | null => {
          const error = errorDeRespuesta(pregunta, control.value as ValorDeRespuesta);
          return error ? { respuesta: error } : null;
        },
      );
    }
    return new FormGroup(controles);
  });

  protected readonly actual = computed(() => this.preguntas()[this.paso()]);
  protected readonly esUltima = computed(() => this.paso() === this.preguntas().length - 1);

  /** El error de la pregunta en pantalla, solo después de intentar avanzar. */
  protected readonly error = signal<string | null>(null);

  constructor() {
    addIcons({ star, starOutline });
    effect(() => {
      this.formulario();
      this.paso.set(0);
      this.error.set(null);
    });
  }

  protected control(pregunta: PreguntaDeEncuesta): FormControl<ValorDeRespuesta> {
    return this.formulario().controls[pregunta.id] as FormControl<ValorDeRespuesta>;
  }

  protected escala(pregunta: PreguntaDeEncuesta): number[] {
    const minimo = pregunta.minimo ?? 1;
    const maximo = pregunta.maximo ?? 5;
    return Array.from({ length: maximo - minimo + 1 }, (_, i) => minimo + i);
  }

  protected numero(valor: ValorDeRespuesta): number {
    return typeof valor === 'number' ? valor : 0;
  }

  protected elegir(pregunta: PreguntaDeEncuesta, valor: number): void {
    this.control(pregunta).setValue(valor);
    this.error.set(null);
  }

  protected marcada(pregunta: PreguntaDeEncuesta, opcion: string): boolean {
    const valor = this.control(pregunta).value;
    return Array.isArray(valor) && valor.includes(opcion);
  }

  protected alternar(pregunta: PreguntaDeEncuesta, opcion: string, marcada: boolean): void {
    const valor = this.control(pregunta).value;
    const actuales = Array.isArray(valor) ? valor : [];
    this.control(pregunta).setValue(
      marcada
        ? [...actuales.filter((o) => o !== opcion), opcion]
        : actuales.filter((o) => o !== opcion),
    );
    this.error.set(null);
  }

  protected volver(): void {
    this.error.set(null);
    this.paso.update((paso) => Math.max(0, paso - 1));
  }

  protected avanzar(): void {
    const pregunta = this.actual();
    if (!pregunta) return;
    const control = this.control(pregunta);
    control.markAsTouched();
    const error = (control.errors?.['respuesta'] as string | undefined) ?? null;
    this.error.set(error);
    if (error) return;
    if (!this.esUltima()) {
      this.paso.update((paso) => paso + 1);
      return;
    }
    this.enviar.emit(this.formulario().getRawValue() as RespuestasDeEncuesta);
  }

  /**
   * El interruptor arranca en «sí» y el rango en el medio: son controles
   * que siempre tienen un valor. Lo demás arranca vacío, para que una
   * pregunta obligatoria no quede respondida sin que la persona elija.
   */
  private valorInicial(pregunta: PreguntaDeEncuesta): ValorDeRespuesta {
    switch (pregunta.tipo) {
      case 'interruptor':
        return true;
      case 'rango': {
        const minimo = pregunta.minimo ?? 1;
        const maximo = pregunta.maximo ?? 10;
        return Math.round((minimo + maximo) / 2);
      }
      case 'checkbox':
        return [];
      case 'texto_largo':
        return '';
      default:
        return null;
    }
  }
}
