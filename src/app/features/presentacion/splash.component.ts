import { NgOptimizedImage } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SonidosService } from '../../core/services/sonidos.service';

@Component({
  imports: [NgOptimizedImage],
  selector: 'tumbo-splash',
  styleUrl: './splash.component.scss',
  templateUrl: './splash.component.html',
})
export class Splash implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly sonidos = inject(SonidosService);
  private temporizador?: ReturnType<typeof setTimeout>;
  private transicionFinalizada = false;

  ngOnInit(): void {
    // Respaldo para WebView/navegadores que no emiten animationend al
    // desmontar una vista durante la transición de salida.
    this.temporizador = setTimeout(() => this.navegarAPresentacion(), 2_420);
  }

  ngOnDestroy(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
    }
  }

  finalizarTransicion(event: AnimationEvent): void {
    if (!event.animationName.includes('splash-exit')) {
      return;
    }

    this.navegarAPresentacion();
  }

  private navegarAPresentacion(): void {
    if (this.transicionFinalizada) {
      return;
    }

    this.transicionFinalizada = true;
    // R11: el sonido de apertura va acá y no en el arranque porque los
    // navegadores bloquean el audio hasta que hubo interacción.
    this.sonidos.sonarApertura();
    void this.router.navigate(['/presentacion'], { replaceUrl: true });
  }
}
