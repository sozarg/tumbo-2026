import {
  EstadoSector,
  PedidoDemo,
  PedidoItemDemo,
  SectorProducto,
  TipoDeItem,
} from '../models/demo-restaurante';

/**
 * Las reglas de los puntos 16 a 18, separadas del transporte.
 *
 * Son funciones puras a propósito: el mock y Supabase arman sus pedidos
 * de maneras distintas, pero los dos tienen que agruparlos y decidir el
 * estado de cada sector EXACTAMENTE igual. Si esta lógica viviera en
 * cada adaptador, el modo demostración podría mostrar algo que la base
 * real no hace.
 */

/** Los estados de un ítem en la base (`estado_item`). */
export type EstadoItem = 'pendiente' | 'en_preparacion' | 'listo';

/** Un pedido tal como lo ve un sector: solo sus ítems. */
export interface PedidoDeSector {
  readonly id: string;
  readonly creadoEn: string;
  readonly estado: Exclude<EstadoSector, 'sin_items' | 'listo'>;
  readonly items: readonly PedidoItemDemo[];
}

/** Lo que el punto 16 llama «listado agrupado por número de mesa». */
export interface MesaDeSector {
  readonly mesa: number;
  readonly pedidos: readonly PedidoDeSector[];
}

/** Los pedidos que ya salieron del mozo y todavía no se entregaron. */
const EN_CURSO: readonly PedidoDemo['estado'][] = ['confirmado', 'en_preparacion', 'listo'];

/**
 * Lo que sigue el mozo: lo que está en cocina y bar, y lo que ya entregó
 * pero el cliente todavía no confirmó (punto 19). Un pedido recibido
 * sale de la lista: ya no le queda nada por hacer.
 */
const EN_SEGUIMIENTO: readonly PedidoDemo['estado'][] = [...EN_CURSO, 'entregado'];

/**
 * El estado de un sector a partir de sus ítems.
 *
 * Basta con que un ítem haya arrancado para que el sector esté «en
 * preparación»: es lo que el cliente necesita ver, que alguien ya está
 * trabajando en lo suyo.
 */
export function estadoDeSector(estados: readonly EstadoItem[]): EstadoSector {
  if (!estados.length) return 'sin_items';
  if (estados.every((estado) => estado === 'listo')) return 'listo';
  if (estados.some((estado) => estado !== 'pendiente')) return 'en_preparacion';
  return 'pendiente';
}

/** El estado de cada sector de un pedido recién armado, sin nada empezado. */
export function sectoresSinEmpezar(
  items: readonly Pick<PedidoItemDemo, 'sector'>[],
): Record<SectorProducto, EstadoSector> {
  const estado = (sector: SectorProducto): EstadoSector =>
    items.some((item) => item.sector === sector) ? 'pendiente' : 'sin_items';
  return { cocina: estado('cocina'), bar: estado('bar') };
}

/**
 * Si todos los sectores que intervienen en el pedido terminaron.
 *
 * Un sector sin ítems no cuenta: un pedido de solo bebidas está completo
 * cuando termina el bar, sin esperar a una cocina que no tiene nada que
 * hacer.
 */
export function pedidoCompleto(sectores: Readonly<Record<SectorProducto, EstadoSector>>): boolean {
  const intervienen = Object.values(sectores).filter((estado) => estado !== 'sin_items');
  return intervienen.length > 0 && intervienen.every((estado) => estado === 'listo');
}

/**
 * Lo que cocina o bar tienen que preparar, agrupado por mesa (punto 16).
 *
 * - Solo pedidos ya confirmados por el mozo: el enunciado prohíbe que un
 *   pedido llegue a los sectores antes de esa confirmación.
 * - Solo la parte del sector, y solo si todavía no la terminó: lo que
 *   ya está listo deja de ocupar lugar en la pantalla del cocinero.
 * - La mesa con el pedido más viejo va primero, y dentro de cada mesa
 *   los pedidos van del más viejo al más nuevo.
 */
export function agruparPorMesa(
  pedidos: readonly PedidoDemo[],
  sector: SectorProducto,
): MesaDeSector[] {
  const mesas = new Map<number, PedidoDeSector[]>();
  const pendientes = pedidos
    .filter((pedido) => EN_CURSO.includes(pedido.estado))
    .filter((pedido) => {
      const estado = pedido.sectores[sector];
      return estado === 'pendiente' || estado === 'en_preparacion';
    })
    .sort((a, b) => a.momento - b.momento);

  for (const pedido of pendientes) {
    const estado = pedido.sectores[sector] as PedidoDeSector['estado'];
    const parte: PedidoDeSector = {
      id: pedido.id,
      creadoEn: pedido.creadoEn,
      estado,
      items: pedido.items.filter((item) => item.sector === sector),
    };
    mesas.set(pedido.mesa, [...(mesas.get(pedido.mesa) ?? []), parte]);
  }

  return [...mesas].map(([mesa, partes]) => ({ mesa, pedidos: partes }));
}

/** Los pedidos que el mozo sigue en «Avance en cocina y bar» (puntos 18 y 19). */
export function pedidosEnSeguimiento(pedidos: readonly PedidoDemo[]): PedidoDemo[] {
  return pedidos
    .filter((pedido) => EN_SEGUIMIENTO.includes(pedido.estado))
    .sort((a, b) => a.momento - b.momento);
}

/**
 * «26/08/2026 20:18»: fecha con hora y minutos, como pide el punto 16.
 *
 * Armado a mano y no con `toLocaleString`, que según el motor agrega
 * segundos, una coma o «p. m.». En la tarjeta de un cocinero eso es
 * ruido, y además haría que el mock y la base se vieran distinto.
 */
export function formatearFechaHora(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return (
    `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()} ` +
    `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`
  );
}

/** Cómo se nombra el estado de un sector en pantalla. */
export const ETIQUETA_DE_ESTADO_SECTOR: Readonly<Record<EstadoSector, string>> = {
  sin_items: 'Sin ítems',
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  listo: 'Listo',
};

/**
 * Los ítems de un pedido agrupados por tipo, para la entrega (punto 19):
 * el mozo lleva comidas, bebidas y postres, y así ve qué lleva de cada
 * cosa. Sin tipo conocido, el ítem va con su sector: bar es bebida y
 * cocina, comida.
 */
export function itemsPorTipo(
  items: readonly PedidoItemDemo[],
): { tipo: TipoDeItem; items: PedidoItemDemo[] }[] {
  const orden: readonly TipoDeItem[] = ['plato', 'bebida', 'postre'];
  const tipoDe = (item: PedidoItemDemo): TipoDeItem =>
    item.tipo ?? (item.sector === 'bar' ? 'bebida' : 'plato');
  return orden
    .map((tipo) => ({ tipo, items: items.filter((item) => tipoDe(item) === tipo) }))
    .filter((grupo) => grupo.items.length > 0);
}

/** Punto 14: los juegos se abren cuando el mozo confirma el pedido. */
export function juegosHabilitados(estado: PedidoDemo['estado']): boolean {
  return [...EN_SEGUIMIENTO, 'recibido'].includes(estado);
}

/** Punto 19: encuesta y cuenta, recién cuando el cliente confirmó la recepción. */
export function encuestaYCuentaHabilitadas(estado: PedidoDemo['estado']): boolean {
  return estado === 'recibido';
}
