import { Injectable, inject, signal } from '@angular/core';
import { AccesoRapido, PerfilUsuario, Usuario, etiquetaDePerfil } from '../models/usuario';
import { AutenticacionPort, ModoAutenticacion, ResultadoAutenticacion } from './autenticacion.port';
import { SesionService } from './sesion.service';

/**
 * Implementación de reemplazo mientras el proyecto de Supabase no esté
 * configurado en esta copia del repositorio.
 *
 * Cumple exactamente el mismo contrato que la implementación real, así
 * las pantallas no tienen manera de distinguirlas. Es temporal: cuando
 * environment.local.ts tenga la URL y la clave, app.config.ts elige
 * sola la implementación de Supabase y esta clase deja de usarse.
 */
@Injectable({ providedIn: 'root' })
export class AutenticacionMockService implements AutenticacionPort {
  private readonly sesion = inject(SesionService);

  readonly modo: ModoAutenticacion = 'demo';
  readonly claveDemostracion = 'Tumbito2026';
  readonly listo = Promise.resolve();

  private readonly accesos = signal<readonly AccesoRapido[]>([
    this.acceso('mateo', 'Mateo', 'Terrile', 'dueno'),
    this.acceso('ramiro', 'Ramiro', 'Bianucci', 'supervisor'),
    this.acceso('ignacio', 'Ignacio Agustín', 'Cruz', 'metre'),
    this.acceso('matias', 'Matías Gabriel', 'Ferrari', 'mozo'),
    this.acceso('alicia', 'Alicia', 'Gómez', 'cocinero'),
    this.acceso('bruno', 'Bruno', 'Sosa', 'cantinero'),
    this.acceso('camila', 'Camila', 'Pérez', 'cliente_registrado'),
    this.acceso('anonimo', 'Cliente', 'Anónimo', 'cliente_anonimo'),
  ]);

  readonly accesosRapidos = this.accesos.asReadonly();

  async ingresar(correo: string, clave: string): Promise<ResultadoAutenticacion> {
    await this.esperar();
    const correoNormalizado = correo.trim().toLowerCase();
    const acceso = this.accesos().find((candidato) => candidato.correo === correoNormalizado);

    if (!acceso || clave !== this.claveDemostracion) {
      throw new Error('El correo o la clave no coinciden con una cuenta de demostración.');
    }

    return this.iniciar(acceso);
  }

  async ingresarRapido(id: string): Promise<ResultadoAutenticacion> {
    await this.esperar();
    const acceso = this.accesos().find((candidato) => candidato.id === id);

    if (!acceso) {
      throw new Error('No se encontró el usuario seleccionado.');
    }

    return this.iniciar(acceso);
  }

  async cerrarSesion(): Promise<void> {
    this.sesion.cerrar();
  }

  private iniciar(acceso: AccesoRapido): ResultadoAutenticacion {
    const usuario: Usuario = {
      id: acceso.id,
      nombres: acceso.nombres,
      apellidos: acceso.apellidos,
      correo: acceso.correo,
      perfil: acceso.perfil,
      etiquetaPerfil: acceso.etiquetaPerfil,
      estado: 'aprobado',
      fotoUrl: acceso.fotoUrl,
    };

    this.sesion.iniciar(usuario);
    return { usuario };
  }

  private acceso(
    id: string,
    nombres: string,
    apellidos: string,
    perfil: PerfilUsuario,
  ): AccesoRapido {
    return {
      id,
      nombres,
      apellidos,
      correo: `${id}@tumbo.demo`,
      perfil,
      etiquetaPerfil: etiquetaDePerfil(perfil),
      fotoUrl: null,
    };
  }

  /** Simula la latencia de red para que la pantalla muestre su espera. */
  private esperar(): Promise<void> {
    return new Promise((resolver) => window.setTimeout(resolver, 350));
  }
}
