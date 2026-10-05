import { Injectable, computed, signal } from '@angular/core';

/**
 * La espera que tapa la pantalla entera.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ NO ALCANZABA EL INDICADOR ADENTRO DEL BOTÓN
 *
 * `tumbo-espera` ya existía y ya lleva el logo, pero se usaba en línea:
 * adentro del botón que se tocó, o de la tarjeta que se está borrando.
 * En la preentrega el profesor marcó que el indicador tiene que ser
 * independiente de los controles y ocupar la pantalla.
 *
 * Tiene razón más allá del pedido: un indicador metido en el botón
 * avisa de que ESE botón está ocupado, pero no de que la pantalla no
 * acepta nada más. Quien no lo mira toca otra cosa, y en una pantalla
 * donde se está guardando algo eso es justamente lo que no queremos.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ UN CONTADOR Y NO UN BOOLEANO
 *
 * Dos esperas se pueden pisar: alguien aprueba un cliente mientras la
 * pantalla todavía está recargando el listado. Con un booleano, la
 * primera que termina apaga el indicador y la segunda sigue corriendo
 * sin que nadie lo sepa. Con un contador, se apaga recién cuando no
 * queda ninguna.
 */
@Injectable({ providedIn: 'root' })
export class EsperaGlobal {
  private readonly enCurso = signal<readonly string[]>([]);

  /** Si hay que tapar la pantalla. */
  readonly esperando = computed(() => this.enCurso().length > 0);

  /**
   * Lo que se muestra debajo del logo.
   *
   * Si hay varias esperas a la vez gana la última: es la que la persona
   * acaba de provocar y por lo tanto la que está esperando ver.
   */
  readonly etiqueta = computed(() => this.enCurso().at(-1) ?? 'Cargando');

  /**
   * Tapa la pantalla mientras corre `tarea`.
   *
   * Devuelve lo mismo que la tarea y deja pasar los errores tal cual:
   * quien llama sigue manejando el resultado como si esto no existiera.
   * El `finally` es lo que garantiza que la pantalla se destape aunque
   * la tarea falle; sin eso, un error de red dejaría la aplicación
   * tapada para siempre.
   */
  async durante<T>(etiqueta: string, tarea: () => Promise<T>): Promise<T> {
    this.enCurso.update((esperas) => [...esperas, etiqueta]);
    try {
      return await tarea();
    } finally {
      this.enCurso.update((esperas) => {
        const posicion = esperas.lastIndexOf(etiqueta);
        return posicion < 0
          ? esperas
          : [...esperas.slice(0, posicion), ...esperas.slice(posicion + 1)];
      });
    }
  }
}
