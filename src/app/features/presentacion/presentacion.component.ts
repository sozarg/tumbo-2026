import { NgOptimizedImage } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonContent } from '@ionic/angular/ion-content';
import { SesionService } from '../../core/services/sesion.service';

@Component({
  imports: [IonButton, IonContent, NgOptimizedImage],
  selector: 'tumbo-presentacion',
  styleUrl: './presentacion.component.scss',
  templateUrl: './presentacion.component.html',
})
export class Presentacion implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  private temporizador?: number;

  protected readonly mostrarContinuar = signal(false);
  protected readonly integrantes = [
    'Mateo Terrile',
    'Ramiro Bianucci',
    'Ignacio Agustín Cruz',
    'Matías Gabriel Ferrari',
  ] as const;

  ngOnInit(): void {
    this.temporizador = window.setTimeout(() => {
      this.mostrarContinuar.set(true);
    }, 1800);
  }

  ngOnDestroy(): void {
    if (this.temporizador !== undefined) {
      window.clearTimeout(this.temporizador);
    }
  }

  continuar(): void {
    void this.router.navigate([this.sesion.estaAutenticado() ? '/inicio' : '/ingreso']);
  }
}
