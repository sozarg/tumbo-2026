import { NgOptimizedImage } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonCard } from '@ionic/angular/ion-card';
import { IonCardContent } from '@ionic/angular/ion-card-content';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonInput } from '@ionic/angular/ion-input';
import { IonNote } from '@ionic/angular/ion-note';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { addIcons } from 'ionicons';
import {
  eyeOffOutline,
  eyeOutline,
  logInOutline,
} from 'ionicons/icons';
import { AccesoRapido } from '../../core/models/usuario';
import { AUTENTICACION } from '../../core/services/autenticacion.port';
import { FondoDecorativo } from '../../shared/components/fondo-decorativo/fondo-decorativo.component';
import { LIMITES } from '../../core/validacion/limites';
import { mensajeDeError } from '../../core/validacion/mensajes';
import { conLimite, sinEspaciosSolos } from '../../core/validacion/validadores';

@Component({
  imports: [
    IonButton,
    IonCard,
    IonCardContent,
    IonContent,
    IonIcon,
    IonInput,
    IonNote,
    IonSpinner,
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

  protected readonly formulario = this.formularioBuilder.nonNullable.group({
    correo: [
      '',
      [Validators.required, sinEspaciosSolos, Validators.email, ...conLimite('correo')],
    ],
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
      this.errorMensaje.set(
        error instanceof Error ? error.message : 'No se pudo iniciar sesión.',
      );
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
      this.errorMensaje.set(
        error instanceof Error ? error.message : 'No se pudo iniciar sesión.',
      );
    } finally {
      this.enviando.set(false);
    }
  }
}
