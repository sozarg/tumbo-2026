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
  /**
   * Perfiles que PUEDEN entrar pero no ven la sección en el menú.
   *
   * No es lo mismo que sacarla de `perfiles`: la sección se sigue
   * pudiendo abrir desde donde tenga sentido abrirla. El caso es
   * `reportes` para el cliente (punto 20, corrección del profesor): el
   * botón suelto en el menú se va, pero a los resultados se llega desde
   * la encuesta respondida, desde el QR de ingreso (punto 9) y desde el
   * cierre de la cuenta (punto 22).
   */
  readonly fueraDelMenu?: readonly PerfilUsuario[];
}
const gerencia: readonly PerfilUsuario[] = ['supervisor'];
const clientes: readonly PerfilUsuario[] = ['cliente_registrado', 'cliente_anonimo'];
export const SECCIONES: readonly AccesoSeccion[] = [
  { id: 'personal', titulo: 'Personal', icono: 'people-outline', perfiles: gerencia },
  {
    id: 'productos',
    titulo: 'Productos',
    icono: 'cube-outline',
    perfiles: [...gerencia, 'cocinero', 'cantinero'],
  },
  {
    id: 'mesas',
    titulo: 'Mesas',
    icono: 'qr-code-outline',
    perfiles: [...gerencia, 'metre', 'mozo'],
  },
  { id: 'clientes', titulo: 'Clientes', icono: 'happy-outline', perfiles: [...gerencia, 'metre'] },
  { id: 'espera', titulo: 'Espera', icono: 'time-outline', perfiles: [...gerencia, 'metre'] },
  { id: 'cocina', titulo: 'Cocina', icono: 'restaurant-outline', perfiles: ['cocinero'] },
  { id: 'barra', titulo: 'Barra', icono: 'wine-outline', perfiles: ['cantinero'] },
  {
    id: 'pedidos',
    titulo: 'Pedidos',
    icono: 'receipt-outline',
    perfiles: [...gerencia, 'mozo', ...clientes],
  },
  { id: 'entrada', titulo: 'Entrada', icono: 'qr-code-outline', perfiles: clientes },
  { id: 'menu', titulo: 'Menú', icono: 'restaurant-outline', perfiles: clientes },
  /*
   * El anónimo también juega: puede entrar a los juegos aunque su
   * partida no otorgue descuento (eso lo sigue decidiendo la base, que
   * solo se lo da al registrado con el pedido confirmado).
   */
  {
    id: 'juegos',
    titulo: 'Juegos',
    icono: 'game-controller-outline',
    perfiles: clientes,
  },
  {
    id: 'encuesta',
    titulo: 'Encuesta',
    icono: 'document-text-outline',
    perfiles: ['cliente_registrado'],
  },
  {
    id: 'reportes',
    titulo: 'Reportes',
    icono: 'bar-chart-outline',
    perfiles: [...gerencia, ...clientes],
    fueraDelMenu: clientes,
  },
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
/**
 * Si un texto cualquiera nombra una sección.
 *
 * Existe porque el nombre de la sección llega desde afuera: viaja en el
 * dato de una notificación, que la aplicación no escribió y no controla.
 * Comprobarlo contra `SECCIONES` evita que un valor inventado termine
 * convertido a `Seccion` de prepo.
 */
export function esSeccion(valor: unknown): valor is Seccion {
  return typeof valor === 'string' && SECCIONES.some((acceso) => acceso.id === valor);
}

export function esGerencia(perfil: PerfilUsuario | undefined): boolean {
  return perfil === 'dueno' || perfil === 'supervisor';
}

export function tipoProductoDelPerfil(
  perfil: PerfilUsuario | undefined,
): 'plato' | 'bebida' | undefined {
  return perfil === 'cocinero' ? 'plato' : perfil === 'cantinero' ? 'bebida' : undefined;
}

export function accesosDelPerfil(perfil: PerfilUsuario | undefined): readonly AccesoSeccion[] {
  const principal: Seccion =
    perfil === 'cocinero'
      ? 'cocina'
      : perfil === 'cantinero'
        ? 'barra'
        : perfil === 'metre'
          ? 'espera'
          : perfil === 'cliente_registrado' || perfil === 'cliente_anonimo'
            ? 'entrada'
            : 'pedidos';
  return SECCIONES.filter((acceso) => puedeAcceder(perfil, acceso.id))
    .map((acceso) => ({ ...acceso, titulo: tituloPara(acceso, perfil) }))
    .sort((a, b) => Number(b.id === principal) - Number(a.id === principal));
}

/**
 * Cómo se llama la sección para este perfil.
 *
 * Dos secciones cambian de nombre según quién mire: `productos` es
 * «Platos» o «Bebidas» según el sector, y `reportes` es «Encuestas
 * anteriores» para el cliente. Esto último lo pidió el profesor en el
 * punto 20: al cliente no le dice nada la palabra «Reportes», que es
 * vocabulario de gerencia.
 */
function tituloPara(acceso: AccesoSeccion, perfil: PerfilUsuario | undefined): string {
  if (acceso.id === 'productos' && tipoProductoDelPerfil(perfil))
    return perfil === 'cocinero' ? 'Platos' : 'Bebidas';
  if (acceso.id === 'reportes' && perfil !== undefined && clientes.includes(perfil))
    return 'Encuestas anteriores';
  return acceso.titulo;
}

/**
 * Lo que se muestra en el menú, que no es todo lo que se puede abrir.
 *
 * El menú es una lista de botones sueltos; `accesosDelPerfil` es «a
 * dónde puede ir este perfil», y de ahí sale también el título de la
 * pantalla. Separar las dos cosas es lo que permite sacar «Reportes»
 * del menú del cliente sin que la pantalla de resultados se quede sin
 * nombre ni se vuelva inalcanzable.
 */
export function menuDelPerfil(perfil: PerfilUsuario | undefined): readonly AccesoSeccion[] {
  return accesosDelPerfil(perfil).filter(
    (acceso) => perfil === undefined || !acceso.fueraDelMenu?.includes(perfil),
  );
}
export function puedeAcceder(perfil: PerfilUsuario | undefined, seccion: Seccion): boolean {
  return (
    perfil !== undefined &&
    (perfil === 'dueno' ||
      SECCIONES.some((acceso) => acceso.id === seccion && acceso.perfiles.includes(perfil)))
  );
}
