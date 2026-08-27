import { InjectionToken } from '@angular/core';
import { Usuario } from '../models/usuario';

export interface AutenticacionPort {
  readonly claveDemostracion: string;
  readonly usuariosDePrueba: readonly Usuario[];
  ingresar(correo: string, clave: string): Promise<{ readonly usuario: Usuario }>;
  ingresarRapido(id: string): Promise<{ readonly usuario: Usuario }>;
  cerrarSesion(): void;
}

export const AUTENTICACION = new InjectionToken<AutenticacionPort>('AUTENTICACION');
