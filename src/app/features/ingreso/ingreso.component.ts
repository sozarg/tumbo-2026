import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonInput } from '@ionic/angular/ion-input';
import { IonNote } from '@ionic/angular/ion-note';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline, logInOutline } from 'ionicons/icons';
import { AccesoRapido } from '../../core/models/usuario';
import { AUTENTICACION } from '../../core/services/autenticacion.port';
import { ErroresService } from '../../core/services/errores.service';
import { Espera } from '../../shared/components/espera/espera.component';
import { LIMITES } from '../../core/validacion/limites';
import { mensajeDeError } from '../../core/validacion/mensajes';
import { conLimite, correoValido, sinEspaciosSolos } from '../../core/validacion/validadores';

@Component({
  imports: [
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonNote,
    Espera,
    NgOptimizedImage,
    ReactiveFormsModule,
  ],
  selector: 'tumbo-ingreso',
  styleUrl: './ingreso.component.scss',
  templateUrl: './ingreso.component.html',
})
export class Ingreso {
  private readonly formularioBuilder = inject(FormBuilder);
  private readonly autenticacion = inject(AUTENTICACION);
  private readonly router = inject(Router);
  private readonly errores = inject(ErroresService);

  protected readonly formulario = this.formularioBuilder.nonNullable.group({
    correo: ['', [Validators.required, sinEspaciosSolos, correoValido, ...conLimite('correo')]],
    clave: ['', [Validators.required, sinEspaciosSolos, ...conLimite('clave')]],
  });
  /** Los mismos topes que la base, para el atributo maxlength de los inputs */
  protected readonly limites = LIMITES;
  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly mostrarClave = signal(false);
  protected readonly errorMensaje = signal('');
  /** Salen de la base cuando Supabase está activo (requisito excluyente R12). */
  protected readonly usuariosRapidos = this.autenticacion.accesosRapidos;
  protected readonly claveDemostracion = this.autenticacion.claveDemostracion;

  protected readonly indiceRapido = signal(0);
  protected readonly accesoActual = computed(
    () => this.usuariosRapidos()[this.indiceRapido() % (this.usuariosRapidos().length || 1)],
  );
  private inicioGesto = 0;

  protected moverAcceso(delta: number): void {
    const total = this.usuariosRapidos().length;
    if (total) this.indiceRapido.update((indice) => (indice + delta + total) % total);
  }

  protected iniciarGesto(evento: TouchEvent): void {
    this.inicioGesto = evento.changedTouches[0].clientX;
  }

  protected terminarGesto(evento: TouchEvent): void {
    const distancia = evento.changedTouches[0].clientX - this.inicioGesto;
    if (Math.abs(distancia) > 45) this.moverAcceso(distancia < 0 ? 1 : -1);
  }

  constructor() {
    addIcons({ eyeOffOutline, eyeOutline, logInOutline });
  }

  /**
   * Deja la pantalla en blanco cada vez que se entra (requisito
   * excluyente R13).
   *
   * POR QUÉ HACE FALTA
   * `ion-router-outlet` NO destruye la pantalla al navegar: la deja en
   * la pila para poder animar el gesto de "atrás". Así que al cerrar
   * sesión se vuelve a ESTA MISMA instancia, con el formulario tal como
   * quedó. El efecto era que la siguiente persona veía el correo del
   * anterior y, si había tocado el ojito, su clave en texto plano.
   *
   * Por eso el reinicio va en `ionViewWillEnter` y no en el constructor
   * ni en `ngOnInit`: esos corren una sola vez en la vida del
   * componente, y acá el problema es justamente que esa vida no termina.
   */
  ionViewWillEnter(): void {
    this.formulario.reset();
    this.mostrarClave.set(false);
    this.enviado.set(false);
    this.enviando.set(false);
    this.errorMensaje.set('');
    this.errores.limpiar();
  }

  protected campoInvalido(nombre: 'correo' | 'clave'): boolean {
    const control = this.formulario.controls[nombre];
    return control.invalid && (control.touched || this.enviado());
  }

  protected mensajeCampo(nombre: 'correo' | 'clave'): string {
    return mensajeDeError(this.formulario.controls[nombre], nombre);
  }

  protected alternarClave(): void {
    this.mostrarClave.update((visible) => !visible);
  }

  protected async ingresar(): Promise<void> {
    this.enviado.set(true);
    this.errorMensaje.set('');

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);

    try {
      await this.autenticacion.ingresar(
        this.formulario.controls.correo.value,
        this.formulario.controls.clave.value,
      );
      await this.router.navigate(['/operacion']);
    } catch (error: unknown) {
      // R9: todo error pasa por ErroresService, que además vibra.
      this.errorMensaje.set(await this.errores.desdeExcepcion(error, 'No se pudo iniciar sesión.'));
    } finally {
      this.enviando.set(false);
    }
  }

  protected ingresarRapido(acceso: AccesoRapido): void {
    this.enviado.set(false);
    this.errorMensaje.set('');
    this.errores.limpiar();

    // Rellena los campos del formulario con el correo del usuario seleccionado y la clave de demostración
    this.formulario.patchValue({
      correo: acceso.correo,
      clave: this.claveDemostracion,
    });

    // Marca el formulario como modificado para que los inputs detecten el valor precargado
    this.formulario.markAsDirty();
  }
}
