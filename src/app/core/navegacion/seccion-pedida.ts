import { Injectable, signal } from '@angular/core';
import { Seccion } from './secciones';

/**
 * La sección que alguien pidió abrir desde afuera de la pantalla.
 *
 * ───────────────────────────────────────────────────────────────────
 * PARA QUÉ EXISTE
 *
 * Cuando se toca una notificación hay que llevar a la persona a donde
 * ocurrió lo que le avisaron: al pedido, a la lista de espera, a la
 * cuenta. Quien recibe ese toque es el servicio de notificaciones, que
 * vive en `core` y no tiene —ni debería tener— forma de manipular la
 * pantalla de operación.
 *
 * Esta señal es el único punto de contacto entre los dos: el servicio
 * deja acá el pedido y la pantalla lo atiende cuando puede.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ UNA SEÑAL Y NO UN PARÁMETRO DE LA URL
 *
 * Toda la aplicación vive en una sola ruta, `/operacion`, y la sección
 * es un estado interno de ese componente. Navegar a la misma ruta con
 * otro parámetro no lo vuelve a crear, así que habría que escuchar los
 * cambios igual. Con una señal el componente se entera con un `effect`
 * y no hay que ensuciar la URL con estado que no le pertenece.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ EL PEDIDO SE LIMPIA AL ATENDERLO
 *
 * Es una orden, no una preferencia: vale una sola vez. Si quedara
 * escrita, la próxima vez que la pantalla se construyera —al volver de
 * cerrar sesión, por ejemplo— saltaría sola a una sección que nadie
 * pidió en ese momento.
 */
@Injectable({ providedIn: 'root' })
export class SeccionPedida {
  private readonly pedida = signal<Seccion | null>(null);

  readonly valor = this.pedida.asReadonly();

  pedir(seccion: Seccion): void {
    this.pedida.set(seccion);
  }

  limpiar(): void {
    this.pedida.set(null);
  }
}
