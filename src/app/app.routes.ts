import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'presentacion',
    loadComponent: () =>
      import('./features/presentacion/presentacion.component').then(
        ({ Presentacion }) => Presentacion,
      ),
  },
  {
    path: 'ingreso',
    loadComponent: () =>
      import('./features/ingreso/ingreso.component').then(({ Ingreso }) => Ingreso),
  },
  {
    path: 'inicio',
    loadComponent: () =>
      import('./features/inicio/inicio.component').then(({ Inicio }) => Inicio),
  },
  {
    path: 'operacion',
    loadComponent: () =>
      import('./features/operacion/operacion.component').then(({ Operacion }) => Operacion),
  },
  { path: '', pathMatch: 'full', redirectTo: 'presentacion' },
  { path: '**', redirectTo: 'presentacion' },
];
