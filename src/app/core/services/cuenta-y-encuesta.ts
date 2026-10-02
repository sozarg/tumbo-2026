import { MesaDemo, PedidoItemDemo } from '../models/demo-restaurante';
import { PreguntaDeEncuesta, ValorDeRespuesta } from '../models/encuesta';

/**
 * Reglas de los puntos 20 a 22, separadas del transporte para que el
 * modo demostración y la base hagan exactamente lo mismo. Las que
 * validan espejan a las funciones de la base (`generar_cuenta`,
 * `responder_encuesta`): la base es la que manda, esto es para avisar
 * antes en pantalla.
 */

/** Los cinco niveles de propina del enunciado. */
export const PORCENTAJES_DE_PROPINA = [20, 15, 10, 5, 0] as const;

/**
 * El porcentaje que dice un QR de propina, o `null` si no es uno.
 * Los carteles dicen `TUMBO://propina/15`; también se acepta el número
 * solo, que es el `qr_token` de la base.
 */
export function porcentajeDesdeQrDePropina(contenido: string): number | null {
  const token = contenido.trim().replace(/^tumbo:\/\/propina\//i, '');
  if (!/^\d+$/.test(token)) return null;
  const porcentaje = Number(token);
  return (PORCENTAJES_DE_PROPINA as readonly number[]).includes(porcentaje) ? porcentaje : null;
}

/** La mesa de un QR de mesa (`TUMBO://mesa/<token>`), si existe. */
export function mesaDesdeQr(contenido: string, mesas: readonly MesaDemo[]): MesaDemo | undefined {
  const token = /^tumbo:\/\/mesa\/(.+)$/i.exec(contenido.trim())?.[1];
  return token ? mesas.find((mesa) => mesa.qrToken === token) : undefined;
}

/** Una línea del detalle de la cuenta (punto 21). */
export interface LineaDeCuenta {
  readonly productoId: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly importe: number;
}

/**
 * El detalle de la cuenta con TODOS los pedidos de la estadía. Si la
 * mesa pidió lo mismo en dos tandas, va en una sola línea con la
 * cantidad sumada, como en cualquier ticket.
 */
export function lineasDeCuenta(items: readonly PedidoItemDemo[]): LineaDeCuenta[] {
  const lineas = new Map<string, LineaDeCuenta>();
  for (const item of items) {
    const clave = `${item.productoId}|${item.precio}`;
    const previa = lineas.get(clave);
    const cantidad = (previa?.cantidad ?? 0) + item.cantidad;
    lineas.set(clave, {
      productoId: item.productoId,
      nombre: item.nombre,
      cantidad,
      precioUnitario: item.precio,
      importe: cantidad * item.precio,
    });
  }
  return [...lineas.values()];
}

/** Si una respuesta está vacía: sin valor, texto en blanco o ninguna opción marcada. */
export function respuestaVacia(valor: ValorDeRespuesta | undefined): boolean {
  return (
    valor === null ||
    valor === undefined ||
    (typeof valor === 'string' && valor.trim() === '') ||
    (Array.isArray(valor) && valor.length === 0)
  );
}

/**
 * El error de una respuesta, en español, o `null` si está bien. Es la
 * misma regla que `responder_encuesta()` en la base.
 */
export function errorDeRespuesta(
  pregunta: PreguntaDeEncuesta,
  valor: ValorDeRespuesta | undefined,
): string | null {
  if (respuestaVacia(valor)) return pregunta.requerida ? 'Esta pregunta es obligatoria.' : null;

  switch (pregunta.tipo) {
    case 'estrellas':
    case 'rango': {
      const minimo = pregunta.minimo ?? 1;
      const maximo = pregunta.maximo ?? (pregunta.tipo === 'estrellas' ? 5 : 10);
      return typeof valor === 'number' &&
        Number.isInteger(valor) &&
        valor >= minimo &&
        valor <= maximo
        ? null
        : `Elegí un valor entre ${minimo} y ${maximo}.`;
    }
    case 'radio':
    case 'select':
      return typeof valor === 'string' && pregunta.opciones.includes(valor)
        ? null
        : 'Elegí una de las opciones.';
    case 'checkbox':
      return Array.isArray(valor) &&
        valor.every((opcion) => pregunta.opciones.includes(opcion)) &&
        new Set(valor).size === valor.length
        ? null
        : 'Marcá opciones de la lista.';
    case 'interruptor':
      return typeof valor === 'boolean' ? null : 'Respondé sí o no.';
    case 'texto_largo':
      return typeof valor === 'string' && valor.length <= 500
        ? null
        : 'Escribí hasta 500 caracteres.';
  }
}
