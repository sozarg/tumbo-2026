import { Injectable, signal } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/** Qué tan fuerte vibra según la gravedad de lo que pasó. */
export type Severidad = 'leve' | 'grave';

/**
 * Punto único por donde pasan TODOS los errores de la aplicación
 * (requisito excluyente R9: vibración ante todos los errores, sin
 * excepción).
 *
 * Está centralizado a propósito. Si cada componente manejara sus
 * errores por su cuenta, alcanzaría con que uno se olvide de vibrar
 * para incumplir el requisito, y no habría manera de darse cuenta
 * mirando el código. Con esto, la regla se verifica de una sola forma:
 * ningún `catch` de la aplicación hace otra cosa que llamar acá.
 *
 * `console.error` como único manejo está prohibido por el enunciado.
 */
@Injectable({ providedIn: 'root' })
export class ErroresService {
  /** El último error, para que la pantalla lo muestre donde corresponda. */
  readonly ultimoError = signal('');

  /**
   * Registra un error: vibra y deja el mensaje disponible.
   *
   * Devuelve el mismo mensaje para poder escribir
   * `this.errorMensaje.set(await this.errores.mostrar(...))` sin repetir
   * el texto dos veces.
   */
  async mostrar(mensaje: string, severidad: Severidad = 'leve'): Promise<string> {
    this.ultimoError.set(mensaje);
    await this.vibrar(severidad);
    return mensaje;
  }

  /** Traduce cualquier excepción a un mensaje y la registra. */
  async desdeExcepcion(
    error: unknown,
    respaldo: string,
    severidad: Severidad = 'leve',
  ): Promise<string> {
    const mensaje = error instanceof Error && error.message ? error.message : respaldo;
    return this.mostrar(mensaje, severidad);
  }

  limpiar(): void {
    this.ultimoError.set('');
  }

  /**
   * En el navegador no existe el motor de vibración y el plugin tira
   * excepción. Se traga a propósito: un error de accesorio no puede
   * tapar el error real que se está informando.
   */
  private async vibrar(severidad: Severidad): Promise<void> {
    try {
      await Haptics.impact({
        style: severidad === 'grave' ? ImpactStyle.Heavy : ImpactStyle.Medium,
      });
    } catch {
      // Sin vibración disponible; el mensaje visual ya se mostró.
    }
  }
}
