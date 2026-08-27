import { Injectable, inject } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { PerfilUsuario, Usuario } from '../models/usuario';
import { supabaseClient } from './supabase.client';
import { AutenticacionPort } from './autenticacion.port';
import { SesionService } from './sesion.service';

@Injectable({ providedIn: 'root' })
export class AutenticacionSupabaseService implements AutenticacionPort {
  private readonly sesion = inject(SesionService);

  readonly claveDemostracion = '';
  readonly usuariosDePrueba: readonly Usuario[] = [];

  async ingresar(correo: string, clave: string): Promise<{ readonly usuario: Usuario }> {
    if (!supabaseClient) {
      throw new Error('Supabase todavía no está configurado. Usá el acceso demo mientras tanto.');
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: correo.trim().toLowerCase(),
      password: clave,
    });

    if (error || !data.user) {
      throw new Error(error?.message ?? 'No se pudo iniciar sesión con Supabase.');
    }

    const usuario = this.convertirUsuario(data.user, correo);
    this.sesion.iniciar(usuario);
    return { usuario };
  }

  async ingresarRapido(_id: string): Promise<{ readonly usuario: Usuario }> {
    throw new Error('Los accesos rápidos pertenecen únicamente al modo demo.');
  }

  cerrarSesion(): void {
    if (supabaseClient) {
      void supabaseClient.auth.signOut();
    }
    this.sesion.cerrar();
  }

  private convertirUsuario(user: User, correo: string): Usuario {
    const metadata: Record<string, unknown> = user.user_metadata ?? {};
    const perfil = this.perfil(metadata['perfil']);
    const nombres = this.texto(metadata['nombres']) ?? correo.split('@')[0] ?? 'Usuario';
    const apellidos = this.texto(metadata['apellidos']) ?? '';

    return {
      id: user.id,
      nombres,
      apellidos,
      correo: user.email ?? correo,
      perfil,
      etiquetaPerfil: this.etiqueta(perfil),
    };
  }

  private perfil(valor: unknown): PerfilUsuario {
    const perfiles: readonly PerfilUsuario[] = [
      'dueno',
      'supervisor',
      'metre',
      'mozo',
      'cocinero',
      'cantinero',
      'cliente_registrado',
      'cliente_anonimo',
    ];
    return typeof valor === 'string' && perfiles.includes(valor as PerfilUsuario)
      ? (valor as PerfilUsuario)
      : 'cliente_registrado';
  }

  private etiqueta(perfil: PerfilUsuario): string {
    const etiquetas: Record<PerfilUsuario, string> = {
      dueno: 'Dueño',
      supervisor: 'Supervisor',
      metre: 'Maitre',
      mozo: 'Mozo',
      cocinero: 'Cocinero',
      cantinero: 'Cantinero',
      cliente_registrado: 'Cliente registrado',
      cliente_anonimo: 'Cliente anónimo',
    };
    return etiquetas[perfil];
  }

  private texto(valor: unknown): string | null {
    return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
  }
}
