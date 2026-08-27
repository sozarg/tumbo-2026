export type PerfilUsuario =
  | 'dueno'
  | 'supervisor'
  | 'metre'
  | 'mozo'
  | 'cocinero'
  | 'cantinero'
  | 'cliente_registrado'
  | 'cliente_anonimo';

export interface Usuario {
  readonly id: string;
  readonly nombres: string;
  readonly apellidos: string;
  readonly correo: string;
  readonly perfil: PerfilUsuario;
  readonly etiquetaPerfil: string;
}
