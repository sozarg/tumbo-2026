import { Enums } from './base-de-datos';

/**
 * El perfil sale del enum de la base, no de una lista escrita a mano.
 * Si alguien agrega un perfil en una migración y regenera los tipos,
 * TypeScript marca acá todo lo que quedó incompleto.
 */
export type PerfilUsuario = Enums<'perfil_usuario'>;

/** Estado de aprobación del registro (puntos 5, 7 y 8). */
export type EstadoRegistro = Enums<'estado_registro'>;

export interface Usuario {
  readonly id: string;
  readonly nombres: string;
  readonly apellidos: string;
  readonly correo: string;
  readonly perfil: PerfilUsuario;
  readonly etiquetaPerfil: string;
  readonly estado: EstadoRegistro;
  readonly fotoUrl: string | null;
}

/**
 * Un usuario que la pantalla de ingreso puede ofrecer como acceso
 * rápido. Trae menos datos que Usuario a propósito: es lo único que la
 * función accesos_rapidos() expone a alguien todavía sin sesión.
 */
export interface AccesoRapido {
  readonly id: string;
  readonly nombres: string;
  readonly apellidos: string;
  readonly correo: string;
  readonly perfil: PerfilUsuario;
  readonly etiquetaPerfil: string;
  readonly fotoUrl: string | null;
}

const ETIQUETAS_PERFIL: Record<PerfilUsuario, string> = {
  dueno: 'Dueño',
  supervisor: 'Supervisor',
  metre: 'Maitre',
  mozo: 'Mozo',
  cocinero: 'Cocinero',
  cantinero: 'Cantinero',
  cliente_registrado: 'Cliente registrado',
  cliente_anonimo: 'Cliente anónimo',
};

/** Nombre del perfil tal como se le muestra a la persona, en español. */
export function etiquetaDePerfil(perfil: PerfilUsuario): string {
  return ETIQUETAS_PERFIL[perfil];
}

/** Los seis perfiles que trabajan en el comercio. */
export function esPersonal(perfil: PerfilUsuario): boolean {
  return perfil !== 'cliente_registrado' && perfil !== 'cliente_anonimo';
}

/** Dueño y supervisor: los únicos que aprueban clientes y gestionan mesas. */
export function esGerencia(perfil: PerfilUsuario): boolean {
  return perfil === 'dueno' || perfil === 'supervisor';
}
