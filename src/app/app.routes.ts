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
    path: 'juego-recoleccion',
    loadComponent: () =>
      import('./features/juegos/juego-recoleccion/juego-recoleccion.component').then(({ JuegoRecoleccionComponent }) => JuegoRecoleccionComponent),
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
