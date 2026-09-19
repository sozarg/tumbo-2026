import { PerfilUsuario, Usuario } from './usuario';

export type TipoProducto = 'plato' | 'bebida';
export type SectorProducto = 'cocina' | 'bar';
export type TipoMesa = 'estándar' | 'VIP' | 'movilidad_reducida';

/**
 * El tipo de mesa como se le muestra a una persona.
 *
 * `movilidad_reducida` es la forma que viaja: la comparte con el enum
 * `tipo_mesa` de la base y no se puede cambiar sin una migración. Pero
 * la pantalla lo estaba imprimiendo tal cual, con el guion bajo y todo,
 * y encima partido en dos renglones —«movilidad / _reducida»—.
 *
 * Las otras dos ya se leen bien; están igual acá para que el día que
 * alguien agregue un tipo nuevo tenga un solo lugar donde ponerle
 * nombre, y para que TypeScript avise si se olvida.
 */
export const ETIQUETA_DE_TIPO_MESA: Readonly<Record<TipoMesa, string>> = {
  estándar: 'Estándar',
  VIP: 'VIP',
  movilidad_reducida: 'Movilidad reducida',
};
export type EstadoPedido =
  | 'pendiente_confirmacion'
  | 'rechazado'
  | 'confirmado'
  | 'en_preparacion'
  | 'listo'
  | 'entregado'
  | 'recibido';
export type EstadoCuenta = 'borrador' | 'pendiente_pago' | 'pagada' | 'confirmada';

export interface ProductoDemo {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly tipo: TipoProducto;
  readonly sector: SectorProducto;
  readonly precio: number;
  readonly minutos: number;
  readonly fotos: readonly string[];
}

export interface MesaDemo {
  readonly id: string;
  readonly numero: number;
  readonly comensales: number;
  readonly tipo: TipoMesa;
  readonly disponible: boolean;
  readonly qrToken: string;
  /** La foto de la mesa (punto 4). `null` mientras no le sacaron una. */
  readonly fotoUrl: string | null;
}

export interface ClientePendienteDemo {
  readonly id: string;
  readonly nombres: string;
  readonly apellidos: string;
  readonly dni: string;
  readonly correo: string;
  readonly foto: string;
  readonly estado: 'pendiente' | 'aprobado' | 'rechazado';
}

export interface PersonaEsperaDemo {
  readonly id: string;
  readonly nombre: string;
  readonly foto: string;
  readonly fecha: string;
  readonly mesaAsignada?: number;
}

export interface PedidoItemDemo {
  readonly productoId: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precio: number;
  readonly sector: SectorProducto;
  readonly minutos: number;
}

export interface PedidoDemo {
  readonly id: string;
  readonly mesa: number;
  readonly cliente: string;
  readonly creadoEn: string;
  readonly items: readonly PedidoItemDemo[];
  readonly estado: EstadoPedido;
  readonly motivoRechazo: string;
  readonly descuentoPorJuego: number;
  readonly sectoresListos: Readonly<Record<SectorProducto, boolean>>;
}

export interface MensajeDemo {
  readonly id: string;
  readonly autor: string;
  readonly texto: string;
  readonly fecha: string;
  readonly esPropio: boolean;
}

export interface CuentaDemo {
  readonly subtotal: number;
  readonly descuento: number;
  readonly porcentajePropina: number;
  readonly propina: number;
  readonly total: number;
  readonly estado: EstadoCuenta;
}

export interface NotificacionDemo {
  readonly id: string;
  readonly mensaje: string;
  readonly fecha: string;
  readonly destinatarios: readonly PerfilUsuario[];
}

export interface AltaEmpleadoDemo {
  readonly nombres: string;
  readonly apellidos: string;
  readonly dni: string;
  readonly cuil: string;
  readonly correo: string;
  /**
   * La contraseña con la que el empleado va a ingresar.
   *
   * La pide el punto 1 del enunciado y hasta ahora faltaba: sin ella el
   * alta no podía crear una cuenta de verdad. Nunca se guarda en
   * `public.usuarios` —la maneja Supabase Auth, cifrada— y viaja una
   * sola vez, hacia la Edge Function `crear-empleado`.
   */
  readonly clave: string;
  readonly perfil: Extract<PerfilUsuario, 'metre' | 'mozo' | 'cocinero' | 'cantinero'>;
  /**
   * La foto personal, tomada con la cámara (punto 1).
   *
   * Es opcional en el tipo y obligatoria en el formulario. La diferencia
   * es a propósito: el modo demostración no tiene dónde subirla, y el
   * alta de demostración tiene que seguir funcionando sin cámara.
   */
  readonly foto?: FotoDePersona;
}

export interface AltaProductoDemo {
  readonly nombre: string;
  readonly descripcion: string;
  readonly minutos: number;
  readonly precio: number;
  readonly tipo: TipoProducto;
  /**
   * Las tres fotos del producto (punto 2), en el orden en que se ven.
   *
   * Son tres lugares fijos y no una lista que crece: la tabla
   * `producto_fotos` tiene `orden smallint check (orden between 1 and 3)`
   * y un índice único por (producto, orden). La posición en este arreglo
   * ES el orden en la base.
   *
   * Un lugar puede venir en `null` al editar, cuando esa foto no se
   * cambió: ahí se deja la que ya estaba.
   */
  readonly fotos?: readonly (ImagenProducto | null)[];
}

export interface ImagenProducto {
  readonly file: File;
  readonly previewUrl: string;
}

/**
 * La foto de una persona, con la misma forma que la de un producto.
 *
 * Es un alias y no una interfaz nueva a propósito: si fueran dos tipos
 * distintos con los mismos campos, el día que haya que cambiar uno
 * alguien se va a olvidar del otro.
 */
export type FotoDePersona = ImagenProducto;

export interface AltaMesaDemo {
  readonly numero: number;
  readonly comensales: number;
  readonly tipo: TipoMesa;
  /**
   * La foto de la mesa, tomada con la cámara (punto 4).
   *
   * Opcional en el tipo y obligatoria en el ALTA del formulario, igual
   * que la del empleado: el modo demostración no tiene dónde subirla, y
   * al modificar una mesa el lugar vacío significa «esta no la cambié».
   */
  readonly foto?: FotoDePersona;
}

export interface AltaClienteDemo {
  readonly nombres: string;
  readonly apellidos: string;
  readonly dni: string;
  readonly correo: string;
}
