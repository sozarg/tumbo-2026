import { Injectable, computed, signal } from '@angular/core';
import { PerfilUsuario, Usuario } from '../models/usuario';
import {
  AltaClienteDemo,
  AltaEmpleadoDemo,
  AltaMesaDemo,
  AltaProductoDemo,
  ClientePendienteDemo,
  CuentaDemo,
  EstadoPedido,
  MensajeDemo,
  MesaDemo,
  NotificacionDemo,
  PedidoDemo,
  PedidoItemDemo,
  PersonaEsperaDemo,
  ProductoDemo,
  SectorProducto,
  TipoMesa,
} from '../models/demo-restaurante';

@Injectable({ providedIn: 'root' })
export class DemoRestauranteService {
  readonly productos = signal<ProductoDemo[]>(this.productosIniciales());
  readonly mesas = signal<MesaDemo[]>(this.mesasIniciales());
  readonly empleados = signal<Usuario[]>(this.empleadosIniciales());
  readonly clientes = signal<ClientePendienteDemo[]>(this.clientesIniciales());
  readonly espera = signal<PersonaEsperaDemo[]>([
    {
      id: 'espera-1',
      nombre: 'Florencia Soto',
      foto: 'imagenes/logo.png',
      fecha: '26/08/2026 20:12',
    },
  ]);
  readonly pedidoActivo = signal<PedidoDemo>(this.pedidoInicial());
  readonly carrito = signal<PedidoItemDemo[]>([]);
  readonly mensajes = signal<MensajeDemo[]>([
    {
      id: 'mensaje-1',
      autor: 'Mozo de turno',
      texto: 'Hola, ¿en qué podemos ayudarte?',
      fecha: '26/08/2026 20:18',
      esPropio: false,
    },
  ]);
  readonly notificaciones = signal<NotificacionDemo[]>([]);
  readonly descuento = signal(0);
  readonly intentosJuego = signal<Record<string, number>>({});
  readonly encuestaRespondida = signal(false);
  readonly porcentajePropina = signal<number | null>(null);
  readonly cuenta = signal<CuentaDemo | null>(null);
  readonly mesaVinculada = signal<number | null>(2);

  readonly clientesPendientes = computed(() =>
    this.clientes().filter((cliente) => cliente.estado === 'pendiente'),
  );
  readonly totalCarrito = computed(() =>
    this.carrito().reduce((total, item) => total + item.precio * item.cantidad, 0),
  );
  readonly tiempoCarrito = computed(() =>
    this.carrito().reduce((total, item) => Math.max(total, item.minutos), 0),
  );
  readonly productosCocina = computed(() =>
    this.productos().filter((producto) => producto.sector === 'cocina'),
  );
  readonly productosBar = computed(() =>
    this.productos().filter((producto) => producto.sector === 'bar'),
  );

  registrarEmpleado(datos: AltaEmpleadoDemo): void {
    const id = this.slug(datos.nombres + '-' + datos.apellidos);
    const etiqueta = datos.perfil === 'cocinero' ? 'Cocinero' : datos.perfil === 'cantinero' ? 'Cantinero' : 'Mozo';
    const nuevo: Usuario = {
      id,
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      correo: datos.correo.trim().toLowerCase(),
      perfil: datos.perfil,
      etiquetaPerfil: etiqueta,
    };
    this.empleados.update((empleados) => [...empleados, nuevo]);
    this.notificar('Nuevo integrante agregado al equipo.', ['dueno', 'supervisor']);
  }

  registrarProducto(datos: AltaProductoDemo): void {
    const sector: SectorProducto = datos.tipo === 'plato' ? 'cocina' : 'bar';
    const producto: ProductoDemo = {
      id: this.slug(datos.nombre),
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      tipo: datos.tipo,
      sector,
      precio: datos.precio,
      minutos: datos.minutos,
      fotos: ['imagenes/logo-nombre.png', 'imagenes/logo.png', 'imagenes/logo-nombre.png'],
    };
    this.productos.update((productos) => [...productos, producto]);
    this.notificar(
      (datos.tipo === 'plato' ? 'Plato' : 'Bebida') + ' agregado a la carta.',
      sector === 'cocina' ? ['cocinero'] : ['cantinero'],
    );
  }

  registrarMesa(datos: AltaMesaDemo): boolean {
    if (this.mesas().some((mesa) => mesa.numero === datos.numero)) {
      return false;
    }

    const mesa: MesaDemo = {
      id: 'mesa-' + datos.numero,
      numero: datos.numero,
      comensales: datos.comensales,
      tipo: datos.tipo,
      disponible: true,
      qrToken: 'tumbo-mesa-' + datos.numero,
    };
    this.mesas.update((mesas) => [...mesas, mesa]);
    return true;
  }

  registrarCliente(datos: AltaClienteDemo): void {
    const cliente: ClientePendienteDemo = {
      id: 'cliente-' + Date.now(),
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      dni: datos.dni,
      correo: datos.correo,
      foto: 'imagenes/logo.png',
      estado: 'pendiente',
    };
    this.clientes.update((clientes) => [...clientes, cliente]);
    this.notificar('Nuevo cliente pendiente de aprobación.', ['dueno', 'supervisor']);
  }

  resolverCliente(id: string, estado: 'aprobado' | 'rechazado'): void {
    this.clientes.update((clientes) =>
      clientes.map((cliente) => (cliente.id === id ? { ...cliente, estado } : cliente)),
    );
    const cliente = this.clientes().find((item) => item.id === id);
    if (cliente) {
      this.notificar(
        `${cliente.nombres} ${cliente.apellidos}: registro ${estado}.`,
        ['cliente_registrado'],
      );
    }
  }

  cambiarDisponibilidadMesa(numero: number): void {
    this.mesas.update((mesas) =>
      mesas.map((mesa) =>
        mesa.numero === numero ? { ...mesa, disponible: !mesa.disponible } : mesa,
      ),
    );
  }

  anotarEnEspera(nombre: string): void {
    this.espera.update((personas) => [
      ...personas,
      {
        id: 'espera-' + Date.now(),
        nombre,
        foto: 'imagenes/logo.png',
        fecha: this.ahora(),
      },
    ]);
    this.notificar(`${nombre} se anotó en la lista de espera.`, ['metre']);
  }

  eliminarDeEspera(id: string): void {
    this.espera.update((personas) => personas.filter((persona) => persona.id !== id));
  }

  asignarMesa(idEspera: string, numeroMesa: number): boolean {
    const mesa = this.mesas().find((item) => item.numero === numeroMesa);
    const persona = this.espera().find((item) => item.id === idEspera);
    if (!mesa || !persona || !mesa.disponible) {
      return false;
    }

    this.mesas.update((mesas) =>
      mesas.map((item) => (item.numero === numeroMesa ? { ...item, disponible: false } : item)),
    );
    this.espera.update((personas) =>
      personas.map((item) =>
        item.id === idEspera ? { ...item, mesaAsignada: numeroMesa } : item,
      ),
    );
    this.mesaVinculada.set(numeroMesa);
    this.notificar(`Mesa ${numeroMesa} asignada a ${persona.nombre}.`, ['cliente_registrado']);
    return true;
  }

  vincularMesa(numeroMesa: number): boolean {
    const mesa = this.mesas().find((item) => item.numero === numeroMesa);
    if (!mesa || !this.mesaVinculada() || this.mesaVinculada() !== numeroMesa) {
      return false;
    }
    return true;
  }

  agregarAlCarrito(producto: ProductoDemo): void {
    this.carrito.update((items) => {
      const existente = items.find((item) => item.productoId === producto.id);
      if (existente) {
        return items.map((item) =>
          item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item,
        );
      }
      return [
        ...items,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          cantidad: 1,
          precio: producto.precio,
          sector: producto.sector,
          minutos: producto.minutos,
        },
      ];
    });
  }

  quitarDelCarrito(productoId: string): void {
    this.carrito.update((items) =>
      items
        .map((item) =>
          item.productoId === productoId ? { ...item, cantidad: item.cantidad - 1 } : item,
        )
        .filter((item) => item.cantidad > 0),
    );
  }

  enviarPedido(cliente: string, mesa: number): boolean {
    if (this.carrito().length === 0) {
      return false;
    }
    const pedido: PedidoDemo = {
      id: 'pedido-' + Date.now(),
      mesa,
      cliente,
      creadoEn: this.ahora(),
      items: this.carrito(),
      estado: 'pendiente_confirmacion',
      motivoRechazo: '',
      descuentoPorJuego: this.descuento(),
      sectoresListos: { cocina: false, bar: false },
    };
    this.pedidoActivo.set(pedido);
    this.carrito.set([]);
    this.notificar(`Nuevo pedido de la mesa ${mesa}.`, ['mozo']);
    return true;
  }

  rechazarPedido(motivo: string): void {
    this.actualizarPedido({ estado: 'rechazado', motivoRechazo: motivo });
    this.notificar(`Pedido rechazado: ${motivo}`, ['cliente_registrado', 'cliente_anonimo']);
  }

  confirmarPedido(): void {
    this.actualizarPedido({ estado: 'confirmado', motivoRechazo: '' });
    this.notificar('Pedido confirmado y derivado a cocina y bar.', ['cocinero', 'cantinero']);
  }

  marcarSectorListo(sector: SectorProducto): void {
    const pedido = this.pedidoActivo();
    const sectores = { ...pedido.sectoresListos, [sector]: true };
    const participaCocina = pedido.items.some((item) => item.sector === 'cocina');
    const participaBar = pedido.items.some((item) => item.sector === 'bar');
    const completo = (!participaCocina || sectores.cocina) && (!participaBar || sectores.bar);
    this.actualizarPedido({
      sectoresListos: sectores,
      estado: completo ? 'listo' : 'en_preparacion',
    });
    if (completo) {
      this.notificar('Pedido completo: todos los sectores terminaron.', ['mozo', 'cliente_registrado']);
    }
  }

  marcarEntregado(): void {
    this.actualizarPedido({ estado: 'entregado' });
    this.notificar('El pedido fue entregado. Confirmá la recepción.', ['cliente_registrado', 'cliente_anonimo']);
  }

  confirmarRecepcion(): void {
    this.actualizarPedido({ estado: 'recibido' });
  }

  agregarMensaje(autor: string, texto: string, esPropio: boolean): void {
    this.mensajes.update((mensajes) => [
      ...mensajes,
      { id: 'mensaje-' + Date.now(), autor, texto, fecha: this.ahora(), esPropio },
    ]);
  }

  jugar(idJuego: string, gano: boolean): number {
    const intentos = this.intentosJuego();
    const intentoActual = (intentos[idJuego] ?? 0) + 1;
    this.intentosJuego.set({ ...intentos, [idJuego]: intentoActual });
    if (gano && intentoActual === 1 && this.descuento() === 0) {
      const beneficios: Record<string, number> = { memoria: 10, palabras: 15, rapidez: 20 };
      this.descuento.set(beneficios[idJuego] ?? 10);
    }
    return intentoActual;
  }

  registrarEncuesta(): boolean {
    if (this.encuestaRespondida()) {
      return false;
    }
    this.encuestaRespondida.set(true);
    this.notificar('Encuesta guardada. Gracias por tu opinión.', ['cliente_registrado', 'cliente_anonimo']);
    return true;
  }

  seleccionarPropina(porcentaje: number): void {
    this.porcentajePropina.set(porcentaje);
  }

  generarCuenta(): boolean {
    const porcentaje = this.porcentajePropina();
    if (porcentaje === null) {
      return false;
    }
    const pedido = this.pedidoActivo();
    const subtotal = pedido.items.reduce((total, item) => total + item.precio * item.cantidad, 0);
    const descuento = Math.round(subtotal * (pedido.descuentoPorJuego / 100));
    const base = subtotal - descuento;
    const propina = Math.round(base * (porcentaje / 100));
    this.cuenta.set({
      subtotal,
      descuento,
      porcentajePropina: porcentaje,
      propina,
      total: base + propina,
      estado: 'pendiente_pago',
    });
    this.notificar('La cuenta está disponible para pagar.', ['mozo', 'dueno', 'supervisor']);
    return true;
  }

  pagarCuenta(): void {
    const cuenta = this.cuenta();
    if (cuenta) {
      this.cuenta.set({ ...cuenta, estado: 'pagada' });
      this.notificar('Pago simulado realizado. Esperando confirmación del mozo.', ['mozo', 'dueno', 'supervisor']);
    }
  }

  confirmarPago(): void {
    const cuenta = this.cuenta();
    if (cuenta) {
      this.cuenta.set({ ...cuenta, estado: 'confirmada' });
      const mesa = this.pedidoActivo().mesa;
      this.mesas.update((mesas) =>
        mesas.map((item) => (item.numero === mesa ? { ...item, disponible: true } : item)),
      );
      this.mesaVinculada.set(null);
      this.notificar(`Pago confirmado. Mesa ${mesa} liberada.`, ['dueno', 'supervisor']);
    }
  }

  private actualizarPedido(cambios: Partial<PedidoDemo>): void {
    this.pedidoActivo.update((pedido) => ({ ...pedido, ...cambios }));
  }

  private notificar(mensaje: string, destinatarios: readonly PerfilUsuario[]): void {
    this.notificaciones.update((notificaciones) => [
      {
        id: 'notificacion-' + Date.now(),
        mensaje,
        fecha: this.ahora(),
        destinatarios,
      },
      ...notificaciones,
    ]);
  }

  private productosIniciales(): ProductoDemo[] {
    const fotos = ['imagenes/logo-nombre.png', 'imagenes/logo.png', 'imagenes/logo-nombre.png'];
    return [
      ['Hamburguesa TUMBO', 'Carne, cheddar, cebolla caramelizada y salsa de la casa.', 'plato', 'cocina', 7800, 18],
      ['Ravioles de la abuela', 'Ravioles caseros con salsa pomodoro y albahaca.', 'plato', 'cocina', 6900, 22],
      ['Ensalada fresca', 'Hojas verdes, tomates, queso y vinagreta cítrica.', 'plato', 'cocina', 5200, 12],
      ['Papas crocantes', 'Papas doradas con especias y aderezo TUMBO.', 'plato', 'cocina', 3500, 10],
      ['Taco de vegetales', 'Tortilla de maíz, vegetales grillados y guacamole.', 'plato', 'cocina', 6100, 16],
      ['Limonada de la casa', 'Limonada fresca con menta y jengibre.', 'bebida', 'bar', 2400, 5],
      ['TUMBO Spritz', 'Aperitivo cítrico, soda y frutos rojos.', 'bebida', 'bar', 4200, 7],
      ['Gaseosa', 'Bebida fría de la línea seleccionada.', 'bebida', 'bar', 1900, 2],
      ['Agua mineral', 'Agua mineral con o sin gas.', 'bebida', 'bar', 1600, 1],
      ['Café de especialidad', 'Café de especialidad tostado local.', 'bebida', 'bar', 2300, 4],
    ].map(([nombre, descripcion, tipo, sector, precio, minutos], indice) => ({
      id: `${tipo}-${indice + 1}`,
      nombre: nombre as string,
      descripcion: descripcion as string,
      tipo: tipo as 'plato' | 'bebida',
      sector: sector as SectorProducto,
      precio: precio as number,
      minutos: minutos as number,
      fotos,
    }));
  }

  private mesasIniciales(): MesaDemo[] {
    return [1, 2, 3, 4, 5].map((numero) => ({
      id: 'mesa-' + numero,
      numero,
      comensales: numero === 5 ? 6 : 4,
      tipo: numero === 1 ? 'VIP' : numero === 4 ? 'movilidad_reducida' : 'estándar',
      disponible: numero !== 2,
      qrToken: 'tumbo-mesa-' + numero,
    }));
  }

  private empleadosIniciales(): Usuario[] {
    return [
      ['Alicia', 'Gómez', 'alicia@tumbo.demo', 'cocinero', 'Cocinero'],
      ['Bruno', 'Sosa', 'bruno@tumbo.demo', 'cantinero', 'Cantinero'],
      ['Matías Gabriel', 'Ferrari', 'matias@tumbo.demo', 'mozo', 'Mozo'],
    ].map(([nombres, apellidos, correo, perfil, etiquetaPerfil], indice) => ({
      id: 'empleado-' + (indice + 1),
      nombres: nombres as string,
      apellidos: apellidos as string,
      correo: correo as string,
      perfil: perfil as Extract<PerfilUsuario, 'cocinero' | 'cantinero' | 'mozo'>,
      etiquetaPerfil: etiquetaPerfil as string,
    }));
  }

  private clientesIniciales(): ClientePendienteDemo[] {
    return [
      {
        id: 'cliente-pendiente-1',
        nombres: 'Lucía',
        apellidos: 'Fernández',
        dni: '42.123.456',
        correo: 'lucia@correo.demo',
        foto: 'imagenes/logo.png',
        estado: 'pendiente',
      },
      {
        id: 'cliente-aprobado-1',
        nombres: 'Camila',
        apellidos: 'Pérez',
        dni: '41.555.222',
        correo: 'camila@tumbo.demo',
        foto: 'imagenes/logo.png',
        estado: 'aprobado',
      },
    ];
  }

  private pedidoInicial(): PedidoDemo {
    return {
      id: 'pedido-demo-1',
      mesa: 2,
      cliente: 'Camila Pérez',
      creadoEn: '26/08/2026 20:18',
      items: [
        {
          productoId: 'plato-1',
          nombre: 'Hamburguesa TUMBO',
          cantidad: 2,
          precio: 7800,
          sector: 'cocina',
          minutos: 18,
        },
        {
          productoId: 'bebida-1',
          nombre: 'Limonada de la casa',
          cantidad: 2,
          precio: 2400,
          sector: 'bar',
          minutos: 5,
        },
      ],
      estado: 'confirmado',
      motivoRechazo: '',
      descuentoPorJuego: 0,
      sectoresListos: { cocina: false, bar: false },
    };
  }

  private slug(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private ahora(): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date());
  }
}
