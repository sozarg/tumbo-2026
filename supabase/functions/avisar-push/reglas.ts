import type { Aviso } from '../_shared/push.ts';

/**
 * Qué aviso corresponde a cada webhook, separado del envío.
 *
 * Son funciones puras para poder probarlas sin Firebase ni base: el
 * envío de verdad solo se comprueba con un teléfono en la mano, así que
 * conviene que la decisión de A QUIÉN y QUÉ avisar esté cubierta aparte.
 */

interface Fila {
  id?: string;
  perfil?: string;
  estado?: string;
}

export interface CuerpoDelWebhook {
  type?: string;
  table?: string;
  record?: Fila;
}

/** El trigger dice qué pasó; los datos se vuelven a leer de la base. */
export type Evento =
  | { readonly tipo: 'cliente_pendiente'; readonly id: string }
  | { readonly tipo: 'pedido_listo'; readonly id: string }
  | { readonly tipo: 'cuenta'; readonly id: string; readonly momento: MomentoDeCuenta }
  | { readonly tipo: 'ignorado'; readonly motivo: string };

/** Los tres momentos de la cuenta que avisan (puntos 21 y 22). */
export type MomentoDeCuenta = 'solicitada' | 'pagada' | 'confirmada';

/** Los que deciden sobre los clientes, según el punto 5. */
export const GERENCIA = ['dueno', 'supervisor'] as const;

/** Los que entregan el pedido completo, según el punto 18. */
export const MOZOS = ['mozo'] as const;

/**
 * Quién se entera de cada momento de la cuenta:
 * - punto 21: «el cliente solicita la cuenta y el mozo recibe push»;
 * - punto 21: el pago simulado «llega al mozo, dueño y supervisor»;
 * - punto 22: «el mozo confirma el pago. Dueño y supervisor reciben push».
 */
export const DESTINATARIOS_DE_CUENTA: Readonly<Record<MomentoDeCuenta, readonly string[]>> = {
  solicitada: MOZOS,
  pagada: [...MOZOS, ...GERENCIA],
  confirmada: GERENCIA,
};

/** El estado que tiene que tener la cuenta en la base para cada aviso. */
export const ESTADO_DE_CUENTA: Readonly<Record<MomentoDeCuenta, string>> = {
  solicitada: 'pendiente',
  pagada: 'pagada',
  confirmada: 'confirmada',
};

export function clasificar(cuerpo: CuerpoDelWebhook): Evento {
  const fila = cuerpo.record;
  if (!fila?.id) return { tipo: 'ignorado', motivo: 'el aviso no trae una fila' };

  if (cuerpo.type === 'INSERT' && cuerpo.table === 'usuarios') {
    if (fila.perfil !== 'cliente_registrado' || fila.estado !== 'pendiente') {
      return { tipo: 'ignorado', motivo: 'no es un cliente pendiente' };
    }
    return { tipo: 'cliente_pendiente', id: fila.id };
  }

  if (cuerpo.type === 'UPDATE' && cuerpo.table === 'pedidos') {
    if (fila.estado !== 'listo') return { tipo: 'ignorado', motivo: 'el pedido no está listo' };
    return { tipo: 'pedido_listo', id: fila.id };
  }

  if (cuerpo.table === 'cuentas') {
    if (cuerpo.type === 'INSERT') return { tipo: 'cuenta', id: fila.id, momento: 'solicitada' };
    if (cuerpo.type === 'UPDATE' && (fila.estado === 'pagada' || fila.estado === 'confirmada')) {
      return { tipo: 'cuenta', id: fila.id, momento: fila.estado };
    }
    return { tipo: 'ignorado', motivo: 'la cuenta no cambió a un estado con aviso' };
  }

  return { tipo: 'ignorado', motivo: 'no es un evento con aviso' };
}

export function avisoDeClientePendiente(nombres: string | null, apellidos: string | null): Aviso {
  const nombre = `${nombres ?? ''} ${apellidos ?? ''}`.trim() || 'Un cliente';
  return {
    titulo: 'Nuevo cliente para aprobar',
    cuerpo: `${nombre} se registró y espera tu aprobación.`,
    seccion: 'clientes',
  };
}

/**
 * El aviso del punto 18. Dice la mesa porque es lo único que el mozo
 * necesita para ir a buscar el pedido sin abrir la aplicación.
 */
export function avisoDePedidoListo(mesa: number | null): Aviso {
  return {
    titulo: 'Pedido listo para entregar',
    cuerpo: mesa
      ? `La mesa ${mesa} tiene el pedido completo y listo para entregar.`
      : 'Hay un pedido completo y listo para entregar.',
    seccion: 'pedidos',
  };
}

const pesos = (monto: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(
    monto,
  );

/** Los avisos de la cuenta. Dicen la mesa: es lo que el mozo necesita para ir. */
export function avisoDeCuenta(momento: MomentoDeCuenta, mesa: number | null, total: number): Aviso {
  const laMesa = mesa ? `La mesa ${mesa}` : 'Una mesa';
  switch (momento) {
    case 'solicitada':
      return { titulo: 'Piden la cuenta', cuerpo: `${laMesa} pide la cuenta.`, seccion: 'cuenta' };
    case 'pagada':
      return {
        titulo: 'Pago para confirmar',
        cuerpo: `${laMesa} pagó ${pesos(total)}. Confirmá el pago.`,
        seccion: 'cuenta',
      };
    case 'confirmada':
      return {
        titulo: 'Pago confirmado',
        cuerpo: `${laMesa} pagó ${pesos(total)} y quedó libre.`,
        seccion: 'mesas',
      };
  }
}
