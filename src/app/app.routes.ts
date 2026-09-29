import { Routes } from '@angular/router';
import { sesionGuard } from './core/guards/sesion.guard';

export const routes: Routes = [
  {
    path: 'splash',
    loadComponent: () => import('./features/splash/splash.component').then(({ Splash }) => Splash),
  },
  {
    path: 'ingreso',
    loadComponent: () =>
      import('./features/ingreso/ingreso.component').then(({ Ingreso }) => Ingreso),
  },
  {
    /*
     * El registro del cliente (punto 5) vive AFUERA de la sesión.
     *
     * No lleva `sesionGuard` a propósito: el enunciado lo ubica en el
     * dispositivo 2 —el teléfono del cliente—, que por definición no
     * tiene a nadie logueado. Es lo que hace posible usar `signUp` sin
     * robarle la sesión a un empleado. Ver `RegistroClienteService`.
     */
    path: 'registro',
    loadComponent: () =>
      import('./features/registro/registro.component').then(({ Registro }) => Registro),
  },
  {
    path: 'operacion',
    canActivate: [sesionGuard],
    loadComponent: () =>
      import('./features/operacion/operacion.component').then(({ Operacion }) => Operacion),
  },
  { path: '', pathMatch: 'full', redirectTo: 'splash' },
  { path: '**', redirectTo: 'splash' },
];
