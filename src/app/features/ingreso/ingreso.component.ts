import { NgOptimizedImage } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonCard } from '@ionic/angular/ion-card';
import { IonCardContent } from '@ionic/angular/ion-card-content';
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
import { FondoDecorativo } from '../../shared/components/fondo-decorativo/fondo-decorativo.component';
import { LIMITES } from '../../core/validacion/limites';
import { mensajeDeError } from '../../core/validacion/mensajes';
import { conLimite, correoValido, sinEspaciosSolos } from '../../core/validacion/validadores';

@Component({
  imports: [
    IonButton,
    IonCard,
    IonCardContent,
    IonContent,
    IonIcon,
    IonInput,
    IonNote,
    Espera,
    FondoDecorativo,
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
  protected readonly modo = this.autenticacion.modo;

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
      await this.router.navigate(['/inicio']);
    } catch (error: unknown) {
      // R9: todo error pasa por ErroresService, que además vibra.
      this.errorMensaje.set(await this.errores.desdeExcepcion(error, 'No se pudo iniciar sesión.'));
    } finally {
      this.enviando.set(false);
    }
  }

  protected async ingresarRapido(acceso: AccesoRapido): Promise<void> {
    this.enviado.set(false);
    this.errorMensaje.set('');
    this.enviando.set(true);

    try {
      await this.autenticacion.ingresarRapido(acceso.id);
      await this.router.navigate(['/inicio']);
    } catch (error: unknown) {
      // R9: todo error pasa por ErroresService, que además vibra.
      this.errorMensaje.set(await this.errores.desdeExcepcion(error, 'No se pudo iniciar sesión.'));
    } finally {
      this.enviando.set(false);
    }
  }
}
