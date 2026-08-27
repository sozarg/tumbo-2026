import { Injectable, inject } from '@angular/core';
import { PerfilUsuario, Usuario } from '../models/usuario';
import { SesionService } from './sesion.service';

export interface ResultadoAutenticacion {
  readonly usuario: Usuario;
}

@Injectable({ providedIn: 'root' })
export class AutenticacionMockService {
  private readonly sesion = inject(SesionService);

  // Credencial provisional para la demostración. Se reemplaza por Supabase Auth.
  readonly claveDemostracion = 'Tumbo2026';

  readonly usuariosDePrueba: readonly Usuario[] = [
    this.usuario('mateo', 'Mateo', 'Terrile', 'dueno', 'Dueño'),
    this.usuario('ramiro', 'Ramiro', 'Bianucci', 'supervisor', 'Supervisor'),
    this.usuario('ignacio', 'Ignacio Agustín', 'Cruz', 'metre', 'Maitre'),
    this.usuario('matias', 'Matías Gabriel', 'Ferrari', 'mozo', 'Mozo'),
    this.usuario('alicia', 'Alicia', 'Gómez', 'cocinero', 'Cocinero'),
    this.usuario('bruno', 'Bruno', 'Sosa', 'cantinero', 'Cantinero'),
    this.usuario('camila', 'Camila', 'Pérez', 'cliente_registrado', 'Cliente registrado'),
    this.usuario('anonimo', 'Cliente', 'Anónimo', 'cliente_anonimo', 'Cliente anónimo'),
  ];

  async ingresar(correo: string, clave: string): Promise<ResultadoAutenticacion> {
    await this.esperar();
    const correoNormalizado = correo.trim().toLowerCase();
    const usuario = this.usuariosDePrueba.find((candidato) => candidato.correo === correoNormalizado);

    if (!usuario || clave !== this.claveDemostracion) {
      throw new Error('El correo o la clave no coinciden con una cuenta de demostración.');
    }

    this.sesion.iniciar(usuario);
    return { usuario };
  }

  async ingresarRapido(id: string): Promise<ResultadoAutenticacion> {
    await this.esperar();
    const usuario = this.usuariosDePrueba.find((candidato) => candidato.id === id);

    if (!usuario) {
      throw new Error('No se encontró el usuario seleccionado.');
    }

    this.sesion.iniciar(usuario);
    return { usuario };
  }

  cerrarSesion(): void {
    this.sesion.cerrar();
  }

  private usuario(
    id: string,
    nombres: string,
    apellidos: string,
    perfil: PerfilUsuario,
    etiquetaPerfil: string,
  ): Usuario {
    return {
      id,
      nombres,
      apellidos,
      correo: id + '@tumbo.demo',
      perfil,
      etiquetaPerfil,
    };
  }

  private esperar(): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, 350));
  }
}
