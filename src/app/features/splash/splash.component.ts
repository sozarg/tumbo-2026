import { NgOptimizedImage } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonContent } from '@ionic/angular/ion-content';
import { PrecargaDiferida } from '../../core/rutas/precarga-diferida';
import { SesionService } from '../../core/services/sesion.service';
import { SonidosService } from '../../core/services/sonidos.service';

const DURACION = 3_000;
const DURACION_REDUCIDA = 600;
const ESPERA_IMAGEN = 1_500;

@Component({
  imports: [NgOptimizedImage, IonContent, IonButton],
  selector: 'tumbo-splash',
  styleUrl: './splash.component.scss',
  templateUrl: './splash.component.html',
})
export class Splash implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  private readonly sonidos = inject(SonidosService);
  private readonly precarga = inject(PrecargaDiferida);
  private temporizador?: ReturnType<typeof setTimeout>;
  private respaldo?: ReturnType<typeof setTimeout>;
  private cuadro?: number;
  private destruida = false;
  private navegando = false;

  protected readonly lista = signal(false);
  protected readonly sinImagen = signal(false);
  protected readonly error = signal(false);

  ngOnInit(): void {
    // Una imagen que no responde nunca debe impedir entrar a la aplicación.
    this.respaldo = setTimeout(() => this.arrancar(), ESPERA_IMAGEN);
  }

  protected async imagenCargada(event: Event): Promise<void> {
    // decode() espera los píxeles antes de animar, sin modificar el DOM.
    const imagen = event.target;
    if (imagen instanceof HTMLImageElement) {
      try {
        await imagen.decode();
      } catch {
        // El evento load ya confirmó la descarga; usamos el recurso disponible.
      }
    }
    this.arrancar();
  }

  protected imagenFallida(): void {
    this.sinImagen.set(true);
    this.arrancar();
  }

  private arrancar(): void {
    if (this.lista() || this.destruida || this.cuadro !== undefined) return;
    clearTimeout(this.respaldo);
    // Permite pintar el estado inicial antes de iniciar la secuencia.
    this.cuadro = requestAnimationFrame(() => {
      this.cuadro = undefined;
      if (this.destruida) return;
      this.lista.set(true);
      const reducida = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.temporizador = setTimeout(
        () => void this.continuar(),
        reducida ? DURACION_REDUCIDA : DURACION,
      );
    });
  }

  protected async continuar(): Promise<void> {
    if (this.navegando || this.destruida) return;
    this.navegando = true;
    this.error.set(false);
    try {
      const destino = this.sesion.estaAutenticado() ? '/operacion' : '/ingreso';
      const completo = await this.router.navigate([destino], { replaceUrl: true });
      if (completo) {
        this.precarga.liberar();
        this.sonidos.sonarApertura();
      } else {
        this.error.set(true);
      }
    } catch {
      this.error.set(true);
    } finally {
      this.navegando = false;
    }
  }

  ngOnDestroy(): void {
    this.destruida = true;
    clearTimeout(this.temporizador);
    clearTimeout(this.respaldo);
    if (this.cuadro !== undefined) cancelAnimationFrame(this.cuadro);
  }
}
