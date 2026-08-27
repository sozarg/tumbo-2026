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
import { IonCardHeader } from '@ionic/angular/ion-card-header';
import { IonCardSubtitle } from '@ionic/angular/ion-card-subtitle';
import { IonCardTitle } from '@ionic/angular/ion-card-title';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonInput } from '@ionic/angular/ion-input';
import { IonNote } from '@ionic/angular/ion-note';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  eyeOffOutline,
  eyeOutline,
  logInOutline,
} from 'ionicons/icons';
import { Usuario } from '../../core/models/usuario';
import { AUTENTICACION } from '../../core/services/autenticacion.port';

@Component({
  imports: [
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent,
    IonIcon,
    IonInput,
    IonNote,
    IonSpinner,
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
    correo: ['', [Validators.required, Validators.email]],
    clave: ['', [Validators.required, Validators.minLength(6)]],
  });
  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly mostrarClave = signal(false);
  protected readonly errorMensaje = signal('');
  protected readonly usuariosRapidos = this.autenticacion.usuariosDePrueba;
  protected readonly claveDemostracion = this.autenticacion.claveDemostracion;

  constructor() {
    addIcons({ arrowForwardOutline, eyeOffOutline, eyeOutline, logInOutline });
  }

  protected campoInvalido(nombre: 'correo' | 'clave'): boolean {
    const control = this.formulario.controls[nombre];
    return control.invalid && (control.touched || this.enviado());
  }

  protected mensajeCampo(nombre: 'correo' | 'clave'): string {
    const control = this.formulario.controls[nombre];

    if (control.hasError('required')) {
      return nombre === 'correo' ? 'Ingresá tu correo.' : 'Ingresá tu clave.';
    }

    if (control.hasError('email')) {
      return 'Ingresá un correo válido, por ejemplo: nombre@dominio.com.';
    }

    return 'La clave debe tener al menos 6 caracteres.';
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

  protected async ingresarRapido(usuario: Usuario): Promise<void> {
    this.enviado.set(false);
    this.errorMensaje.set('');
    this.enviando.set(true);

    try {
      await this.autenticacion.ingresarRapido(usuario.id);
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
