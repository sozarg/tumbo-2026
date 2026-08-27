import { Injectable, computed, signal } from '@angular/core';
import { Usuario } from '../models/usuario';

@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly usuarioActual = signal<Usuario | null>(null);

  readonly usuario = this.usuarioActual.asReadonly();
  readonly estaAutenticado = computed(() => this.usuarioActual() !== null);

  iniciar(usuario: Usuario): void {
    this.usuarioActual.set(usuario);
  }

  cerrar(): void {
    this.usuarioActual.set(null);
  }
}
