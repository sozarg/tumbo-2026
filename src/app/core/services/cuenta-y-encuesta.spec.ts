import { MesaDemo, PedidoItemDemo } from '../models/demo-restaurante';
import { PreguntaDeEncuesta } from '../models/encuesta';
import {
  errorDeRespuesta,
  lineasDeCuenta,
  mesaDesdeQr,
  porcentajeDesdeQrDePropina,
} from './cuenta-y-encuesta';

describe('QR de propina (punto 21)', () => {
  it('reconoce los cinco carteles y el token solo', () => {
    expect(porcentajeDesdeQrDePropina('TUMBO://propina/20')).toBe(20);
    expect(porcentajeDesdeQrDePropina('tumbo://propina/0')).toBe(0);
    expect(porcentajeDesdeQrDePropina(' 15 ')).toBe(15);
  });

  it('rechaza lo que no es un QR de propina', () => {
    expect(porcentajeDesdeQrDePropina('TUMBO://propina/30')).toBeNull();
    expect(porcentajeDesdeQrDePropina('TUMBO://mesa/tumbo-mesa-1')).toBeNull();
    expect(porcentajeDesdeQrDePropina('')).toBeNull();
  });
});

describe('QR de mesa (punto 22)', () => {
  const mesas = [
    { numero: 1, qrToken: 'tumbo-mesa-1' },
    { numero: 2, qrToken: 'tumbo-mesa-2' },
  ] as MesaDemo[];

  it('encuentra la mesa por su token', () => {
    expect(mesaDesdeQr('TUMBO://mesa/tumbo-mesa-2', mesas)?.numero).toBe(2);
  });

  it('no confunde otros códigos con una mesa', () => {
    expect(mesaDesdeQr('TUMBO://propina/10', mesas)).toBeUndefined();
    expect(mesaDesdeQr('TUMBO://mesa/inexistente', mesas)).toBeUndefined();
  });
});

describe('Detalle de la cuenta (punto 21)', () => {
  const item = (productoId: string, cantidad: number, precio: number): PedidoItemDemo => ({
    productoId,
    nombre: productoId,
    cantidad,
    precio,
    sector: 'cocina',
    minutos: 0,
  });

  it('junta lo mismo pedido en distintas tandas y calcula el importe', () => {
    expect(
      lineasDeCuenta([item('bife', 1, 18500), item('flan', 2, 6400), item('bife', 2, 18500)]),
    ).toEqual([
      { productoId: 'bife', nombre: 'bife', cantidad: 3, precioUnitario: 18500, importe: 55500 },
      { productoId: 'flan', nombre: 'flan', cantidad: 2, precioUnitario: 6400, importe: 12800 },
    ]);
  });
});

describe('Validación de la encuesta (punto 20)', () => {
  const pregunta = (tipo: PreguntaDeEncuesta['tipo'], extra: Partial<PreguntaDeEncuesta> = {}) =>
    ({
      id: 'p',
      texto: 'Pregunta',
      tipo,
      opciones: ['A', 'B'],
      minimo: null,
      maximo: null,
      requerida: true,
      ...extra,
    }) as PreguntaDeEncuesta;

  it('una obligatoria vacía da error; una opcional vacía no', () => {
    expect(errorDeRespuesta(pregunta('radio'), null)).toBe('Esta pregunta es obligatoria.');
    expect(errorDeRespuesta(pregunta('checkbox', { requerida: false }), [])).toBeNull();
    expect(errorDeRespuesta(pregunta('texto_largo', { requerida: false }), '   ')).toBeNull();
  });

  it('estrellas y rango respetan su escala', () => {
    expect(errorDeRespuesta(pregunta('estrellas', { minimo: 1, maximo: 5 }), 5)).toBeNull();
    expect(errorDeRespuesta(pregunta('estrellas', { minimo: 1, maximo: 5 }), 6)).toBe(
      'Elegí un valor entre 1 y 5.',
    );
    expect(errorDeRespuesta(pregunta('rango', { minimo: 1, maximo: 10 }), 7.5)).not.toBeNull();
  });

  it('radio, select y checkbox solo aceptan opciones de la lista', () => {
    expect(errorDeRespuesta(pregunta('select'), 'B')).toBeNull();
    expect(errorDeRespuesta(pregunta('radio'), 'Z')).toBe('Elegí una de las opciones.');
    expect(errorDeRespuesta(pregunta('checkbox'), ['A', 'A'])).toBe('Marcá opciones de la lista.');
  });

  it('el interruptor es sí o no y el texto tiene tope', () => {
    expect(errorDeRespuesta(pregunta('interruptor'), false)).toBeNull();
    expect(errorDeRespuesta(pregunta('interruptor'), 'sí')).toBe('Respondé sí o no.');
    expect(errorDeRespuesta(pregunta('texto_largo'), 'x'.repeat(501))).toBe(
      'Escribí hasta 500 caracteres.',
    );
  });
});
