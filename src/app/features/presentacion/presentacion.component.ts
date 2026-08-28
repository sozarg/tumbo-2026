import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonContent } from '@ionic/angular/ion-content';
import { SesionService } from '../../core/services/sesion.service';
import { FondoDecorativo } from '../../shared/components/fondo-decorativo/fondo-decorativo.component';

@Component({
  imports: [FondoDecorativo, IonButton, IonContent, NgOptimizedImage],
  selector: 'tumbo-presentacion',
  styleUrl: './presentacion.component.scss',
  templateUrl: './presentacion.component.html',
})
export class Presentacion {
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);

  continuar(): void {
    void this.router.navigate([this.sesion.estaAutenticado() ? '/inicio' : '/ingreso']);
  }
}
