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
  | { readonly tipo: 'ignorado'; readonly motivo: string };

/** Los que deciden sobre los clientes, según el punto 5. */
export const GERENCIA = ['dueno', 'supervisor'] as const;

/** Los que entregan el pedido completo, según el punto 18. */
export const MOZOS = ['mozo'] as const;

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
