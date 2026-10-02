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
  | { readonly tipo: 'pedido'; readonly id: string; readonly momento: MomentoDePedido }
  | { readonly tipo: 'mensaje'; readonly id: string }
  | { readonly tipo: 'cuenta'; readonly id: string; readonly momento: MomentoDeCuenta }
  | { readonly tipo: 'ignorado'; readonly motivo: string };

/** Los momentos del pedido que avisan antes de que esté listo (12 a 14). */
export type MomentoDePedido = 'enviado' | 'rechazado' | 'confirmado';

/** El estado del pedido que dispara cada momento. */
const MOMENTO_POR_ESTADO: Readonly<Record<string, MomentoDePedido>> = {
  pendiente_confirmacion: 'enviado',
  rechazado: 'rechazado',
  confirmado: 'confirmado',
};

/**
 * Los estados en los que el aviso todavía tiene sentido cuando la
 * función vuelve a leer el pedido. El de «confirmado» admite que la
 * cocina ya haya empezado: el aviso llega segundos después y el
 * cocinero igual tiene que enterarse de lo que falta.
 */
export const ESTADOS_DEL_MOMENTO: Readonly<Record<MomentoDePedido, readonly string[]>> = {
  enviado: ['pendiente_confirmacion'],
  rechazado: ['rechazado'],
  confirmado: ['confirmado', 'en_preparacion'],
};

/** Quién prepara cada sector (punto 14: «deriva cada parte a cocina y bar»). */
export const PREPARA: Readonly<Record<string, string>> = {
  cocina: 'cocinero',
  bar: 'cantinero',
};

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

  if (cuerpo.table === 'pedidos' && (cuerpo.type === 'INSERT' || cuerpo.type === 'UPDATE')) {
    if (cuerpo.type === 'UPDATE' && fila.estado === 'listo') return { tipo: 'pedido_listo', id: fila.id };
    const momento = MOMENTO_POR_ESTADO[fila.estado ?? ''];
    // Un pedido nuevo solo avisa si nace pendiente de confirmación.
    if (!momento || (cuerpo.type === 'INSERT' && momento !== 'enviado')) {
      return { tipo: 'ignorado', motivo: 'el pedido no cambió a un estado con aviso' };
    }
    return { tipo: 'pedido', id: fila.id, momento };
  }

  if (cuerpo.table === 'mensajes' && cuerpo.type === 'INSERT') {
    return { tipo: 'mensaje', id: fila.id };
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

/** Lo que dice el aviso de un pedido; `detalle` lista lo que hay que preparar. */
export function avisoDePedido(
  momento: MomentoDePedido,
  mesa: number | null,
  extra: { motivo?: string | null; detalle?: string } = {},
): Aviso {
  const laMesa = mesa ? `La mesa ${mesa}` : 'Una mesa';
  switch (momento) {
    case 'enviado':
      return {
        titulo: 'Pedido para confirmar',
        cuerpo: `${laMesa} envió un pedido. Revisalo y confirmalo.`,
        seccion: 'pedidos',
      };
    case 'rechazado':
      return {
        titulo: 'El mozo rechazó tu pedido',
        cuerpo: extra.motivo?.trim()
          ? `Motivo: ${conPunto(recortar(extra.motivo))} Podés modificarlo y volver a enviarlo.`
          : 'Podés modificarlo y volver a enviarlo.',
        seccion: 'pedidos',
      };
    case 'confirmado':
      return {
        titulo: mesa ? `Nuevo pedido · mesa ${mesa}` : 'Nuevo pedido',
        cuerpo: extra.detalle ? `Para preparar: ${extra.detalle}.` : 'Hay un pedido para preparar.',
        seccion: 'pedidos',
      };
  }
}

/** El aviso al cliente cuando el mozo confirma: ya se está preparando. */
export function avisoDePedidoConfirmadoAlCliente(): Aviso {
  return {
    titulo: 'Tu pedido fue confirmado',
    cuerpo: 'Ya se está preparando. Mientras tanto podés jugar desde la aplicación.',
    seccion: 'pedidos',
  };
}

/**
 * «2 × Bife de chorizo, 1 × Flan»: lo que un sector tiene que preparar,
 * en el orden en que vino.
 */
export function detalleDeItems(items: readonly { cantidad: number; nombre: string }[]): string {
  return items.map((i) => `${i.cantidad} × ${i.nombre}`).join(', ');
}

/** Los avisos del punto 11: la consulta va a los mozos y la respuesta al cliente. */
export function avisoDeMensaje(
  deCliente: boolean,
  mesa: number | null,
  texto: string,
): Aviso {
  return deCliente
    ? {
        titulo: mesa ? `Consulta de la mesa ${mesa}` : 'Nueva consulta',
        cuerpo: recortar(texto),
        seccion: 'consulta',
      }
    : { titulo: 'El mozo te respondió', cuerpo: recortar(texto), seccion: 'consulta' };
}

/** Una notificación muestra dos o tres líneas: el resto se lee en la aplicación. */
export function recortar(texto: string, maximo = 140): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length <= maximo ? limpio : `${limpio.slice(0, maximo - 1).trimEnd()}…`;
}

const conPunto = (texto: string) => (/[.!?…]$/.test(texto) ? texto : `${texto}.`);
