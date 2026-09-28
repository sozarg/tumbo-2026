import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AUTENTICACION } from '../services/autenticacion.port';
import { SesionService } from '../services/sesion.service';

/**
 * Protege las rutas que exigen sesión iniciada.
 *
 * Espera a `listo` antes de decidir. Ese await es el punto importante:
 * al recargar la aplicación, Supabase tarda unos milisegundos en
 * devolver la sesión guardada, y sin la espera la guardia vería un
 * usuario nulo y mandaría al ingreso a alguien que en realidad tenía la
 * sesión abierta.
 */
export const sesionGuard: CanActivateFn = async (route) => {
  const autenticacion = inject(AUTENTICACION);
  const sesion = inject(SesionService);
  const router = inject(Router);

  await autenticacion.listo;

  // La entrada anónima crea la sesión después de completar el formulario.
  if (route.queryParamMap.get('entrada') === '1') return true;

  if (sesion.estaAutenticado()) {
    return true;
  }

  return router.createUrlTree(['/ingreso']);
};
