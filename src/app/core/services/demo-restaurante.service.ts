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
  EstadoSector,
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
import { PreguntaDeEncuesta, RespuestasDeEncuesta, ResultadosDeEncuesta } from '../models/encuesta';
import { errorDeRespuesta } from './cuenta-y-encuesta';
import {
  carritoDesdePedido,
  formatearFechaHora,
  pedidoCompleto,
  pedidosEnSeguimiento,
  sectoresSinEmpezar,
} from './pedidos-por-sector';

/** La encuesta de la base, para el modo demostración (punto 20). */
const PREGUNTAS_DE_DEMOSTRACION: PreguntaDeEncuesta[] = [
  {
    id: 'pregunta-1',
    texto: '¿Cómo calificarías la atención que recibiste?',
    tipo: 'estrellas',
    opciones: [],
    minimo: 1,
    maximo: 5,
    requerida: true,
  },
  {
    id: 'pregunta-2',
    texto: '¿Qué te pareció el tiempo de espera?',
    tipo: 'radio',
    opciones: ['Mucho más rápido de lo esperado', 'Rápido', 'Razonable', 'Lento', 'Muy lento'],
    minimo: null,
    maximo: null,
    requerida: true,
  },
  {
    id: 'pregunta-3',
    texto: '¿Qué aspectos disfrutaste de tu visita?',
    tipo: 'checkbox',
    opciones: [
      'La comida',
      'La atención',
      'El ambiente',
      'La música',
      'Los precios',
      'La limpieza',
    ],
    minimo: null,
    maximo: null,
    requerida: false,
  },
  {
    id: 'pregunta-4',
    texto: '¿Cómo conociste TUMBO?',
    tipo: 'select',
    opciones: [
      'Un conocido me lo recomendó',
      'Redes sociales',
      'Pasaba por la puerta',
      'Ya soy cliente habitual',
    ],
    minimo: null,
    maximo: null,
    requerida: true,
  },
  {
    id: 'pregunta-5',
    texto: '¿Qué tan limpio encontraste el local?',
    tipo: 'rango',
    opciones: [],
    minimo: 1,
    maximo: 10,
    requerida: true,
  },
  {
    id: 'pregunta-6',
    texto: '¿Volverías a comer en TUMBO?',
    tipo: 'interruptor',
    opciones: [],
    minimo: null,
    maximo: null,
    requerida: true,
  },
  {
    id: 'pregunta-7',
    texto: '¿Querés contarnos algo más?',
    tipo: 'texto_largo',
    opciones: [],
    minimo: null,
    maximo: null,
    requerida: false,
  },
];

/** Resultados de ejemplo para los gráficos en modo demostración. */
const RESULTADOS_DE_DEMOSTRACION: ResultadosDeEncuesta = {
  total: 128,
  torta: {
    pregunta: '¿Qué te pareció el tiempo de espera?',
    datos: [
      { etiqueta: 'Mucho más rápido de lo esperado', cantidad: 18 },
      { etiqueta: 'Rápido', cantidad: 44 },
      { etiqueta: 'Razonable', cantidad: 42 },
      { etiqueta: 'Lento', cantidad: 17 },
      { etiqueta: 'Muy lento', cantidad: 7 },
    ],
  },
  barras: {
    pregunta: '¿Qué aspectos disfrutaste de tu visita?',
    datos: [
      { etiqueta: 'La comida', cantidad: 61 },
      { etiqueta: 'La atención', cantidad: 48 },
      { etiqueta: 'El ambiente', cantidad: 39 },
      { etiqueta: 'La música', cantidad: 22 },
      { etiqueta: 'Los precios', cantidad: 30 },
      { etiqueta: 'La limpieza', cantidad: 35 },
    ],
  },
  linea: {
    pregunta: '¿Cómo calificarías la atención que recibiste?',
    datos: [
      { etiqueta: 'Semana 1', promedio: 4.05 },
      { etiqueta: 'Semana 2', promedio: 4.18 },
      { etiqueta: 'Semana 3', promedio: 4.3 },
      { etiqueta: 'Semana 4', promedio: 4.41 },
    ],
  },
};

/** Los tres lugares de foto del punto 2, en el orden en que se ven. */
const LUGARES_DE_FOTO = [0, 1, 2] as const;

/** Qué se muestra en un lugar sin foto, en modo demostración. */
const FOTOS_DE_RELLENO = [
  'imagenes/logo-nombre.png',
  'imagenes/logo.png',
  'imagenes/logo-nombre.png',
] as const;

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
  /**
   * Los pedidos de las OTRAS mesas, para que cocina y bar tengan algo que
   * agrupar en modo demostración (punto 16). El de la mesa del cliente
   * es `pedidoActivo`; juntos forman lo que ve el personal.
   */
  readonly otrosPedidos = signal<PedidoDemo[]>(this.otrosPedidosIniciales());
  readonly pedidosEnCurso = computed(() =>
    pedidosEnSeguimiento([this.pedidoActivo(), ...this.otrosPedidos()]),
  );
  readonly carrito = signal<PedidoItemDemo[]>([]);
  readonly mensajes = signal<MensajeDemo[]>([
    {
      id: 'mensaje-1',
      autor: 'Mozo',
      texto: 'Hola, ¿en qué podemos ayudarte?',
      fecha: '26/08/2026 20:18',
      esPropio: false,
      sesionId: 'sesion-demo',
      mesa: 2,
      deCliente: false,
    },
  ]);
  readonly notificaciones = signal<NotificacionDemo[]>([]);
  readonly descuento = signal(0);
  readonly intentosJuego = signal<Record<string, number>>({});
  readonly encuestaRespondida = signal(false);
  readonly cuenta = signal<CuentaDemo | null>(null);
  /** Para el mozo: las cuentas que todavía no se confirmaron. */
  readonly cuentasEnCurso = computed(() => {
    const cuenta = this.cuenta();
    return cuenta && cuenta.estado !== 'confirmada' ? [cuenta] : [];
  });
  /** Las mismas siete preguntas de `preguntas_encuesta`. */
  readonly preguntas = signal<PreguntaDeEncuesta[]>(PREGUNTAS_DE_DEMOSTRACION);
  readonly resultadosEncuesta = signal<ResultadosDeEncuesta | null>(RESULTADOS_DE_DEMOSTRACION);
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
    const etiqueta =
      datos.perfil === 'cocinero'
        ? 'Cocinero'
        : datos.perfil === 'cantinero'
          ? 'Cantinero'
          : 'Mozo';
    const nuevo: Usuario = {
      id,
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      correo: datos.correo.trim().toLowerCase(),
      perfil: datos.perfil,
      etiquetaPerfil: etiqueta,
      estado: 'aprobado',
      fotoUrl: null,
    };
    this.empleados.update((empleados) => [...empleados, nuevo]);
    this.notificar('Nuevo integrante agregado al equipo.', ['dueno', 'supervisor']);
  }

  eliminarEmpleado(id: string): void {
    this.empleados.update((empleados) => empleados.filter((empleado) => empleado.id !== id));
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
      // Los tres lugares siempre se llenan: la carta muestra tres fotos.
      // En demostración no hay dónde subir nada, así que el lugar vacío
      // se cubre con el logo en vez de dejar un hueco.
      fotos: LUGARES_DE_FOTO.map(
        (lugar) => datos.fotos?.[lugar]?.previewUrl ?? FOTOS_DE_RELLENO[lugar],
      ),
    };
    this.productos.update((productos) => [...productos, producto]);
    this.notificar(
      (datos.tipo === 'plato' ? 'Plato' : 'Bebida') + ' agregado a la carta.',
      sector === 'cocina' ? ['cocinero'] : ['cantinero'],
    );
  }

  eliminarProducto(id: string): void {
    this.productos.update((productos) => productos.filter((producto) => producto.id !== id));
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
      fotoUrl: datos.foto?.previewUrl ?? null,
    };
    this.mesas.update((mesas) => [...mesas, mesa]);
    return true;
  }

  actualizarMesa(id: string, datos: AltaMesaDemo): void {
    this.mesas.update((mesas) =>
      mesas.map((mesa) =>
        mesa.id === id
          ? {
              ...mesa,
              numero: datos.numero,
              comensales: datos.comensales,
              tipo: datos.tipo,
              // Sin foto nueva se deja la que estaba: el lugar vacío al
              // modificar significa «esta no la cambié».
              fotoUrl: datos.foto?.previewUrl ?? mesa.fotoUrl,
            }
          : mesa,
      ),
    );
  }

  eliminarMesa(id: string): void {
    this.mesas.update((mesas) => mesas.filter((mesa) => mesa.id !== id));
  }

  registrarCliente(datos: AltaClienteDemo): void {
    const cliente: ClientePendienteDemo = {
      id: 'cliente-' + Date.now(),
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      dni: datos.dni,
      correo: datos.correo,
      // La que sacó la cámara si la hay; el logo solo como respaldo,
      // para que el listado de pendientes no quede con un hueco.
      foto: datos.foto?.previewUrl ?? 'imagenes/logo.png',
      estado: 'pendiente',
    };
    this.clientes.update((clientes) => [...clientes, cliente]);
    this.notificar('Nuevo cliente pendiente de aprobación.', ['dueno', 'supervisor']);
  }

  resolverCliente(id: string, estado: 'aprobado' | 'rechazado', motivo?: string | null): void {
    this.clientes.update((clientes) =>
      clientes.map((cliente) =>
        cliente.id === id
          ? { ...cliente, estado, motivoRechazo: estado === 'rechazado' ? (motivo ?? '') : '' }
          : cliente,
      ),
    );
    const cliente = this.clientes().find((item) => item.id === id);
    if (cliente) {
      this.notificar(
        `${cliente.nombres} ${cliente.apellidos}: registro ${estado}.` +
          (estado === 'rechazado' && motivo ? ` Motivo: ${motivo}` : ''),
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
      personas.map((item) => (item.id === idEspera ? { ...item, mesaAsignada: numeroMesa } : item)),
    );
    this.notificar(`Mesa ${numeroMesa} asignada a ${persona.nombre}.`, [
      'cliente_registrado',
      'cliente_anonimo',
    ]);
    return true;
  }

  vincularMesa(numeroMesa: number): boolean {
    const mesa = this.mesas().find((item) => item.numero === numeroMesa);
    const asignacion = this.espera().find((item) => item.mesaAsignada !== undefined);
    if (
      !mesa ||
      !asignacion ||
      this.mesaVinculada() !== null ||
      asignacion.mesaAsignada !== numeroMesa
    ) {
      return false;
    }
    this.mesaVinculada.set(numeroMesa);
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

  /** Punto 13: el pedido rechazado vuelve al carrito para modificarlo y reenviarlo. */
  retomarPedidoRechazado(): boolean {
    const pedido = this.pedidoActivo();
    if (pedido.estado !== 'rechazado') return false;
    const carrito = carritoDesdePedido(pedido, this.productos());
    this.carrito.set(carrito);
    return carrito.length > 0;
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
      momento: Date.now(),
      items: this.carrito(),
      estado: 'pendiente_confirmacion',
      motivoRechazo: '',
      descuentoPorJuego: this.descuento(),
      sectores: sectoresSinEmpezar(this.carrito()),
    };
    this.pedidoActivo.set(pedido);
    this.carrito.set([]);
    this.notificar(`Nuevo pedido de la mesa ${mesa}.`, ['mozo']);
    return true;
  }

  /** Punto 13: el mozo rechaza un pedido que esperaba su confirmación. */
  rechazarPedido(pedidoId: string, motivo: string): boolean {
    if (!this.cambiarPedidoPendiente(pedidoId, { estado: 'rechazado', motivoRechazo: motivo })) {
      return false;
    }
    this.notificar(`Pedido rechazado: ${motivo}`, ['cliente_registrado', 'cliente_anonimo']);
    return true;
  }

  /** Punto 14: el mozo confirma un pedido y lo deriva a cocina y bar. */
  confirmarPedido(pedidoId: string): boolean {
    if (!this.cambiarPedidoPendiente(pedidoId, { estado: 'confirmado', motivoRechazo: '' })) {
      return false;
    }
    this.notificar('Pedido confirmado y derivado a cocina y bar.', ['cocinero', 'cantinero']);
    return true;
  }

  private cambiarPedidoPendiente(pedidoId: string, cambios: Partial<PedidoDemo>): boolean {
    const pedido = [this.pedidoActivo(), ...this.otrosPedidos()].find((p) => p.id === pedidoId);
    if (!pedido || pedido.estado !== 'pendiente_confirmacion') return false;
    if (pedido.id === this.pedidoActivo().id) this.actualizarPedido(cambios);
    else
      this.otrosPedidos.update((pedidos) =>
        pedidos.map((p) => (p.id === pedidoId ? { ...p, ...cambios } : p)),
      );
    return true;
  }

  /** El sector empieza su parte (punto 18): el cliente pasa a ver «en preparación». */
  empezarSector(pedidoId: string, sector: SectorProducto): boolean {
    return this.avanzarSector(pedidoId, sector, 'en_preparacion');
  }

  /**
   * El sector terminó su parte. Si era la última, el pedido queda
   * completo y se avisa al mozo UNA vez: el aviso sale en la transición,
   * no cada vez que alguien toca el botón (punto 18).
   */
  marcarSectorListo(pedidoId: string, sector: SectorProducto): boolean {
    return this.avanzarSector(pedidoId, sector, 'listo');
  }

  private avanzarSector(
    pedidoId: string,
    sector: SectorProducto,
    hasta: Extract<EstadoSector, 'en_preparacion' | 'listo'>,
  ): boolean {
    const pedido = [this.pedidoActivo(), ...this.otrosPedidos()].find((p) => p.id === pedidoId);
    if (
      !pedido ||
      !['confirmado', 'en_preparacion'].includes(pedido.estado) ||
      pedido.sectores[sector] === 'sin_items' ||
      pedido.sectores[sector] === 'listo'
    )
      return false;
    // Marcar listo sin haber tocado «Empezar» también vale: el cocinero
    // puede tener algo que sale al instante. Lo que no se permite es
    // volver atrás.
    if (hasta === 'en_preparacion' && pedido.sectores[sector] !== 'pendiente') return false;

    const sectores = { ...pedido.sectores, [sector]: hasta };
    const completo = pedidoCompleto(sectores);
    const cambios: Partial<PedidoDemo> = {
      sectores,
      estado: completo ? 'listo' : 'en_preparacion',
    };
    if (pedido.id === this.pedidoActivo().id) this.actualizarPedido(cambios);
    else
      this.otrosPedidos.update((pedidos) =>
        pedidos.map((p) => (p.id === pedidoId ? { ...p, ...cambios } : p)),
      );
    if (completo) {
      this.notificar(`Pedido completo de la mesa ${pedido.mesa}: listo para entregar.`, ['mozo']);
    }
    return true;
  }

  /** Punto 19: el mozo entrega un pedido completo, y solo si está listo. */
  marcarEntregado(pedidoId: string): boolean {
    const pedido = [this.pedidoActivo(), ...this.otrosPedidos()].find((p) => p.id === pedidoId);
    if (!pedido || pedido.estado !== 'listo') return false;
    if (pedido.id === this.pedidoActivo().id) this.actualizarPedido({ estado: 'entregado' });
    else
      this.otrosPedidos.update((pedidos) =>
        pedidos.map((p) => (p.id === pedidoId ? { ...p, estado: 'entregado' } : p)),
      );
    this.notificar('El pedido fue entregado. Confirmá la recepción.', [
      'cliente_registrado',
      'cliente_anonimo',
    ]);
    return true;
  }

  /** Punto 19: el cliente confirma que recibió su pedido, una vez y ya entregado. */
  confirmarRecepcion(): boolean {
    if (this.pedidoActivo().estado !== 'entregado') return false;
    this.actualizarPedido({ estado: 'recibido' });
    return true;
  }

  /** En la demostración hay una sola mesa conversando: la 2. */
  agregarMensaje(texto: string, deCliente: boolean): void {
    this.mensajes.update((mensajes) => [
      ...mensajes,
      {
        id: 'mensaje-' + Date.now(),
        autor: 'Vos',
        texto,
        fecha: this.ahora(),
        esPropio: true,
        sesionId: 'sesion-demo',
        mesa: 2,
        deCliente,
      },
    ]);
  }

  jugar(idJuego: string, gano: boolean): number {
    const intentos = this.intentosJuego();
    const intentoActual = (intentos[idJuego] ?? 0) + 1;
    this.intentosJuego.set({ ...intentos, [idJuego]: intentoActual });
    if (gano && intentoActual === 1 && this.descuento() === 0) {
      const beneficios: Record<string, number> = { memoria: 10, adivinanza: 15, piedra: 20 };
      this.descuento.set(beneficios[idJuego] ?? 10);
    }
    return intentoActual;
  }

  /** Punto 20: la encuesta se guarda una vez y solo si todas las respuestas son válidas. */
  responderEncuesta(respuestas: RespuestasDeEncuesta): string | null {
    if (this.encuestaRespondida()) return 'Ya respondiste la encuesta de esta estadía.';
    for (const pregunta of this.preguntas()) {
      const error = errorDeRespuesta(pregunta, respuestas[pregunta.id]);
      if (error) return `${pregunta.texto} ${error}`;
    }
    this.encuestaRespondida.set(true);
    this.notificar('Encuesta guardada. Gracias por tu opinión.', ['cliente_registrado']);
    return null;
  }

  /** Punto 21: el cliente pide la cuenta. Si ya la pidió, no pasa nada. */
  solicitarCuenta(): boolean {
    if (this.cuenta()) return true;
    if (this.pedidoActivo().estado !== 'recibido') return false;
    this.cuenta.set({
      id: 'cuenta-demo',
      mesa: this.pedidoActivo().mesa,
      subtotal: 0,
      descuento: 0,
      porcentajeDescuento: 0,
      porcentajePropina: null,
      propina: 0,
      total: 0,
      estado: 'solicitada',
    });
    this.notificar(`La mesa ${this.pedidoActivo().mesa} pide la cuenta.`, ['mozo']);
    return true;
  }

  /** Punto 21: con el QR de propina se arma el detalle. Se puede cambiar antes de pagar. */
  generarCuenta(porcentaje: number): boolean {
    const cuenta = this.cuenta();
    if (!cuenta || (cuenta.estado !== 'solicitada' && cuenta.estado !== 'pendiente_pago')) {
      return false;
    }
    const pedido = this.pedidoActivo();
    const subtotal = pedido.items.reduce((total, item) => total + item.precio * item.cantidad, 0);
    const descuento = Math.round(subtotal * (pedido.descuentoPorJuego / 100));
    const base = subtotal - descuento;
    const propina = Math.round(base * (porcentaje / 100));
    this.cuenta.set({
      ...cuenta,
      subtotal,
      descuento,
      porcentajeDescuento: pedido.descuentoPorJuego,
      porcentajePropina: porcentaje,
      propina,
      total: base + propina,
      estado: 'pendiente_pago',
    });
    return true;
  }

  /** Punto 21: el pago simulado; avisa al mozo, al dueño y al supervisor. */
  pagarCuenta(): boolean {
    const cuenta = this.cuenta();
    if (!cuenta || cuenta.estado !== 'pendiente_pago') return false;
    this.cuenta.set({ ...cuenta, estado: 'pagada' });
    this.notificar(`La mesa ${cuenta.mesa} pagó. Confirmá el pago.`, [
      'mozo',
      'dueno',
      'supervisor',
    ]);
    return true;
  }

  /** Punto 22: el mozo confirma esa cuenta y la mesa queda libre. */
  confirmarPago(cuentaId: string): boolean {
    const cuenta = this.cuenta();
    if (!cuenta || cuenta.id !== cuentaId || cuenta.estado !== 'pagada') return false;
    this.cuenta.set({ ...cuenta, estado: 'confirmada' });
    this.mesas.update((mesas) =>
      mesas.map((mesa) => (mesa.numero === cuenta.mesa ? { ...mesa, disponible: true } : mesa)),
    );
    this.mesaVinculada.set(null);
    this.notificar(`Pago confirmado. La mesa ${cuenta.mesa} quedó libre.`, ['dueno', 'supervisor']);
    return true;
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
    const fotosPorNombre: Readonly<Record<string, string>> = {
      'Hamburguesa TUMBO': 'imagenes/tumbito/carne.webp',
      'Ravioles de la abuela': 'imagenes/tumbito/fideos.webp',
      'Ensalada fresca': 'imagenes/tumbito/ensalada.webp',
      'Papas crocantes': 'imagenes/tumbito/pizza.webp',
      'Taco de vegetales': 'imagenes/tumbito/ensalada.webp',
      'Limonada de la casa': 'imagenes/tumbito/sopa.webp',
      'TUMBO Spritz': 'imagenes/tumbito/vino.webp',
      Gaseosa: 'imagenes/tumbito/vino.webp',
      'Agua mineral': 'imagenes/tumbito/vino.webp',
      'Café de especialidad': 'imagenes/tumbito/cafe.webp',
    };
    return [
      [
        'Hamburguesa TUMBO',
        'Carne, cheddar, cebolla caramelizada y salsa de la casa.',
        'plato',
        'cocina',
        7800,
        18,
      ],
      [
        'Ravioles de la abuela',
        'Ravioles caseros con salsa pomodoro y albahaca.',
        'plato',
        'cocina',
        6900,
        22,
      ],
      [
        'Ensalada fresca',
        'Hojas verdes, tomates, queso y vinagreta cítrica.',
        'plato',
        'cocina',
        5200,
        12,
      ],
      [
        'Papas crocantes',
        'Papas doradas con especias y aderezo TUMBO.',
        'plato',
        'cocina',
        3500,
        10,
      ],
      [
        'Taco de vegetales',
        'Tortilla de maíz, vegetales grillados y guacamole.',
        'plato',
        'cocina',
        6100,
        16,
      ],
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
      fotos: [fotosPorNombre[nombre as string] ?? 'imagenes/logo.png'],
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
      fotoUrl: null,
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
      estado: 'aprobado' as const,
      fotoUrl: null,
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
    // Los ids de la carta se numeran en orden de aparición: se buscan por
    // nombre para que el pedido apunte a los productos de verdad.
    const carta = this.productosIniciales();
    const idDe = (nombre: string) => carta.find((p) => p.nombre === nombre)?.id ?? nombre;
    return {
      id: 'pedido-demo-1',
      mesa: 2,
      cliente: 'Camila Pérez',
      creadoEn: '26/08/2026 20:18',
      momento: new Date(2026, 7, 26, 20, 18).getTime(),
      items: [
        {
          productoId: idDe('Hamburguesa TUMBO'),
          nombre: 'Hamburguesa TUMBO',
          cantidad: 2,
          precio: 7800,
          sector: 'cocina',
          minutos: 18,
        },
        {
          productoId: idDe('Limonada de la casa'),
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
      sectores: { cocina: 'pendiente', bar: 'pendiente' },
    };
  }

  /**
   * Dos mesas más con pedidos en curso, en distintos momentos del punto
   * 18: una recién confirmada y otra con el bar ya terminado. Así se ve
   * la agrupación por mesa y el orden por antigüedad sin cargar nada.
   */
  private otrosPedidosIniciales(): PedidoDemo[] {
    const pedido = (
      id: string,
      mesa: number,
      momento: Date,
      items: PedidoItemDemo[],
      sectores: Record<SectorProducto, EstadoSector>,
    ): PedidoDemo => ({
      id,
      mesa,
      cliente: 'Cliente de la mesa',
      creadoEn: formatearFechaHora(momento),
      momento: momento.getTime(),
      items,
      estado: Object.values(sectores).some((e) => e !== 'pendiente' && e !== 'sin_items')
        ? 'en_preparacion'
        : 'confirmado',
      motivoRechazo: '',
      descuentoPorJuego: 0,
      sectores,
    });
    const item = (
      productoId: string,
      nombre: string,
      cantidad: number,
      sector: SectorProducto,
    ): PedidoItemDemo => ({ productoId, nombre, cantidad, precio: 0, sector, minutos: 0 });

    return [
      pedido(
        'pedido-demo-4',
        4,
        new Date(2026, 7, 26, 20, 5),
        [
          item('plato-2', 'Ravioles de la abuela', 2, 'cocina'),
          item('plato-3', 'Ensalada fresca', 1, 'cocina'),
          item('bebida-3', 'Gaseosa', 3, 'bar'),
        ],
        { cocina: 'en_preparacion', bar: 'listo' },
      ),
      pedido(
        'pedido-demo-5',
        5,
        new Date(2026, 7, 26, 20, 31),
        [
          item('plato-4', 'Papas crocantes', 1, 'cocina'),
          item('bebida-2', 'TUMBO Spritz', 2, 'bar'),
        ],
        { cocina: 'pendiente', bar: 'pendiente' },
      ),
    ];
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
