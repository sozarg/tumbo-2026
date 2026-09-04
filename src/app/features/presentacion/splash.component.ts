import { NgOptimizedImage } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PrecargaDiferida } from '../../core/rutas/precarga-diferida';
import { SonidosService } from '../../core/services/sonidos.service';

/**
 * Un cuadro a 60 Hz dura 16,7 ms. Le damos margen: cualquier cosa por
 * debajo de esto significa que el hilo principal está atendiendo el
 * dibujado y no una tarea de arranque.
 */
const CUADRO_HOLGADO = 24;

/** Dos cuadros seguidos en hora alcanzan para saber que se liberó. */
const CUADROS_SEGUIDOS = 2;

/**
 * Tope duro. Si el hilo nunca se libera —un celular muy lento— o si no
 * hay cuadros porque la pestaña está en segundo plano, arrancamos igual:
 * más vale una splash con un tirón que una que no arranca nunca.
 */
const ESPERA_MAXIMA = 600;

@Component({
  imports: [NgOptimizedImage],
  selector: 'tumbo-splash',
  styleUrl: './splash.component.scss',
  templateUrl: './splash.component.html',
})
export class Splash implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly sonidos = inject(SonidosService);
  private readonly precarga = inject(PrecargaDiferida);
  private temporizador?: ReturnType<typeof setTimeout>;
  private respaldo?: ReturnType<typeof setTimeout>;
  private cuadro?: number;
  private cuadrosBuenos = 0;
  private marca = 0;
  private transicionFinalizada = false;

  /**
   * Mientras esté en false el SCSS mantiene TODAS las animaciones
   * congeladas en su fotograma cero.
   */
  protected readonly lista = signal(false);

  /**
   * Acá hubo una precarga de las imágenes de la presentación y se sacó.
   *
   * La idea era aprovechar los 2,4 segundos de la splash para adelantar
   * la decodificación. Medido, no cambió nada: el tirón no venía de que
   * las imágenes llegaran tarde sino de su tamaño, que era el del
   * original de diseño. Eso se arregló con `srcset`
   * (`tools/generar-ilustraciones.mjs`). Peor todavía: la precarga
   * pedía los originales por su nombre, así que ahora bajaría los
   * archivos grandes que la presentación ya no usa.
   */
  ngOnInit(): void {
    this.esperarHiloLibre();
    this.respaldo = setTimeout(() => this.arrancar(), ESPERA_MAXIMA);
  }

  /**
   * Mide cuánto tarda cada cuadro hasta encontrar dos seguidos en hora.
   *
   * No alcanza con esperar un `requestAnimationFrame` o dos a ciegas: en
   * un celular lento el arranque de Angular sigue ocupando el hilo
   * varios cuadros después del primer dibujado, y la animación
   * empezaría igual de entrecortada. Lo que hace falta saber no es
   * "¿ya se pintó algo?" sino "¿el hilo ya está libre?", y eso se
   * responde midiendo.
   */
  private esperarHiloLibre(): void {
    this.marca = performance.now();

    const mirar = (ahora: number): void => {
      const duracion = ahora - this.marca;
      this.marca = ahora;
      this.cuadrosBuenos = duracion <= CUADRO_HOLGADO ? this.cuadrosBuenos + 1 : 0;

      if (this.cuadrosBuenos >= CUADROS_SEGUIDOS) {
        this.arrancar();
        return;
      }

      this.cuadro = requestAnimationFrame(mirar);
    };

    this.cuadro = requestAnimationFrame(mirar);
  }

  /**
   * Suelta las animaciones y recién ahí empieza a contar el reloj de la
   * navegación. Los 2,42 s son la duración de la splash: si arrancaran
   * en `ngOnInit` como antes, la espera del hilo se los comería y la
   * navegación caería en medio de la animación de salida.
   */
  private arrancar(): void {
    if (this.lista()) {
      return;
    }

    this.lista.set(true);
    this.cancelarEspera();
    this.temporizador = setTimeout(() => this.navegarAPresentacion(), 2_420);
  }

  private cancelarEspera(): void {
    if (this.cuadro !== undefined) {
      cancelAnimationFrame(this.cuadro);
      this.cuadro = undefined;
    }
    if (this.respaldo) {
      clearTimeout(this.respaldo);
      this.respaldo = undefined;
    }
  }

  ngOnDestroy(): void {
    this.cancelarEspera();
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
    // Recién ahora: el hilo queda libre y la precarga de las rutas
    // puede trabajar tranquila mientras el usuario lee la presentación.
    this.precarga.liberar();
    // R11: el sonido de apertura va acá y no en el arranque porque los
    // navegadores bloquean el audio hasta que hubo interacción.
    this.sonidos.sonarApertura();
    void this.router.navigate(['/presentacion'], { replaceUrl: true });
  }
}
