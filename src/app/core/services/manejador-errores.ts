import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErroresService } from './errores.service';

/**
 * Red de seguridad para R9.
 *
 * `ErroresService` cubre los errores que la aplicación espera y atrapa.
 * Esto cubre los que se escapan: una excepción no controlada en un
 * componente, una promesa rechazada sin `catch`. Sin esto, un error
 * inesperado no vibraría y el requisito quedaría incumplido justo en el
 * caso que nadie previó.
 *
 * Se registra en app.config.ts.
 */
@Injectable()
export class ManejadorErrores implements ErrorHandler {
  private readonly errores = inject(ErroresService);

  handleError(error: unknown): void {
    void this.errores.desdeExcepcion(
      error,
      'Ocurrió un error inesperado. Volvé a intentarlo.',
      'grave',
    );
  }
}
