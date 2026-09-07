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
    path: 'operacion',
    canActivate: [sesionGuard],
    loadComponent: () =>
      import('./features/operacion/operacion.component').then(({ Operacion }) => Operacion),
  },
  { path: '', pathMatch: 'full', redirectTo: 'splash' },
  { path: '**', redirectTo: 'splash' },
];
