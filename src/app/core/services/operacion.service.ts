import { DestroyRef, Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Tablas } from '../models/base-de-datos';
import {
  AltaClienteDemo, AltaEmpleadoDemo, AltaMesaDemo, AltaProductoDemo, ClientePendienteDemo,
  CuentaDemo, EstadoPedido, MensajeDemo, MesaDemo, NotificacionDemo, PedidoDemo,
  PedidoItemDemo, PersonaEsperaDemo, ProductoDemo, SectorProducto, TipoMesa, TipoProducto,
} from '../models/demo-restaurante';
import { PerfilUsuario, Usuario, etiquetaDePerfil } from '../models/usuario';
import { DemoRestauranteService } from './demo-restaurante.service';
import { exigirCliente, supabaseConfigurado } from './supabase.client';
import { SesionService } from './sesion.service';

type Sesion = Tablas<'sesiones_mesa'>;
type Pedido = Tablas<'pedidos'>;
type Item = Tablas<'pedido_items'>;
type Producto = Tablas<'productos'>;
type Resultado = { ok: boolean; error?: string };

/** Persistencia de la pantalla Operaciones. El mock se conserva solo para el modo sin configuración. */
@Injectable({ providedIn: 'root' })
export class OperacionService {
  private readonly mock = inject(DemoRestauranteService);
  private readonly sesion = inject(SesionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cliente: SupabaseClient | null = supabaseConfigurado ? (exigirCliente() as unknown as SupabaseClient) : null;
  private canal: ReturnType<NonNullable<typeof this.cliente>['channel']> | null = null;
  private sesionActiva: Sesion | null = null;
  private pedidoReal: Pedido | null = null;
  private cuentaReal: Tablas<'cuentas'> | null = null;
  private readonly clientePorEspera = new Map<string, string>();
  private productosPorId = new Map<string, Producto>();

  readonly productos = signal<ProductoDemo[]>([]);
  readonly mesas = signal<MesaDemo[]>([]);
  readonly empleados = signal<Usuario[]>([]);
  readonly clientes = signal<ClientePendienteDemo[]>([]);
  readonly espera = signal<PersonaEsperaDemo[]>([]);
  readonly pedidoActivo = signal<PedidoDemo>(this.pedidoVacio());
  readonly carrito = signal<PedidoItemDemo[]>([]);
  readonly mensajes = signal<MensajeDemo[]>([]);
  readonly notificaciones = signal<NotificacionDemo[]>([]);
  readonly descuento = signal(0);
  readonly intentosJuego = signal<Record<string, number>>({});
  readonly encuestaRespondida = signal(false);
  readonly porcentajePropina = signal<number | null>(null);
  readonly cuenta = signal<CuentaDemo | null>(null);
  readonly mesaVinculada = signal<number | null>(null);
  readonly clientesPendientes = computed(() => this.clientes().filter((c) => c.estado === 'pendiente'));
  readonly totalCarrito = computed(() => this.carrito().reduce((t, i) => t + i.precio * i.cantidad, 0));
  readonly tiempoCarrito = computed(() => this.carrito().reduce((t, i) => Math.max(t, i.minutos), 0));
  readonly productosCocina = computed(() => this.productos().filter((p) => p.sector === 'cocina'));
  readonly productosBar = computed(() => this.productos().filter((p) => p.sector === 'bar'));

  constructor() {
    this.destroyRef.onDestroy(() => { if (this.canal && this.cliente) void this.cliente.removeChannel(this.canal); });
    if (this.cliente) void this.cargar();
  }

  async cargar(): Promise<void> {
    if (!this.cliente) return;
    try {
      const usuario = this.sesion.usuario();
      if (!usuario) return;
      const [productos, fotos, mesas, usuarios, espera, sesiones, mensajes, notificaciones] = await Promise.all([
        this.cliente.from('productos').select('*').eq('activo', true).order('nombre'),
        this.cliente.from('producto_fotos').select('*').order('orden'),
        this.cliente.from('mesas').select('*').order('numero'),
        this.cliente.from('usuarios').select('*').order('apellidos'),
        this.cliente.from('lista_espera').select('*').neq('estado', 'eliminado').order('creado_en'),
        this.cliente.from('sesiones_mesa').select('*').in('estado', ['activa', 'cuenta_solicitada', 'pagada']).order('abierta_en', { ascending: false }),
        this.cliente.from('mensajes').select('*').order('enviado_en'),
        this.cliente.from('notificaciones').select('*').eq('usuario_id', usuario.id).order('enviada_en', { ascending: false }).limit(1),
      ]);
      this.validar(productos.error, 'productos'); this.validar(mesas.error, 'mesas');
      if (productos.data) {
        this.productosPorId = new Map(productos.data.map((p) => [p.id, p]));
        const fotosPorProducto = new Map<string, string[]>();
        for (const foto of fotos.data ?? []) fotosPorProducto.set(foto.producto_id, [...(fotosPorProducto.get(foto.producto_id) ?? []), foto.url]);
        this.productos.set(productos.data.map((p) => this.aProducto(p, fotosPorProducto.get(p.id) ?? [])));
      }
      if (mesas.data) this.mesas.set(mesas.data.map((m) => this.aMesa(m)));
      if (usuarios.data) this.cargarUsuarios(usuarios.data, usuario);
      if (espera.data) await this.cargarEspera(espera.data);
      if (notificaciones.data) this.notificaciones.set(notificaciones.data.map(this.aNotificacion));
      this.sesionActiva = this.elegirSesion(sesiones.data ?? [], usuario);
      this.mesaVinculada.set(this.mesas().find((m) => m.id === this.sesionActiva?.mesa_id)?.numero ?? null);
      await this.cargarPedidoYCuenta();
      if (mensajes.data) this.mensajes.set(mensajes.data.map((m) => this.aMensaje(m, usuario.id)));
      this.suscribirRealtime();
    } catch (error) { this.registrarError('cargar Operaciones', error); }
  }

  async registrarEmpleado(d: AltaEmpleadoDemo): Promise<Resultado> {
    if (!this.cliente) { this.mock.registrarEmpleado(d); return { ok: true }; }
    return this.insertar('usuarios', { id: crypto.randomUUID(), nombres: d.nombres, apellidos: d.apellidos, dni: d.dni.replace(/\D/g, ''), cuil: d.cuil, correo: d.correo.trim().toLowerCase(), perfil: d.perfil, estado: 'aprobado' });
  }
  async registrarProducto(d: AltaProductoDemo): Promise<Resultado> {
    if (!this.cliente) { this.mock.registrarProducto(d); return { ok: true }; }
    const usuario = this.sesion.usuario();
    return this.insertar('productos', { nombre: d.nombre, descripcion: d.descripcion, tipo: d.tipo, sector: d.tipo === 'plato' ? 'cocina' : 'bar', precio: d.precio, tiempo_elaboracion_min: d.minutos, creado_por: usuario?.id ?? null });
  }
  async registrarMesa(d: AltaMesaDemo): Promise<Resultado> {
    if (!this.cliente) return { ok: this.mock.registrarMesa(d) };
    return this.insertar('mesas', { numero: d.numero, cantidad_comensales: d.comensales, tipo: this.tipoMesa(d.tipo) });
  }
  async registrarCliente(d: AltaClienteDemo): Promise<Resultado> {
    if (!this.cliente) { this.mock.registrarCliente(d); return { ok: true }; }
    return this.insertar('usuarios', { id: crypto.randomUUID(), nombres: d.nombres, apellidos: d.apellidos, dni: d.dni.replace(/\D/g, ''), correo: d.correo.trim().toLowerCase(), perfil: 'cliente_registrado', estado: 'pendiente' });
  }
  async resolverCliente(id: string, estado: 'aprobado' | 'rechazado'): Promise<Resultado> {
    if (!this.cliente) { this.mock.resolverCliente(id, estado); return { ok: true }; }
    return this.actualizar('usuarios', id, { estado });
  }
  async cambiarDisponibilidadMesa(numero: number): Promise<Resultado> {
    if (!this.cliente) { this.mock.cambiarDisponibilidadMesa(numero); return { ok: true }; }
    const mesa = this.mesas().find((m) => m.numero === numero);
    return mesa ? this.actualizar('mesas', mesa.id, { estado: mesa.disponible ? 'ocupada' : 'libre' }) : { ok: false, error: 'Mesa inexistente.' };
  }
  async anotarEnEspera(nombre: string): Promise<Resultado> {
    if (!this.cliente) { this.mock.anotarEnEspera(nombre); return { ok: true }; }
    const id = this.sesion.usuario()?.id;
    return id ? this.insertar('lista_espera', { cliente_id: id }) : { ok: false, error: 'No hay sesión activa.' };
  }
  async eliminarDeEspera(id: string): Promise<Resultado> {
    if (!this.cliente) { this.mock.eliminarDeEspera(id); return { ok: true }; }
    return this.actualizar('lista_espera', id, { estado: 'eliminado', mesa_id: null, asignado_en: null });
  }
  async asignarMesa(idEspera: string, numero: number): Promise<Resultado> {
    if (!this.cliente) return { ok: this.mock.asignarMesa(idEspera, numero) };
    const mesa = this.mesas().find((m) => m.numero === numero);
    if (!mesa || !mesa.disponible) return { ok: false, error: 'Esa mesa no está disponible.' };
    const r = await this.actualizar('lista_espera', idEspera, { estado: 'asignado', mesa_id: mesa.id, asignado_en: new Date().toISOString() });
    if (!r.ok) return r;
    await this.actualizar('mesas', mesa.id, { estado: 'ocupada' });
    const espera = this.espera().find((e) => e.id === idEspera);
    const clienteId = espera ? this.clientePorEspera.get(espera.id) : undefined;
    if (clienteId) await this.insertar('sesiones_mesa', { mesa_id: mesa.id, cliente_id: clienteId, comensales: mesa.comensales });
    return { ok: true };
  }
  vincularMesa(numero: number): boolean { return this.mesaVinculada() === numero; }
  agregarAlCarrito(p: ProductoDemo): void { this.carrito.update((items) => { const old = items.find((i) => i.productoId === p.id); return old ? items.map((i) => i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i) : [...items, { productoId: p.id, nombre: p.nombre, cantidad: 1, precio: p.precio, sector: p.sector, minutos: p.minutos }]; }); }
  quitarDelCarrito(id: string): void { this.carrito.update((items) => items.map((i) => i.productoId === id ? { ...i, cantidad: i.cantidad - 1 } : i).filter((i) => i.cantidad > 0)); }
  async enviarPedido(): Promise<Resultado> {
    if (!this.cliente) { const u = this.sesion.usuario(); return { ok: this.mock.enviarPedido(u ? `${u.nombres} ${u.apellidos}` : 'Cliente', this.mesaVinculada() ?? 2) }; }
    if (!this.sesionActiva || !this.carrito().length) return { ok: false, error: 'No hay mesa o productos seleccionados.' };
    const p = await this.insertarConFila('pedidos', { sesion_mesa_id: this.sesionActiva.id, estado: 'pendiente_confirmacion' });
    const pedidoCreado = p.fila;
    if (!p.ok || !pedidoCreado) return p;
    const items = this.carrito().map((i) => ({ pedido_id: pedidoCreado.id, producto_id: i.productoId, cantidad: i.cantidad, precio_unitario: i.precio, sector: i.sector }));
    const { error } = await this.cliente.from('pedido_items').insert(items); if (error) return this.fallo('crear ítems del pedido', error);
    this.carrito.set([]); await this.cargarPedidoYCuenta(); return { ok: true };
  }
  async rechazarPedido(motivo: string): Promise<Resultado> { return this.cambiarEstadoPedido('rechazado', { motivo_rechazo: motivo }); }
  async confirmarPedido(): Promise<Resultado> { return this.cambiarEstadoPedido('confirmado', { motivo_rechazo: null }); }
  async marcarSectorListo(sector: SectorProducto): Promise<Resultado> {
    if (!this.cliente) { this.mock.marcarSectorListo(sector); return { ok: true }; }
    if (!this.pedidoReal) return { ok: false, error: 'No hay pedido activo.' };
    const { error } = await this.cliente.from('pedido_items').update({ estado: 'listo', listo_en: new Date().toISOString() }).eq('pedido_id', this.pedidoReal.id).eq('sector', sector);
    if (error) return this.fallo('marcar sector listo', error); await this.cargarPedidoYCuenta(); return { ok: true };
  }
  async marcarEntregado(): Promise<Resultado> { return this.cambiarEstadoPedido('entregado'); }
  async confirmarRecepcion(): Promise<Resultado> { return this.cambiarEstadoPedido('recibido'); }
  async agregarMensaje(autor: string, texto: string, propio: boolean): Promise<Resultado> {
    if (!this.cliente) { this.mock.agregarMensaje(autor, texto, propio); return { ok: true }; }
    return this.sesionActiva && this.sesion.usuario() ? this.insertar('mensajes', { sesion_mesa_id: this.sesionActiva.id, autor_id: this.sesion.usuario()!.id, tipo: propio ? 'consulta' : 'respuesta', cuerpo: texto }) : { ok: false, error: 'No hay estadía activa.' };
  }
  async jugar(id: string, gano: boolean): Promise<{ ok: boolean; intento: number; descuento: number }> {
    if (!this.cliente) { const intento = this.mock.jugar(id, gano); return { ok: true, intento, descuento: this.mock.descuento() }; }
    if (!this.sesionActiva || this.sesion.usuario()?.perfil !== 'cliente_registrado') return { ok: false, intento: 0, descuento: 0 };
    const { data: juego } = await this.cliente.from('juegos').select('*').ilike('nombre', `%${id}%`).maybeSingle();
    if (!juego) return { ok: false, intento: 0, descuento: 0 };
    const { count } = await this.cliente.from('partidas_juego').select('*', { count: 'exact', head: true }).eq('sesion_mesa_id', this.sesionActiva.id).eq('juego_id', juego.id);
    const intento = (count ?? 0) + 1; const descuento = gano && intento === 1 ? juego.porcentaje_descuento : 0;
    const r = await this.insertar('partidas_juego', { juego_id: juego.id, sesion_mesa_id: this.sesionActiva.id, cliente_id: this.sesion.usuario()!.id, intento, gano, descuento_otorgado: descuento });
    if (r.ok && descuento) this.descuento.set(descuento); return { ok: r.ok, intento, descuento: this.descuento() };
  }
  seleccionarPropina(p: number): void { this.porcentajePropina.set(p); }
  async registrarEncuesta(): Promise<Resultado> { if (!this.cliente) { return { ok: this.mock.registrarEncuesta() }; } return this.sesionActiva && this.sesion.usuario() ? this.insertar('encuestas', { sesion_mesa_id: this.sesionActiva.id, cliente_id: this.sesion.usuario()!.id }) : { ok: false, error: 'No hay estadía activa.' }; }
  async generarCuenta(): Promise<Resultado> {
    if (!this.cliente) return { ok: this.mock.generarCuenta() }; const p = this.porcentajePropina();
    if (!this.sesionActiva || p === null) return { ok: false, error: 'Seleccioná una propina antes de generar la cuenta.' };
    const calculo = await this.cliente.rpc('calcular_cuenta', { p_sesion_id: this.sesionActiva.id }); if (calculo.error || !calculo.data?.[0]) return this.fallo('calcular la cuenta', calculo.error);
    const c = calculo.data[0]; const propina = Math.round((c.base * p) / 100); const nivel = ({ 20: 'excelente', 15: 'muy_bueno', 10: 'bueno', 5: 'regular', 0: 'malo' } as const)[p as 0 | 5 | 10 | 15 | 20];
    const r = await this.insertar('cuentas', { sesion_mesa_id: this.sesionActiva.id, subtotal: c.subtotal, descuento_pct: c.descuento_pct, descuento_monto: c.descuento_monto, nivel_propina: nivel, propina_pct: p, propina_monto: propina, total: c.base + propina }); if (r.ok) await this.cargarPedidoYCuenta(); return r;
  }
  async pagarCuenta(): Promise<Resultado> { return this.actualizarCuenta('pagada'); }
  async confirmarPago(): Promise<Resultado> { return this.actualizarCuenta('confirmada'); }

  private async cambiarEstadoPedido(estado: 'rechazado' | 'confirmado' | 'entregado' | 'recibido', extra: Record<string, unknown> = {}): Promise<Resultado> { if (!this.cliente) { if (estado === 'rechazado') this.mock.rechazarPedido(String(extra['motivo_rechazo'] ?? '')); else if (estado === 'confirmado') this.mock.confirmarPedido(); else if (estado === 'entregado') this.mock.marcarEntregado(); else this.mock.confirmarRecepcion(); return { ok: true }; } const estadoReal = estado === 'recibido' ? 'pagado' : estado; return this.pedidoReal ? this.actualizar('pedidos', this.pedidoReal.id, { estado: estadoReal, ...extra }) : { ok: false, error: 'No hay pedido activo.' }; }
  private async actualizarCuenta(estado: 'pagada' | 'confirmada'): Promise<Resultado> { if (!this.cliente) { if (estado === 'pagada') this.mock.pagarCuenta(); else this.mock.confirmarPago(); return { ok: true }; } const c = this.cuentaReal; return c ? this.actualizar('cuentas', c.id, { estado, ...(estado === 'pagada' ? { pagada_en: new Date().toISOString() } : { confirmada_en: new Date().toISOString() }) }) : { ok: false, error: 'No hay cuenta activa.' }; }
  private async cargarPedidoYCuenta(): Promise<void> { if (!this.cliente || !this.sesionActiva) return; const q = await this.cliente.from('pedidos').select('*').eq('sesion_mesa_id', this.sesionActiva.id).order('creado_en', { ascending: false }).limit(1).maybeSingle(); if (q.error) { this.registrarError('cargar pedido', q.error); return; } this.pedidoReal = q.data; if (q.data) { const i = await this.cliente.from('pedido_items').select('*').eq('pedido_id', q.data.id); this.pedidoActivo.set(this.aPedido(q.data, i.data ?? [])); } const c = await this.cliente.from('cuentas').select('*').eq('sesion_mesa_id', this.sesionActiva.id).maybeSingle(); this.cuentaReal = c.data; if (!c.error) this.cuenta.set(c.data ? { subtotal: c.data.subtotal, descuento: c.data.descuento_monto, porcentajePropina: c.data.propina_pct ?? 0, propina: c.data.propina_monto, total: c.data.total, estado: c.data.estado === 'pendiente' ? 'pendiente_pago' : c.data.estado } : null); }
  private suscribirRealtime(): void { if (!this.cliente || this.canal) return; this.canal = this.cliente.channel('operacion-compartida').on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => void this.cargar()).on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => void this.cargar()).on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, () => void this.cargar()).on('postgres_changes', { event: '*', schema: 'public', table: 'lista_espera' }, () => void this.cargar()).on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes' }, () => void this.cargar()).subscribe(); }
  private cargarUsuarios(filas: Tablas<'usuarios'>[], actual: Usuario): void { this.empleados.set(filas.filter((f) => ['cocinero', 'cantinero', 'mozo'].includes(f.perfil)).map(this.aUsuario)); this.clientes.set(filas.filter((f) => ['cliente_registrado', 'cliente_anonimo'].includes(f.perfil)).map((f) => ({ id: f.id, nombres: f.nombres, apellidos: f.apellidos ?? '', dni: f.dni ?? '', correo: f.correo ?? '', foto: f.foto_url ?? 'imagenes/logo.png', estado: f.estado }))); if (!this.empleados().some((e) => e.id === actual.id) && actual.perfil !== 'dueno') this.empleados.update((e) => [...e, actual]); }
  private async cargarEspera(filas: Tablas<'lista_espera'>[]): Promise<void> { const ids = filas.map((f) => f.cliente_id); if (!this.cliente || !ids.length) { this.espera.set([]); return; } const { data } = await this.cliente.from('usuarios').select('*').in('id', ids); const usuarios = new Map((data ?? []).map((u) => [u.id, u])); this.clientePorEspera.clear(); for (const f of filas) this.clientePorEspera.set(f.id, f.cliente_id); this.espera.set(filas.map((f) => ({ id: f.id, nombre: `${usuarios.get(f.cliente_id)?.nombres ?? 'Cliente'} ${usuarios.get(f.cliente_id)?.apellidos ?? ''}`.trim(), foto: usuarios.get(f.cliente_id)?.foto_url ?? 'imagenes/logo.png', fecha: new Date(f.creado_en).toLocaleString('es-AR'), mesaAsignada: this.mesas().find((m) => m.id === f.mesa_id)?.numero }))); }
  private elegirSesion(s: Sesion[], u: Usuario): Sesion | null { return s.find((x) => x.cliente_id === u.id) ?? s[0] ?? null; }
  private aProducto(p: Producto, fotos: string[]): ProductoDemo { return { id: p.id, nombre: p.nombre, descripcion: p.descripcion, tipo: p.tipo as TipoProducto, sector: p.sector, precio: Number(p.precio), minutos: p.tiempo_elaboracion_min, fotos: fotos.length ? fotos : ['imagenes/logo.png'] }; }
  private aMesa(m: Tablas<'mesas'>): MesaDemo { return { id: m.id, numero: m.numero, comensales: m.cantidad_comensales, tipo: this.tipoDemo(m.tipo), disponible: m.estado === 'libre', qrToken: m.qr_token }; }
  private aUsuario(f: Tablas<'usuarios'>): Usuario { return { id: f.id, nombres: f.nombres, apellidos: f.apellidos ?? '', correo: f.correo ?? '', perfil: f.perfil, etiquetaPerfil: etiquetaDePerfil(f.perfil), estado: f.estado, fotoUrl: f.foto_url }; }
  private aPedido(p: Pedido, items: Item[]): PedidoDemo { return { id: p.id, mesa: this.mesas().find((m) => m.id === this.sesionActiva?.mesa_id)?.numero ?? 0, cliente: 'Cliente de la mesa', creadoEn: new Date(p.creado_en).toLocaleString('es-AR'), items: items.map((i) => ({ productoId: i.producto_id, nombre: this.productosPorId.get(i.producto_id)?.nombre ?? 'Producto', cantidad: i.cantidad, precio: Number(i.precio_unitario), sector: i.sector, minutos: this.productosPorId.get(i.producto_id)?.tiempo_elaboracion_min ?? 0 })), estado: p.estado === 'pagado' ? 'recibido' : p.estado as EstadoPedido, motivoRechazo: p.motivo_rechazo ?? '', descuentoPorJuego: this.descuento(), sectoresListos: { cocina: items.filter((i) => i.sector === 'cocina').every((i) => i.estado === 'listo'), bar: items.filter((i) => i.sector === 'bar').every((i) => i.estado === 'listo') } }; }
  private aMensaje(m: Tablas<'mensajes'>, id: string): MensajeDemo { return { id: m.id, autor: m.autor_id === id ? 'Vos' : 'Equipo TUMBO', texto: m.cuerpo, fecha: new Date(m.enviado_en).toLocaleString('es-AR'), esPropio: m.autor_id === id }; }
  private aNotificacion = (n: Tablas<'notificaciones'>): NotificacionDemo => ({ id: n.id, mensaje: n.cuerpo, fecha: new Date(n.enviada_en).toLocaleString('es-AR'), destinatarios: [] });
  private tipoMesa(t: TipoMesa): Tablas<'mesas'>['tipo'] { return t === 'VIP' ? 'vip' : t === 'estándar' ? 'estandar' : 'movilidad_reducida'; }
  private tipoDemo(t: Tablas<'mesas'>['tipo']): TipoMesa { return t === 'vip' ? 'VIP' : t === 'estandar' ? 'estándar' : 'movilidad_reducida'; }
  private pedidoVacio(): PedidoDemo { return { id: '', mesa: 0, cliente: 'Sin pedido activo', creadoEn: '', items: [], estado: 'pendiente_confirmacion', motivoRechazo: '', descuentoPorJuego: 0, sectoresListos: { cocina: false, bar: false } }; }
  private validar(error: unknown, recurso: string): void { if (error) this.registrarError(`cargar ${recurso}`, error); }
  private async insertar<T extends keyof import('../models/base-de-datos').Database['public']['Tables']>(tabla: T, fila: import('../models/base-de-datos').Database['public']['Tables'][T]['Insert']): Promise<Resultado> { const r = await this.insertarConFila(tabla, fila); return { ok: r.ok, error: r.error }; }
  private async insertarConFila<T extends keyof import('../models/base-de-datos').Database['public']['Tables']>(tabla: T, fila: import('../models/base-de-datos').Database['public']['Tables'][T]['Insert']): Promise<{ ok: boolean; fila?: Tablas<T>; error?: string }> { if (!this.cliente) return { ok: false }; const r = await this.cliente.from(tabla).insert(fila).select().single(); return r.error || !r.data ? { ok: false, error: this.fallo('guardar datos', r.error).error } : { ok: true, fila: r.data as Tablas<T> }; }
  private async actualizar<T extends keyof import('../models/base-de-datos').Database['public']['Tables']>(tabla: T, id: string, cambios: import('../models/base-de-datos').Database['public']['Tables'][T]['Update']): Promise<Resultado> { if (!this.cliente) return { ok: false }; const r = await this.cliente.from(tabla).update(cambios).eq('id', id); return r.error ? this.fallo(`actualizar ${String(tabla)}`, r.error) : { ok: true }; }
  private fallo(accion: string, error: unknown): Resultado { this.registrarError(accion, error); const mensaje = typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : ''; return { ok: false, error: mensaje.toLowerCase().includes('row-level') ? 'No tenés permisos para realizar esta operación.' : `No se pudo ${accion}. Revisá la conexión e intentá nuevamente.` }; }
  private registrarError(accion: string, error: unknown): void { console.error(`[TUMBO] Error al ${accion}`, error); }
}
