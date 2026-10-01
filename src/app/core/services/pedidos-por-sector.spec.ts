import { EstadoSector, PedidoDemo, PedidoItemDemo } from '../models/demo-restaurante';
import {
  agruparPorMesa,
  estadoDeSector,
  formatearFechaHora,
  pedidoCompleto,
  pedidosEnSeguimiento,
  sectoresSinEmpezar,
} from './pedidos-por-sector';

const item = (nombre: string, sector: 'cocina' | 'bar', cantidad = 1): PedidoItemDemo => ({
  productoId: nombre,
  nombre,
  cantidad,
  precio: 1000,
  sector,
  minutos: 10,
});

const pedido = (
  id: string,
  mesa: number,
  minuto: number,
  sectores: Record<'cocina' | 'bar', EstadoSector>,
  estado: PedidoDemo['estado'] = 'confirmado',
): PedidoDemo => ({
  id,
  mesa,
  cliente: 'Cliente',
  creadoEn: `01/10/2026 20:${String(minuto).padStart(2, '0')}`,
  momento: new Date(2026, 9, 1, 20, minuto).getTime(),
  items: [item(`Plato ${id}`, 'cocina', 2), item(`Bebida ${id}`, 'bar', 3)],
  estado,
  motivoRechazo: '',
  descuentoPorJuego: 0,
  sectores,
});

describe('Estado de un sector (puntos 16 a 18)', () => {
  it('sin ítems del sector, el sector no interviene', () => {
    expect(estadoDeSector([])).toBe('sin_items');
  });

  it('todo pendiente es pendiente; algo empezado ya es en preparación', () => {
    expect(estadoDeSector(['pendiente', 'pendiente'])).toBe('pendiente');
    expect(estadoDeSector(['pendiente', 'en_preparacion'])).toBe('en_preparacion');
    expect(estadoDeSector(['pendiente', 'listo'])).toBe('en_preparacion');
  });

  it('solo con todos los ítems listos el sector está listo', () => {
    expect(estadoDeSector(['listo', 'listo'])).toBe('listo');
  });

  it('un pedido nuevo deja sin ítems al sector que no participa', () => {
    expect(sectoresSinEmpezar([item('Gaseosa', 'bar')])).toEqual({
      cocina: 'sin_items',
      bar: 'pendiente',
    });
  });
});

describe('Pedido completo (punto 18)', () => {
  it('espera a todos los sectores que intervienen', () => {
    expect(pedidoCompleto({ cocina: 'listo', bar: 'en_preparacion' })).toBe(false);
    expect(pedidoCompleto({ cocina: 'listo', bar: 'listo' })).toBe(true);
  });

  it('un pedido de solo bebidas no espera a la cocina', () => {
    expect(pedidoCompleto({ cocina: 'sin_items', bar: 'listo' })).toBe(true);
  });

  it('un pedido vacío nunca está completo', () => {
    expect(pedidoCompleto({ cocina: 'sin_items', bar: 'sin_items' })).toBe(false);
  });
});

describe('Listado agrupado por mesa (puntos 16 y 17)', () => {
  const pedidos = [
    pedido('b', 7, 30, { cocina: 'pendiente', bar: 'pendiente' }),
    pedido('a', 4, 10, { cocina: 'en_preparacion', bar: 'listo' }),
    pedido('c', 4, 40, { cocina: 'pendiente', bar: 'pendiente' }),
    pedido('d', 2, 5, { cocina: 'pendiente', bar: 'pendiente' }, 'pendiente_confirmacion'),
    pedido('e', 9, 1, { cocina: 'listo', bar: 'listo' }, 'listo'),
  ];

  it('agrupa por mesa con la mesa del pedido más viejo primero', () => {
    const cocina = agruparPorMesa(pedidos, 'cocina');
    expect(cocina.map((m) => m.mesa)).toEqual([4, 7]);
    expect(cocina[0].pedidos.map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('cada sector ve solo sus ítems, con nombre y cantidad', () => {
    const [mesa4] = agruparPorMesa(pedidos, 'cocina');
    expect(mesa4.pedidos[0].items).toEqual([item('Plato a', 'cocina', 2)]);
    const bar = agruparPorMesa(pedidos, 'bar');
    expect(bar.flatMap((m) => m.pedidos.flatMap((p) => p.items.map((i) => i.sector)))).toEqual([
      'bar',
      'bar',
    ]);
  });

  it('lo que el sector ya terminó deja de aparecer', () => {
    const bar = agruparPorMesa(pedidos, 'bar');
    expect(bar.flatMap((m) => m.pedidos.map((p) => p.id))).toEqual(['b', 'c']);
  });

  it('un pedido sin confirmar por el mozo no llega a los sectores', () => {
    const ids = agruparPorMesa(pedidos, 'cocina').flatMap((m) => m.pedidos.map((p) => p.id));
    expect(ids).not.toContain('d');
  });

  it('conserva fecha con hora y minutos y el estado del sector', () => {
    const [mesa4] = agruparPorMesa(pedidos, 'cocina');
    expect(mesa4.pedidos[0]).toMatchObject({
      creadoEn: '01/10/2026 20:10',
      estado: 'en_preparacion',
    });
  });

  it('el mozo sigue los pedidos confirmados, en preparación y listos', () => {
    expect(pedidosEnSeguimiento(pedidos).map((p) => p.id)).toEqual(['e', 'a', 'b', 'c']);
  });
});

describe('Fecha con hora y minutos', () => {
  it('usa dd/mm/aaaa hh:mm, sin segundos', () => {
    expect(formatearFechaHora(new Date(2026, 9, 1, 9, 5, 59))).toBe('01/10/2026 09:05');
  });
});
