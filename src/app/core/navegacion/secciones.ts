import { PerfilUsuario } from '../models/usuario';

export type Seccion =
  | 'personal'
  | 'productos'
  | 'mesas'
  | 'clientes'
  | 'espera'
  | 'cocina'
  | 'barra'
  | 'pedidos'
  | 'entrada'
  | 'menu'
  | 'juegos'
  | 'encuesta'
  | 'reportes'
  | 'consulta'
  | 'cuenta';
export interface AccesoSeccion {
  readonly id: Seccion;
  readonly titulo: string;
  readonly icono: string;
  readonly perfiles: readonly PerfilUsuario[];
}
const gerencia: readonly PerfilUsuario[] = ['supervisor'];
const clientes: readonly PerfilUsuario[] = ['cliente_registrado', 'cliente_anonimo'];
export const SECCIONES: readonly AccesoSeccion[] = [
  { id: 'personal', titulo: 'Personal', icono: 'people-outline', perfiles: gerencia },
  { id: 'productos', titulo: 'Productos', icono: 'cube-outline', perfiles: gerencia },
  { id: 'mesas', titulo: 'Mesas', icono: 'qr-code-outline', perfiles: gerencia },
  { id: 'clientes', titulo: 'Clientes', icono: 'happy-outline', perfiles: gerencia },
  { id: 'espera', titulo: 'Espera', icono: 'time-outline', perfiles: [...gerencia, 'metre'] },
  { id: 'cocina', titulo: 'Cocina', icono: 'restaurant-outline', perfiles: ['cocinero'] },
  { id: 'barra', titulo: 'Barra', icono: 'wine-outline', perfiles: ['cantinero'] },
  {
    id: 'pedidos',
    titulo: 'Pedidos',
    icono: 'receipt-outline',
    perfiles: [...gerencia, 'mozo', 'metre', ...clientes],
  },
  { id: 'entrada', titulo: 'Entrada', icono: 'qr-code-outline', perfiles: clientes },
  { id: 'menu', titulo: 'Menú', icono: 'restaurant-outline', perfiles: clientes },
  {
    id: 'juegos',
    titulo: 'Juegos',
    icono: 'game-controller-outline',
    perfiles: ['cliente_registrado'],
  },
  { id: 'encuesta', titulo: 'Encuesta', icono: 'document-text-outline', perfiles: clientes },
  { id: 'reportes', titulo: 'Reportes', icono: 'bar-chart-outline', perfiles: gerencia },
  {
    id: 'consulta',
    titulo: 'Consultas',
    icono: 'chatbubbles-outline',
    perfiles: ['mozo', ...clientes],
  },
  {
    id: 'cuenta',
    titulo: 'Cuenta',
    icono: 'wallet-outline',
    perfiles: [...gerencia, 'mozo', ...clientes],
  },
];
export function puedeAcceder(perfil: PerfilUsuario | undefined, seccion: Seccion): boolean {
  return (
    perfil !== undefined &&
    (perfil === 'dueno' ||
      SECCIONES.some((acceso) => acceso.id === seccion && acceso.perfiles.includes(perfil)))
  );
}
