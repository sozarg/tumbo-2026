import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, ReplaySubject, switchMap, take } from 'rxjs';

/**
 * Precarga todas las rutas, pero recién cuando la splash terminó.
 *
 * EL PROBLEMA CON `PreloadAllModules`
 * Esa estrategia arranca apenas termina de arrancar la aplicación, que
 * es exactamente cuando la splash está animándose. Bajar y COMPILAR los
 * pedazos diferidos —`operacion` solo pesa 464 kB— ocupa el hilo
 * principal en ráfagas, y cada ráfaga es un cuadro perdido en el peor
 * momento posible: el primero que ve el usuario.
 *
 * Medido con la CPU al 6×, cuatro corridas de cada uno:
 *   con PreloadAllModules   4, 1, 2 y 4 cuadros perdidos
 *   sin precarga            2, 2, 2 y 1
 *
 * LA SOLUCIÓN
 * No hay que elegir entre precargar y una splash fluida: alcanza con
 * correr una cosa después de la otra. Esta estrategia deja las rutas en
 * espera y `Splash` le da permiso al navegar. Para cuando el usuario
 * está leyendo la presentación o escribiendo su correo en el ingreso, el
 * hilo está libre y la precarga no le molesta a nadie.
 *
 * Vale la pena incluso dentro del APK, donde los pedazos son archivos
 * locales: lo caro no es bajarlos, es compilarlos.
 */
@Injectable({ providedIn: 'root' })
export class PrecargaDiferida implements PreloadingStrategy {
  /**
   * `ReplaySubject` y no `Subject`: el router pregunta por cada ruta al
   * inicializarse, pero si alguna se suscribiera después del permiso con
   * un `Subject` común se quedaría esperando para siempre.
   */
  private readonly permiso = new ReplaySubject<void>(1);

  /** La llama `Splash` cuando termina y se va a la presentación. */
  liberar(): void {
    this.permiso.next();
  }

  preload(_ruta: Route, cargar: () => Observable<unknown>): Observable<unknown> {
    // `take(1)` para que un segundo `liberar()` no vuelva a cargar todo.
    return this.permiso.pipe(
      take(1),
      switchMap(() => cargar()),
    );
  }
}
