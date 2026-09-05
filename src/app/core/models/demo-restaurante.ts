import { PerfilUsuario, Usuario } from './usuario';

export type TipoProducto = 'plato' | 'bebida';
export type SectorProducto = 'cocina' | 'bar';
export type TipoMesa = 'estándar' | 'VIP' | 'movilidad_reducida';
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
}

export interface AltaProductoDemo {
  readonly nombre: string;
  readonly descripcion: string;
  readonly minutos: number;
  readonly precio: number;
  readonly tipo: TipoProducto;
}

export interface AltaMesaDemo {
  readonly numero: number;
  readonly comensales: number;
  readonly tipo: TipoMesa;
}

export interface AltaClienteDemo {
  readonly nombres: string;
  readonly apellidos: string;
  readonly dni: string;
  readonly correo: string;
}
