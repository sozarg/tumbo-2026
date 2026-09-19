import { DestroyRef, Injectable, inject, signal, computed, effect } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Tablas } from '../models/base-de-datos';
import {
  AltaClienteDemo,
  AltaEmpleadoDemo,
  AltaMesaDemo,
  AltaProductoDemo,
  ClientePendienteDemo,
  CuentaDemo,
  EstadoPedido,
  FotoDePersona,
  MensajeDemo,
  MesaDemo,
  NotificacionDemo,
  PedidoDemo,
  PedidoItemDemo,
  PersonaEsperaDemo,
  ProductoDemo,
  SectorProducto,
  TipoMesa,
  TipoProducto,
} from '../models/demo-restaurante';
import { PerfilUsuario, Usuario, etiquetaDePerfil } from '../models/usuario';
import { DemoRestauranteService } from './demo-restaurante.service';
import { exigirCliente, supabaseConfigurado } from './supabase.client';
import { SesionService } from './sesion.service';

type Sesion = Tablas<'sesiones_mesa'>;
type Pedido = Tablas<'pedidos'>;
type Item = Tablas<'pedido_items'>;
type Producto = Tablas<'productos'>;
/** Resultado confirmado; aviso agrega contexto sin sustituir un error de alta. */
type Resultado = { ok: boolean; error?: string; aviso?: string };

/** Persistencia de la pantalla Operaciones. El mock se conserva solo para el modo sin configuración. */
/**
 * Saca los puntos y los espacios del DNI: 43.210.987 → 43210987
 *
 * POR QUÉ
 * El constraint de la base es `dni ~ '^[0-9]{7,8}$'`: solo dígitos. Y
 * en Argentina el DNI se escribe con puntos, así que cualquiera lo va a
 * cargar así. Sin esto, la persona ve «El DNI tiene que ser de 7 u 8
 * dígitos, sin puntos» por haber escrito el número de la manera normal.
 *
 * POR QUÉ SOLO PUNTOS Y ESPACIOS, Y NO TODO LO QUE NO SEA UN DÍGITO
 * La primera versión de esto hacía `replace(/\D/g, '')`, que borra
 * cualquier cosa que no sea un número. Parece más prolijo y es peor:
 * `4321O987` —con la letra O en lugar del cero, un error de tipeo muy
 * común— se convertía en `4321987`, siete dígitos, un DNI VÁLIDO PERO
 * DE OTRA PERSONA. Se guardaba sin decir nada.
 *
 * Sacar solo lo que es separador visual deja que la letra sobreviva,
 * el CHECK de la base la rechace y la persona vea el error.
 *
 * El CUIL NO pasa por acá: su constraint sí acepta los guiones
 * (`^[0-9]{2}-?[0-9]{7,8}-?[0-9]$`), y sacárselos lo haría menos legible
 * en la base sin ganar nada.
 */
function normalizarDni(valor: string): string {
  return (valor ?? '').replace(/[.\s]/g, '');
}

/**
 * Los cuatro perfiles que son personal.
 *
 * Tienen que ser LOS MISMOS que acepta la Edge Function `crear-empleado`
 * y los mismos que ofrece el `<ion-select>` del alta. Antes esta lista
 * estaba escrita a mano adentro de `cargarUsuarios` y le faltaba
 * `metre`: se podía dar de alta un metre —el formulario lo ofrece— y
 * después no aparecía en el listado de personal. La cuenta existía y
 * era invisible.
 */
const PERFILES_DE_EMPLEADO: readonly PerfilUsuario[] = ['metre', 'mozo', 'cocinero', 'cantinero'];

/**
 * Deja el nombre del producto como se va a guardar.
 *
 * POR QUÉ SE NORMALIZA AL GUARDAR Y NO SOLO AL BUSCAR
 * La base tiene `constraint nombre_unico_por_tipo unique (tipo, nombre)`,
 * y ese único compara texto crudo: «Milanesa napolitana» y «Milanesa
 * napolitana » —con un espacio al final, invisible— son dos platos
 * distintos para PostgreSQL. Guardar siempre la forma canónica hace que
 * el único de la base signifique lo que uno cree que significa, y de
 * paso deja la carta prolija.
 *
 * No se saca el acento ni se baja a minúsculas: el nombre se muestra tal
 * cual en la carta, y «Té» no es «Te».
 */
export function comoSeGuarda(nombre: string): string {
  return (nombre ?? '').trim().replace(/\s+/g, ' ');
}

/**
 * Si dos nombres son el mismo plato para la carta.
 *
 * Compara sin distinguir mayúsculas, igual que el `ilike` con el que se
 * consulta la base. El único de PostgreSQL sí distingue —«milanesa» y
 * «Milanesa» pueden convivir—, y justamente por eso el control es más
 * estricto que la base y no al revés: una carta con las dos no es un
 * error de integridad, es una carta mal cargada.
 */
export function mismoNombre(uno: string, otro: string): boolean {
  return (
    comoSeGuarda(uno).toLocaleLowerCase('es-AR') === comoSeGuarda(otro).toLocaleLowerCase('es-AR')
  );
}

/**
 * Escapa los comodines de `ilike`.
 *
 * `%` y `_` son comodines: sin esto, buscar «Café 100% arábica» le
 * preguntaría a la base por cualquier nombre que empiece «Café 100» y
 * termine « arábica», y un plato distinto pasaría por repetido.
 */
export function paraIlike(texto: string): string {
  return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

/**
 * Cómo se nombra cada tipo en los mensajes, CON SU ARTÍCULO.
 *
 * No alcanza con guardar el sustantivo. La primera versión de esto
 * guardaba solo «plato» y «bebida», y los mensajes escribían el artículo
 * a mano: el cantinero veía «Ya hay UN BEBIDA con ese nombre en la
 * carta». En castellano el artículo cambia con el género y el enunciado
 * tiene los dos tipos, así que las formas se escriben acá una sola vez y
 * los mensajes las usan enteras.
 *
 * `ese` va en mayúscula porque siempre abre la oración.
 */
const COMO_SE_LLAMA: Readonly<
  Record<TipoProducto, { readonly un: string; readonly otro: string; readonly Ese: string }>
> = {
  plato: { un: 'un plato', otro: 'otro plato', Ese: 'Ese plato' },
  bebida: { un: 'una bebida', otro: 'otra bebida', Ese: 'Esa bebida' },
};

@Injectable({ providedIn: 'root' })
export class OperacionService {
  private readonly mock = inject(DemoRestauranteService);
  private readonly sesion = inject(SesionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cliente: SupabaseClient | null = supabaseConfigurado
    ? (exigirCliente() as unknown as SupabaseClient)
    : null;
  private readonly solicitudes = new Map<string, string>();
  private readonly enviandoAltas = new Set<string>();
  private canal: ReturnType<NonNullable<typeof this.cliente>['channel']> | null = null;
  private sesionActiva: Sesion | null = null;
  private pedidoReal: Pedido | null = null;
  private cuentaReal: Tablas<'cuentas'> | null = null;
  private readonly clientePorEspera = new Map<string, string>();
  private productosPorId = new Map<string, Producto>();

  readonly productos = this.cliente ? signal<ProductoDemo[]>([]) : this.mock.productos;
  readonly mesas = this.cliente ? signal<MesaDemo[]>([]) : this.mock.mesas;
  readonly empleados = this.cliente ? signal<Usuario[]>([]) : this.mock.empleados;
  readonly clientes = this.cliente ? signal<ClientePendienteDemo[]>([]) : this.mock.clientes;
  readonly espera = this.cliente ? signal<PersonaEsperaDemo[]>([]) : this.mock.espera;
  readonly pedidoActivo = this.cliente
    ? signal<PedidoDemo>(this.pedidoVacio())
    : this.mock.pedidoActivo;
  readonly carrito = this.cliente ? signal<PedidoItemDemo[]>([]) : this.mock.carrito;
  readonly mensajes = this.cliente ? signal<MensajeDemo[]>([]) : this.mock.mensajes;
  readonly notificaciones = this.cliente
    ? signal<NotificacionDemo[]>([])
    : this.mock.notificaciones;
  readonly descuento = this.cliente ? signal(0) : this.mock.descuento;
  readonly intentosJuego = this.cliente
    ? signal<Record<string, number>>({})
    : this.mock.intentosJuego;
  readonly encuestaRespondida = this.cliente ? signal(false) : this.mock.encuestaRespondida;
  readonly porcentajePropina = this.cliente
    ? signal<number | null>(null)
    : this.mock.porcentajePropina;
  readonly cuenta = this.cliente ? signal<CuentaDemo | null>(null) : this.mock.cuenta;
  readonly mesaVinculada = this.cliente ? signal<number | null>(null) : this.mock.mesaVinculada;
  readonly clientesPendientes = computed(() =>
    this.clientes().filter((c) => c.estado === 'pendiente'),
  );
  readonly totalCarrito = computed(() =>
    this.carrito().reduce((t, i) => t + i.precio * i.cantidad, 0),
  );
  readonly tiempoCarrito = computed(() =>
    this.carrito().reduce((t, i) => Math.max(t, i.minutos), 0),
  );
  readonly productosCocina = computed(() => this.productos().filter((p) => p.sector === 'cocina'));
  readonly productosBar = computed(() => this.productos().filter((p) => p.sector === 'bar'));

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.canal && this.cliente) void this.cliente.removeChannel(this.canal);
    });
    effect(() => {
      const usuario = this.sesion.usuario();
      this.solicitudes.clear();
      if (this.canal && this.cliente) void this.cliente.removeChannel(this.canal);
      this.canal = null;
      if (this.cliente) {
        this.empleados.set([]);
        this.productos.set([]);
        this.mesas.set([]);
      }
      if (usuario && this.cliente) void this.cargar();
    });
  }

  async cargar(): Promise<void> {
    if (!this.cliente) return;
    try {
      const usuario = this.sesion.usuario();
      if (!usuario) return;
      const [productos, fotos, mesas, usuarios, espera, sesiones, mensajes, notificaciones] =
        await Promise.all([
          this.cliente.from('productos').select('*').eq('activo', true).order('nombre'),
          this.cliente.from('producto_fotos').select('*').order('orden'),
          this.cliente.from('mesas').select('*').order('numero'),
          this.cliente.from('usuarios').select('*').order('apellidos'),
          this.cliente
            .from('lista_espera')
            .select('*')
            .neq('estado', 'eliminado')
            .order('creado_en'),
          this.cliente
            .from('sesiones_mesa')
            .select('*')
            .in('estado', ['activa', 'cuenta_solicitada', 'pagada'])
            .order('abierta_en', { ascending: false }),
          this.cliente.from('mensajes').select('*').order('enviado_en'),
          this.cliente
            .from('notificaciones')
            .select('*')
            .eq('usuario_id', usuario.id)
            .order('enviada_en', { ascending: false })
            .limit(1),
        ]);
      this.validar(productos.error, 'productos');
      this.validar(mesas.error, 'mesas');
      if (this.sesion.usuario()?.id !== usuario.id) return;
      if (productos.data) {
        this.productosPorId = new Map(productos.data.map((p) => [p.id, p]));
        const fotosPorProducto = new Map<string, string[]>();
        for (const foto of fotos.data ?? [])
          fotosPorProducto.set(foto.producto_id, [
            ...(fotosPorProducto.get(foto.producto_id) ?? []),
            foto.url,
          ]);
        this.productos.set(
          productos.data.map((p) => this.aProducto(p, fotosPorProducto.get(p.id) ?? [])),
        );
      }
      if (mesas.data) this.mesas.set(mesas.data.map((m) => this.aMesa(m)));
      if (usuarios.data) this.cargarUsuarios(usuarios.data, usuario);
      if (espera.data) await this.cargarEspera(espera.data);
      if (notificaciones.data) this.notificaciones.set(notificaciones.data.map(this.aNotificacion));
      this.sesionActiva = this.elegirSesion(sesiones.data ?? [], usuario);
      this.mesaVinculada.set(
        this.mesas().find((m) => m.id === this.sesionActiva?.mesa_id)?.numero ?? null,
      );
      await this.cargarPedidoYCuenta();
      if (mensajes.data) this.mensajes.set(mensajes.data.map((m) => this.aMensaje(m, usuario.id)));
      this.suscribirRealtime();
    } catch (error) {
      this.registrarError('cargar Operaciones', error);
    }
  }

  /**
   * Alta de empleado (punto 1).
   *
   * Pasa por la Edge Function `crear-empleado` en vez de escribir
   * directo en la base. Crear una cuenta con contraseña necesita la
   * clave `service_role`, y esa clave no puede viajar dentro del APK:
   * puede leer cualquier tabla y saltear RLS. El razonamiento completo
   * está en `supabase/functions/crear-empleado/index.ts`.
   *
   * Esta función reemplaza al mock que había acá. Si Supabase no está
   * configurado —modo demostración— se sigue usando el mock, igual que
   * el resto del servicio.
   */
  async registrarEmpleado(d: AltaEmpleadoDemo): Promise<Resultado> {
    if (!d.foto) return { ok: false, error: 'La foto es obligatoria.' };
    if (!this.cliente) {
      this.mock.registrarEmpleado(d);
      return { ok: true };
    }
    const { foto, ...datos } = d;
    const resultado = await this.guardarAlta(
      'crear-empleado',
      { ...datos, dni: normalizarDni(d.dni) },
      [foto],
    );
    if (resultado.ok) await this.recargarUsuarios();
    return resultado;
  }

  /** Una solicitud estable por formulario hace seguro reintentar tras una respuesta perdida. */
  private async guardarAlta(
    funcion: string,
    datos: object,
    fotos: readonly (FotoDePersona | null | undefined)[],
    destino?: string,
  ): Promise<Resultado> {
    const actor = this.sesion.usuario()?.id;
    if (!actor || !this.cliente) return { ok: false, error: 'Falta iniciar sesión.' };
    const llave = `${actor}:${funcion}:${destino ?? 'alta'}`;
    if (this.enviandoAltas.has(llave)) return { ok: false, error: 'La operación sigue en curso.' };
    this.enviandoAltas.add(llave);
    const solicitud = this.solicitudes.get(llave) ?? crypto.randomUUID();
    this.solicitudes.set(llave, solicitud);
    try {
      const body = new FormData();
      body.set('datos', JSON.stringify(datos));
      body.set('solicitud', solicitud);
      if (destino) body.set('destino', destino);
      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        if (foto)
          body.set(`foto${i + 1}`, await this.comprimirImagen(foto.file), `foto${i + 1}.jpg`);
      }
      if (this.sesion.usuario()?.id !== actor)
        return { ok: false, error: 'La sesión cambió. Volvé a abrir el formulario.' };
      const { data, error } = await this.cliente.functions.invoke(funcion, { body });
      if (error) return { ok: false, error: await this.mensajeDeLaFuncion(error) };
      if (!data?.ok || typeof data.id !== 'string')
        return { ok: false, error: 'El servidor no confirmó el alta. Reintentá.' };
      this.solicitudes.delete(llave);
      if (this.sesion.usuario()?.id === actor) await this.cargar();
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: 'No se completó el guardado. Revisá las fotos y la conexión; podés reintentar.',
      };
    } finally {
      this.enviandoAltas.delete(llave);
    }
  }

  /**
   * Saca el mensaje que devolvió la Edge Function.
   *
   * `functions.invoke` no rechaza cuando la función responde 4xx: mete
   * un `FunctionsHttpError` cuyo cuerpo hay que leer aparte. Si no se
   * hace esto, el usuario ve "Edge Function returned a non-2xx status
   * code" en lugar de "Ya existe una cuenta con ese correo".
   */
  private async mensajeDeLaFuncion(error: unknown): Promise<string> {
    const contexto = (error as { context?: Response }).context;

    if (contexto && typeof contexto.json === 'function') {
      try {
        const cuerpo = await contexto.json();
        if (cuerpo?.error) {
          return String(cuerpo.error);
        }
      } catch {
        // Sin cuerpo legible; se cae al mensaje genérico de abajo.
      }
    }

    this.registrarError('crear el empleado', error);
    return 'No se pudo crear el empleado. Revisá la conexión e intentá nuevamente.';
  }
  /**
   * Busca un producto en la carta por su nombre (punto 2).
   *
   * ─────────────────────────────────────────────────────────────────
   * POR QUÉ MIRA TAMBIÉN LOS DADOS DE BAJA
   *
   * `eliminarProducto` no borra: pone `activo = false`, y `cargar()` solo
   * trae los activos. Pero el único de la base —`unique (tipo, nombre)`—
   * no sabe de eso: sigue ocupando el nombre.
   *
   * Si esto mirara solo la lista en pantalla, dar de alta un plato que
   * alguien había sacado de la carta pasaría el control, llegaría al
   * `insert` y volvería como «No se pudo guardar datos». El nombre está
   * tomado por algo que no se ve en ningún lado: sin salida.
   *
   * Por eso la consulta va contra la base sin filtrar por `activo`, y
   * quien llama decide qué hacer con cada caso.
   *
   * `exceptoId` es para la edición: un producto no choca consigo mismo.
   */
  private async buscarEnLaCarta(
    tipo: TipoProducto,
    nombre: string,
    exceptoId?: string,
  ): Promise<Producto | null> {
    if (!this.cliente) return null;

    let consulta = this.cliente
      .from('productos')
      .select('*')
      .eq('tipo', tipo)
      .ilike('nombre', paraIlike(nombre));

    if (exceptoId) consulta = consulta.neq('id', exceptoId);

    const { data, error } = await consulta.limit(1);

    // Si la consulta falla no se inventa un «no existe»: se deja seguir y
    // que el único de la base sea el que decida. Peor mensaje, nunca un
    // duplicado.
    if (error) {
      this.registrarError('verificar la carta', error);
      return null;
    }

    return (data?.[0] as Producto) ?? null;
  }

  /**
   * Agrega un producto a la carta (punto 2).
   *
   * El enunciado pide que «se verifique la existencia en la carta». Acá
   * hay tres finales posibles y no dos:
   *
   *   - no está        → se da de alta;
   *   - está y activo  → se rechaza con el nombre a la vista;
   *   - está y dado de baja → vuelve a la carta con los datos nuevos.
   *
   * El tercero es el que importa. Es el mismo plato de antes: crear una
   * fila nueva es imposible —el único de la base lo impide— y rechazarlo
   * dejaría al usuario peleando contra un nombre ocupado por algo que no
   * puede ver ni borrar. Reactivar y pisar los datos es lo que la persona
   * está pidiendo cuando lo vuelve a cargar.
   */
  async registrarProducto(d: AltaProductoDemo): Promise<Resultado> {
    const nombre = comoSeGuarda(d.nombre);
    const comoSeLlama = COMO_SE_LLAMA[d.tipo];

    if (!this.cliente) {
      if (this.mock.productos().some((p) => p.tipo === d.tipo && mismoNombre(p.nombre, nombre))) {
        return { ok: false, error: `Ya hay ${comoSeLlama.un} con ese nombre en la carta.` };
      }
      this.mock.registrarProducto({ ...d, nombre });
      return { ok: true };
    }

    if (d.fotos?.length !== 3 || d.fotos.some((f) => !f))
      return { ok: false, error: 'Se requieren exactamente tres fotos.' };
    const { fotos, ...datos } = d;
    const existente = await this.buscarEnLaCarta(d.tipo, nombre);
    const prefijo = `${this.sesion.usuario()?.id}:guardar-producto:`;
    if (existente && (!existente.activo || this.solicitudes.has(prefijo + existente.id))) {
      const resultado = await this.guardarAlta(
        'guardar-producto',
        { ...datos, nombre },
        fotos,
        existente.id,
      );
      return resultado.ok
        ? { ok: true, aviso: 'El producto volvió a la carta con los datos nuevos.' }
        : resultado;
    }
    if (existente && !this.solicitudes.has(prefijo + 'alta'))
      return { ok: false, error: `Ya hay ${comoSeLlama.un} con ese nombre en la carta.` };
    return this.guardarAlta('guardar-producto', { ...datos, nombre }, fotos);
  }
  async actualizarProducto(id: string, d: AltaProductoDemo): Promise<Resultado> {
    const nombre = comoSeGuarda(d.nombre);
    const comoSeLlama = COMO_SE_LLAMA[d.tipo];

    if (!this.cliente) {
      if (
        this.mock
          .productos()
          .some((p) => p.id !== id && p.tipo === d.tipo && mismoNombre(p.nombre, nombre))
      ) {
        return { ok: false, error: `Ya hay ${comoSeLlama.otro} con ese nombre en la carta.` };
      }
      this.mock.productos.update((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                nombre,
                descripcion: d.descripcion,
                minutos: d.minutos,
                precio: d.precio,
                tipo: d.tipo,
                sector: d.tipo === 'plato' ? 'cocina' : 'bar',
                fotos: [0, 1, 2].map((pos) => d.fotos?.[pos]?.previewUrl ?? item.fotos[pos]),
              }
            : item,
        ),
      );
      return { ok: true };
    }

    const { fotos, ...datos } = d;
    return this.guardarAlta('guardar-producto', { ...datos, nombre }, fotos ?? [], id);
  }

  /**
   * Saca un producto de la carta (baja lógica).
   *
   * ─────────────────────────────────────────────────────────────────
   * EL BUG QUE ESTO ARREGLA
   *
   * La pantalla decía «Producto eliminado del catálogo» y el producto
   * seguía ahí, en la lista, abajo del cartel. Dos problemas encadenados,
   * y el primero es EL MISMO que tenía la baja de empleado:
   *
   *   1. NADIE VERIFICABA QUE SE HUBIERA ESCRITO. `actualizar` solo mira
   *      `r.error`. Un `update` que RLS deniega no da error en PostgREST:
   *      da éxito con cero filas. Hoy la política `productos_modificacion`
   *      usa `es_staff()` y deja pasar al dueño, así que sí escribe — pero
   *      el día que alguien ajuste esa política, la aplicación volvería a
   *      mentir sin que nadie se entere. Se verifica y listo.
   *
   *   2. LA LISTA NO SE RECARGABA. `cargar()` trae solo los activos, pero
   *      nada la volvía a llamar: `productos` no está entre las tablas del
   *      canal de tiempo real —están mesas, pedidos, pedido_items,
   *      lista_espera y mensajes— así que la fila vieja se quedaba en
   *      memoria hasta que alguien recargaba la página.
   *
   * El `select('id')` es lo que convierte «no sé» en «sé»: PostgREST
   * devuelve las filas afectadas, así que cero filas es cero filas.
   */
  async eliminarProducto(id: string): Promise<Resultado> {
    if (!this.cliente) {
      this.mock.eliminarProducto(id);
      return { ok: true };
    }
    return this.escribirProducto(id, { activo: false }, 'dar de baja el producto');
  }

  /**
   * Cambia una fila de `productos` y deja la pantalla al día.
   *
   * Tres cosas que las tres altas/bajas/ediciones necesitan por igual:
   * escribir, COMPROBAR que se escribió, y recargar. Están acá juntas
   * para que no se pueda hacer una y olvidarse de las otras dos.
   *
   * No se toca el `actualizar` genérico: lo usan pedidos, cuentas, mesas
   * y lista_espera, y el `select` de vuelta depende de que cada tabla
   * tenga una política de lectura que le sirva a quien llama. `productos`
   * la tiene (`productos_lectura ... using (true)`); las demás hay que
   * mirarlas una por una antes de cambiarlas.
   */
  private async escribirProducto(
    id: string,
    cambios: Partial<Producto>,
    accion: string,
  ): Promise<Resultado> {
    const { data, error } = await this.cliente!.from('productos')
      .update(cambios)
      .eq('id', id)
      .select('id');

    if (error) return this.fallo(accion, error);

    if (!data?.length) {
      // Cero filas con éxito: o la fila ya no está, o RLS lo denegó sin
      // decirlo. Para quien mira la pantalla son lo mismo —no pasó— y
      // eso es lo que tiene que leer.
      this.registrarError(accion, 'el update afectó cero filas');
      return {
        ok: false,
        error: `No se pudo ${accion}. Puede que ya no exista o que no tengas permiso.`,
      };
    }

    await this.cargar();
    return { ok: true };
  }

  async eliminarEmpleado(id: string): Promise<Resultado> {
    if (!this.cliente) {
      this.mock.eliminarEmpleado(id);
      return { ok: true };
    }
    /**
     * LA BAJA PASA POR UNA EDGE FUNCTION, NO POR UN `delete` DE ACÁ.
     *
     * Lo que había antes era esto:
     *
     *     await this.cliente.from('usuarios').delete().eq('id', id);
     *
     * y no borraba nada. En el esquema no hay una sola política
     * `for delete`, así que RLS lo deniega; pero PostgREST no devuelve
     * error, devuelve éxito con cero filas. Como acá solo se miraba
     * `resultado.error`, la aplicación decía «empleado eliminado» y el
     * empleado seguía ahí.
     *
     * Además, aunque hubiera política, borrar `public.usuarios` dejaría
     * la cuenta de `auth.users` huérfana: el correo y el DNI quedarían
     * ocupados para siempre. La función borra la cuenta de Auth, y la
     * fila del legajo se va sola por el `on delete cascade`.
     */
    const { data, error } = await this.cliente.functions.invoke('eliminar-empleado', {
      body: { id },
    });

    if (error) {
      return { ok: false, error: await this.mensajeDeLaFuncion(error) };
    }

    await this.recargarUsuarios();

    const aviso = (data as { aviso?: string })?.aviso;
    return aviso ? { ok: true, aviso } : { ok: true };
  }

  /**
   * Sube las tres fotos del producto y las asocia en orden (punto 2).
   *
   * POR QUÉ SE SUBEN EN PARALELO PERO SE ASOCIAN DE UNA
   * Las tres subidas a Storage no dependen entre sí, así que van juntas
   * y el alta tarda lo que la más lenta y no la suma de las tres. El
   * `upsert` a `producto_fotos` sí va en una sola llamada, porque son
   * tres filas de la misma tabla y una sola ida y vuelta.
   *
   * EL `orden` SALE DE LA POSICIÓN EN EL ARREGLO
   * `producto_fotos` tiene `orden smallint check (orden between 1 and 3)`
   * y único por (producto, orden). El lugar 0 del arreglo es el orden 1.
   * Eso hace que al editar una sola foto se reemplace la que estaba en
   * ese lugar y no se agregue una cuarta.
   *
   * Un lugar en `null` significa «esta no se tocó»: se saltea.
   */
  /** Comprime fotos de cámara antes de enviarlas a Storage. */
  private async comprimirImagen(archivo: File): Promise<Blob> {
    if (!archivo.size || archivo.size > 5 * 1024 * 1024) throw new Error('Foto: máximo 5 MB.');
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (salida) => (salida ? resolve(salida) : reject(new Error('compresión fallida'))),
        'image/jpeg',
        0.82,
      ),
    );
  }
  /**
   * Da de alta una mesa (punto 4).
   *
   * ─────────────────────────────────────────────────────────────────
   * «SE VERIFICA LA EXISTENCIA DE LA NUEVA MESA (LISTADO)»
   *
   * `mesas.numero` es `unique` en la base. Sin control previo, repetir
   * un número llegaba al `insert` y volvía como «No se pudo guardar
   * datos. Revisá la conexión», que además manda a mirar la conexión,
   * que no tiene nada que ver.
   *
   * Es el mismo problema que tenía la carta en el punto 2 y se resuelve
   * igual: se pregunta antes y se contesta con el número a la vista.
   *
   * A diferencia de los productos, acá NO hay baja lógica —las mesas no
   * tienen `activo`— así que alcanza con mirar el listado que ya está
   * cargado, sin ir de nuevo a la base.
   */
  async registrarMesa(d: AltaMesaDemo): Promise<Resultado> {
    const repetida = this.mesas().some((mesa) => mesa.numero === d.numero);
    if (repetida) {
      return { ok: false, error: `Ya existe la mesa ${d.numero}.` };
    }

    if (!this.cliente) return { ok: this.mock.registrarMesa(d) };

    if (!d.foto) return { ok: false, error: 'La foto de la mesa es obligatoria.' };
    const { foto, ...datos } = d;
    return this.guardarAlta('guardar-mesa', { ...datos, tipo: this.tipoMesa(d.tipo) }, [foto]);
  }
  async registrarCliente(d: AltaClienteDemo): Promise<Resultado> {
    // La creación de auth.users requiere service_role, que nunca se expone al navegador.
    // Hasta contar con una Edge Function, las altas siguen siendo explícitamente mock.
    this.mock.registrarCliente(d);
    return { ok: true };
  }
  async resolverCliente(id: string, estado: 'aprobado' | 'rechazado'): Promise<Resultado> {
    if (!this.cliente) {
      this.mock.resolverCliente(id, estado);
      return { ok: true };
    }
    return this.actualizar('usuarios', id, { estado });
  }
  /**
   * Cambia los datos de una mesa (punto 4, «gestión de mesas»).
   *
   * El enunciado pide poder modificar la disponibilidad; editar el resto
   * no lo pide, pero es lo que resuelve el caso real de reconfigurar el
   * salón —partir una mesa grande en una más chica— sin borrar nada ni
   * perder el historial de pedidos que cuelga de ella.
   *
   * El número se verifica igual que en el alta, excluyendo a la propia
   * mesa: `mesas.numero` es `unique` y renumerar una mesa al número de
   * otra tiene que avisar, no explotar.
   */
  async actualizarMesa(id: string, d: AltaMesaDemo): Promise<Resultado> {
    const chocada = this.mesas().some((mesa) => mesa.id !== id && mesa.numero === d.numero);
    if (chocada) {
      return { ok: false, error: `Ya existe la mesa ${d.numero}.` };
    }

    if (!this.cliente) {
      this.mock.actualizarMesa(id, d);
      return { ok: true };
    }

    const { foto, ...datos } = d;
    return this.guardarAlta('guardar-mesa', { ...datos, tipo: this.tipoMesa(d.tipo) }, [foto], id);
  }

  /**
   * Saca una mesa del salón (punto 4, «gestión de mesas»).
   *
   * ─────────────────────────────────────────────────────────────────
   * POR QUÉ ACÁ SÍ SE BORRA DE VERDAD
   *
   * Es el único borrado real del proyecto, y se puede por dos cosas que
   * el resto de las tablas no tienen:
   *
   *   1. LA POLÍTICA EXISTE. `mesas_escritura` es `for all`, que incluye
   *      DELETE. En `usuarios` y `productos` no hay ninguna política de
   *      borrado —por eso esas bajas son una Edge Function y una baja
   *      lógica—.
   *
   *   2. LAS CLAVES FORÁNEAS SON LA RED. `sesiones_mesa.mesa_id` y
   *      `lista_espera.mesa_id` apuntan acá SIN `on delete cascade`, así
   *      que PostgreSQL se niega a borrar una mesa con historial. No hay
   *      forma de perder pedidos por accidente: lo peor que pasa es que
   *      el borrado se rechace, y eso hay que contarlo bien.
   *
   * El 23503 es la violación de clave foránea. Sin traducirlo, la
   * pantalla mostraría «No se pudo dar de baja la mesa. Revisá la
   * conexión», que manda a mirar la conexión cuando el problema es que
   * la mesa tiene pedidos.
   */
  async eliminarMesa(id: string): Promise<Resultado> {
    const mesa = this.mesas().find((m) => m.id === id);
    if (!mesa) return { ok: false, error: 'Esa mesa ya no existe.' };

    // Una mesa ocupada tiene gente sentada. Se avisa antes de llegar a
    // la base, que rechazaría igual pero con peor mensaje.
    if (!mesa.disponible) {
      return {
        ok: false,
        error: `La mesa ${mesa.numero} está ocupada: liberala antes de sacarla.`,
      };
    }

    if (!this.cliente) {
      this.mock.eliminarMesa(id);
      return { ok: true };
    }

    const { data, error } = await this.cliente.from('mesas').delete().eq('id', id).select('id');

    if (error) {
      const codigo = (error as { code?: string }).code;
      if (codigo === '23503') {
        return {
          ok: false,
          error: `La mesa ${mesa.numero} tiene pedidos o clientes asociados, así que no se puede borrar. Se puede marcar como ocupada.`,
        };
      }
      return this.fallo('dar de baja la mesa', error);
    }

    if (!data?.length) {
      this.registrarError('dar de baja la mesa', 'el delete afectó cero filas');
      return {
        ok: false,
        error: `No se pudo borrar la mesa ${mesa.numero}. Puede que ya no exista o que no tengas permiso.`,
      };
    }

    await this.cargar();
    return { ok: true };
  }

  /**
   * Cambia una fila de `mesas` y deja la pantalla al día.
   *
   * El mismo trío que `escribirProducto`: escribir, COMPROBAR que se
   * escribió, y recargar. Un `update` que RLS deniega devuelve éxito con
   * cero filas, así que sin el `select('id')` la pantalla no puede
   * distinguir «lo hice» de «no hice nada».
   */
  private async escribirMesa(
    id: string,
    cambios: Partial<Tablas<'mesas'>>,
    accion: string,
  ): Promise<Resultado> {
    const { data, error } = await this.cliente!.from('mesas')
      .update(cambios)
      .eq('id', id)
      .select('id');

    if (error) return this.fallo(accion, error);

    if (!data?.length) {
      this.registrarError(accion, 'el update afectó cero filas');
      return {
        ok: false,
        error: `No se pudo ${accion}. Puede que ya no exista o que no tengas permiso.`,
      };
    }

    await this.cargar();
    return { ok: true };
  }

  /**
   * Libera u ocupa una mesa (punto 4, «gestión de mesas»).
   *
   * Pasa por el mismo control que las escrituras de productos: se
   * comprueba con `select('id')` que el `update` haya afectado una fila
   * y se recarga. Sin eso, un `update` que RLS deniega devuelve éxito
   * con cero filas y la pantalla dice que la mesa cambió de estado
   * cuando no cambió nada — el mismo bug que tuvimos en la baja de
   * producto y en la de empleado.
   */
  async cambiarDisponibilidadMesa(numero: number): Promise<Resultado> {
    if (!this.cliente) {
      this.mock.cambiarDisponibilidadMesa(numero);
      return { ok: true };
    }

    const mesa = this.mesas().find((m) => m.numero === numero);
    if (!mesa) return { ok: false, error: 'Mesa inexistente.' };

    const { data, error } = await this.cliente
      .from('mesas')
      .update({ estado: mesa.disponible ? 'ocupada' : 'libre' })
      .eq('id', mesa.id)
      .select('id');

    if (error?.code === '23514')
      return {
        ok: false,
        error: 'La mesa tiene una estadía activa. Solo el cierre del circuito puede liberarla.',
      };
    if (error) return this.fallo('cambiar la disponibilidad de la mesa', error);

    if (!data?.length) {
      this.registrarError('cambiar la disponibilidad de la mesa', 'el update afectó cero filas');
      return {
        ok: false,
        error: `No se pudo cambiar el estado de la mesa ${numero}. Puede que ya no exista o que no tengas permiso.`,
      };
    }

    await this.cargar();
    return { ok: true };
  }
  async anotarEnEspera(nombre: string): Promise<Resultado> {
    if (!this.cliente) {
      this.mock.anotarEnEspera(nombre);
      return { ok: true };
    }
    const id = this.sesion.usuario()?.id;
    return id
      ? this.insertar('lista_espera', { cliente_id: id })
      : { ok: false, error: 'No hay sesión activa.' };
  }
  async eliminarDeEspera(id: string): Promise<Resultado> {
    if (!this.cliente) {
      this.mock.eliminarDeEspera(id);
      return { ok: true };
    }
    return this.actualizar('lista_espera', id, {
      estado: 'eliminado',
      mesa_id: null,
      asignado_en: null,
    });
  }
  async asignarMesa(idEspera: string, numero: number): Promise<Resultado> {
    if (!this.cliente) return { ok: this.mock.asignarMesa(idEspera, numero) };
    const mesa = this.mesas().find((m) => m.numero === numero);
    if (!mesa || !mesa.disponible) return { ok: false, error: 'Esa mesa no está disponible.' };
    const r = await this.actualizar('lista_espera', idEspera, {
      estado: 'asignado',
      mesa_id: mesa.id,
      asignado_en: new Date().toISOString(),
    });
    if (!r.ok) return r;
    // El trigger de sesiones toma el bloqueo de mesa y actualiza ocupación atómicamente.
    const espera = this.espera().find((e) => e.id === idEspera);
    const clienteId = espera ? this.clientePorEspera.get(espera.id) : undefined;
    if (clienteId)
      await this.insertar('sesiones_mesa', {
        mesa_id: mesa.id,
        cliente_id: clienteId,
        comensales: mesa.comensales,
      });
    return { ok: true };
  }
  vincularMesa(numero: number): boolean {
    return this.mesaVinculada() === numero;
  }
  agregarAlCarrito(p: ProductoDemo): void {
    this.carrito.update((items) => {
      const old = items.find((i) => i.productoId === p.id);
      return old
        ? items.map((i) => (i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
        : [
            ...items,
            {
              productoId: p.id,
              nombre: p.nombre,
              cantidad: 1,
              precio: p.precio,
              sector: p.sector,
              minutos: p.minutos,
            },
          ];
    });
  }
  quitarDelCarrito(id: string): void {
    this.carrito.update((items) =>
      items
        .map((i) => (i.productoId === id ? { ...i, cantidad: i.cantidad - 1 } : i))
        .filter((i) => i.cantidad > 0),
    );
  }
  async enviarPedido(): Promise<Resultado> {
    if (!this.cliente) {
      const u = this.sesion.usuario();
      return {
        ok: this.mock.enviarPedido(
          u ? `${u.nombres} ${u.apellidos}` : 'Cliente',
          this.mesaVinculada() ?? 2,
        ),
      };
    }
    if (!this.sesionActiva || !this.carrito().length)
      return { ok: false, error: 'No hay mesa o productos seleccionados.' };
    const p = await this.insertarConFila('pedidos', {
      sesion_mesa_id: this.sesionActiva.id,
      estado: 'pendiente_confirmacion',
    });
    const pedidoCreado = p.fila;
    if (!p.ok || !pedidoCreado) return p;
    const items = this.carrito().map((i) => ({
      pedido_id: pedidoCreado.id,
      producto_id: i.productoId,
      cantidad: i.cantidad,
      precio_unitario: i.precio,
      sector: i.sector,
    }));
    const { error } = await this.cliente.from('pedido_items').insert(items);
    if (error) return this.fallo('crear ítems del pedido', error);
    this.carrito.set([]);
    await this.cargarPedidoYCuenta();
    return { ok: true };
  }
  async rechazarPedido(motivo: string): Promise<Resultado> {
    return this.cambiarEstadoPedido('rechazado', { motivo_rechazo: motivo });
  }
  async confirmarPedido(): Promise<Resultado> {
    return this.cambiarEstadoPedido('confirmado', { motivo_rechazo: null });
  }
  async marcarSectorListo(sector: SectorProducto): Promise<Resultado> {
    if (!this.cliente) {
      this.mock.marcarSectorListo(sector);
      return { ok: true };
    }
    if (!this.pedidoReal) return { ok: false, error: 'No hay pedido activo.' };
    const { error } = await this.cliente
      .from('pedido_items')
      .update({ estado: 'listo', listo_en: new Date().toISOString() })
      .eq('pedido_id', this.pedidoReal.id)
      .eq('sector', sector);
    if (error) return this.fallo('marcar sector listo', error);
    await this.cargarPedidoYCuenta();
    return { ok: true };
  }
  async marcarEntregado(): Promise<Resultado> {
    return this.cambiarEstadoPedido('entregado');
  }
  async confirmarRecepcion(): Promise<Resultado> {
    return this.cambiarEstadoPedido('recibido');
  }
  async agregarMensaje(autor: string, texto: string, propio: boolean): Promise<Resultado> {
    if (!this.cliente) {
      this.mock.agregarMensaje(autor, texto, propio);
      return { ok: true };
    }
    return this.sesionActiva && this.sesion.usuario()
      ? this.insertar('mensajes', {
          sesion_mesa_id: this.sesionActiva.id,
          autor_id: this.sesion.usuario()!.id,
          tipo: propio ? 'consulta' : 'respuesta',
          cuerpo: texto,
        })
      : { ok: false, error: 'No hay estadía activa.' };
  }
  async jugar(
    id: string,
    gano: boolean,
  ): Promise<{ ok: boolean; intento: number; descuento: number }> {
    if (!this.cliente) {
      const intento = this.mock.jugar(id, gano);
      return { ok: true, intento, descuento: this.mock.descuento() };
    }
    if (!this.sesionActiva || this.sesion.usuario()?.perfil !== 'cliente_registrado')
      return { ok: false, intento: 0, descuento: 0 };
    const { data: juego } = await this.cliente
      .from('juegos')
      .select('*')
      .ilike('nombre', `%${id}%`)
      .maybeSingle();
    if (!juego) return { ok: false, intento: 0, descuento: 0 };
    const { count } = await this.cliente
      .from('partidas_juego')
      .select('*', { count: 'exact', head: true })
      .eq('sesion_mesa_id', this.sesionActiva.id)
      .eq('juego_id', juego.id);
    const intento = (count ?? 0) + 1;
    const descuento = gano && intento === 1 ? juego.porcentaje_descuento : 0;
    const r = await this.insertar('partidas_juego', {
      juego_id: juego.id,
      sesion_mesa_id: this.sesionActiva.id,
      cliente_id: this.sesion.usuario()!.id,
      intento,
      gano,
      descuento_otorgado: descuento,
    });
    if (r.ok && descuento) this.descuento.set(descuento);
    return { ok: r.ok, intento, descuento: this.descuento() };
  }
  seleccionarPropina(p: number): void {
    this.porcentajePropina.set(p);
  }
  async registrarEncuesta(): Promise<Resultado> {
    if (!this.cliente) {
      return { ok: this.mock.registrarEncuesta() };
    }
    return this.sesionActiva && this.sesion.usuario()
      ? this.insertar('encuestas', {
          sesion_mesa_id: this.sesionActiva.id,
          cliente_id: this.sesion.usuario()!.id,
        })
      : { ok: false, error: 'No hay estadía activa.' };
  }
  async generarCuenta(): Promise<Resultado> {
    if (!this.cliente) return { ok: this.mock.generarCuenta() };
    const p = this.porcentajePropina();
    if (!this.sesionActiva || p === null)
      return { ok: false, error: 'Seleccioná una propina antes de generar la cuenta.' };
    const calculo = await this.cliente.rpc('calcular_cuenta', {
      p_sesion_id: this.sesionActiva.id,
    });
    if (calculo.error || !calculo.data?.[0]) return this.fallo('calcular la cuenta', calculo.error);
    const c = calculo.data[0];
    const propina = Math.round((c.base * p) / 100);
    const nivel = (
      { 20: 'excelente', 15: 'muy_bueno', 10: 'bueno', 5: 'regular', 0: 'malo' } as const
    )[p as 0 | 5 | 10 | 15 | 20];
    const r = await this.insertar('cuentas', {
      sesion_mesa_id: this.sesionActiva.id,
      subtotal: c.subtotal,
      descuento_pct: c.descuento_pct,
      descuento_monto: c.descuento_monto,
      nivel_propina: nivel,
      propina_pct: p,
      propina_monto: propina,
      total: c.base + propina,
    });
    if (r.ok) await this.cargarPedidoYCuenta();
    return r;
  }
  async pagarCuenta(): Promise<Resultado> {
    return this.actualizarCuenta('pagada');
  }
  async confirmarPago(): Promise<Resultado> {
    return this.actualizarCuenta('confirmada');
  }

  private async cambiarEstadoPedido(
    estado: 'rechazado' | 'confirmado' | 'entregado' | 'recibido',
    extra: Record<string, unknown> = {},
  ): Promise<Resultado> {
    if (!this.cliente) {
      if (estado === 'rechazado') this.mock.rechazarPedido(String(extra['motivo_rechazo'] ?? ''));
      else if (estado === 'confirmado') this.mock.confirmarPedido();
      else if (estado === 'entregado') this.mock.marcarEntregado();
      else this.mock.confirmarRecepcion();
      return { ok: true };
    }
    if (!this.pedidoReal) return { ok: false, error: 'No hay pedido activo.' };
    if (estado === 'recibido')
      return this.actualizar('pedidos', this.pedidoReal.id, {
        recibido_en: new Date().toISOString(),
      });
    return this.actualizar('pedidos', this.pedidoReal.id, { estado, ...extra });
  }
  private async actualizarCuenta(estado: 'pagada' | 'confirmada'): Promise<Resultado> {
    if (!this.cliente) {
      if (estado === 'pagada') this.mock.pagarCuenta();
      else this.mock.confirmarPago();
      return { ok: true };
    }
    const c = this.cuentaReal;
    return c
      ? this.actualizar('cuentas', c.id, {
          estado,
          ...(estado === 'pagada'
            ? { pagada_en: new Date().toISOString() }
            : { confirmada_en: new Date().toISOString() }),
        })
      : { ok: false, error: 'No hay cuenta activa.' };
  }
  private async cargarPedidoYCuenta(): Promise<void> {
    if (!this.cliente || !this.sesionActiva) return;
    const q = await this.cliente
      .from('pedidos')
      .select('*')
      .eq('sesion_mesa_id', this.sesionActiva.id)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (q.error) {
      this.registrarError('cargar pedido', q.error);
      return;
    }
    this.pedidoReal = q.data;
    if (q.data) {
      const i = await this.cliente.from('pedido_items').select('*').eq('pedido_id', q.data.id);
      this.pedidoActivo.set(this.aPedido(q.data, i.data ?? []));
    }
    const c = await this.cliente
      .from('cuentas')
      .select('*')
      .eq('sesion_mesa_id', this.sesionActiva.id)
      .maybeSingle();
    this.cuentaReal = c.data;
    if (!c.error)
      this.cuenta.set(
        c.data
          ? {
              subtotal: c.data.subtotal,
              descuento: c.data.descuento_monto,
              porcentajePropina: c.data.propina_pct ?? 0,
              propina: c.data.propina_monto,
              total: c.data.total,
              estado: c.data.estado === 'pendiente' ? 'pendiente_pago' : c.data.estado,
            }
          : null,
      );
  }
  private suscribirRealtime(): void {
    if (!this.cliente || this.canal) return;
    this.canal = this.cliente
      .channel('operacion-compartida')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos' },
        () => void this.cargar(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'producto_fotos' },
        () => void this.cargar(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'usuarios' },
        () => void this.cargar(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mesas' },
        () => void this.cargar(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => void this.cargar(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedido_items' },
        () => void this.cargar(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lista_espera' },
        () => void this.cargar(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mensajes' },
        () => void this.cargar(),
      )
      .subscribe();
  }
  /**
   * Vuelve a leer SOLO la lista de personas.
   *
   * POR QUÉ NO SE LLAMA A `cargar()`
   * `cargar()` recarga el mundo entero: productos, fotos, mesas,
   * usuarios, lista de espera, sesiones, mensajes y notificaciones, y
   * después encadena la espera, el pedido, sus ítems y la cuenta. Son
   * hasta cinco idas y vueltas al servidor, una atrás de otra.
   *
   * Después de dar de alta a un empleado lo único que cambió es la
   * tabla de usuarios. Pagar la recarga completa ahí es lo que hacía
   * que el botón de confirmar se quedara pensando varios segundos.
   */
  private async recargarUsuarios(): Promise<void> {
    if (!this.cliente) return;

    const usuario = this.sesion.usuario();
    if (!usuario) return;

    const { data } = await this.cliente.from('usuarios').select('*').order('apellidos');
    if (data) this.cargarUsuarios(data, usuario);
  }

  private cargarUsuarios(filas: Tablas<'usuarios'>[], actual: Usuario): void {
    this.empleados.set(
      filas.filter((f) => PERFILES_DE_EMPLEADO.includes(f.perfil)).map(this.aUsuario),
    );
    this.clientes.set(
      filas
        .filter((f) => ['cliente_registrado', 'cliente_anonimo'].includes(f.perfil))
        .map((f) => ({
          id: f.id,
          nombres: f.nombres,
          apellidos: f.apellidos ?? '',
          dni: f.dni ?? '',
          correo: f.correo ?? '',
          foto: f.foto_url ?? 'imagenes/logo.png',
          estado: f.estado,
        })),
    );
    if (!this.empleados().some((e) => e.id === actual.id) && actual.perfil !== 'dueno')
      this.empleados.update((e) => [...e, actual]);
  }
  private async cargarEspera(filas: Tablas<'lista_espera'>[]): Promise<void> {
    const ids = filas.map((f) => f.cliente_id);
    if (!this.cliente || !ids.length) {
      this.espera.set([]);
      return;
    }
    const { data } = await this.cliente.from('usuarios').select('*').in('id', ids);
    const usuarios = new Map((data ?? []).map((u) => [u.id, u]));
    this.clientePorEspera.clear();
    for (const f of filas) this.clientePorEspera.set(f.id, f.cliente_id);
    this.espera.set(
      filas.map((f) => ({
        id: f.id,
        nombre:
          `${usuarios.get(f.cliente_id)?.nombres ?? 'Cliente'} ${usuarios.get(f.cliente_id)?.apellidos ?? ''}`.trim(),
        foto: usuarios.get(f.cliente_id)?.foto_url ?? 'imagenes/logo.png',
        fecha: new Date(f.creado_en).toLocaleString('es-AR'),
        mesaAsignada: this.mesas().find((m) => m.id === f.mesa_id)?.numero,
      })),
    );
  }
  private elegirSesion(s: Sesion[], u: Usuario): Sesion | null {
    return s.find((x) => x.cliente_id === u.id) ?? s[0] ?? null;
  }
  private aProducto(p: Producto, fotos: string[]): ProductoDemo {
    return {
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      tipo: p.tipo as TipoProducto,
      sector: p.sector,
      precio: Number(p.precio),
      minutos: p.tiempo_elaboracion_min,
      fotos: fotos.length ? fotos : ['imagenes/logo.png'],
    };
  }
  private aMesa(m: Tablas<'mesas'>): MesaDemo {
    return {
      id: m.id,
      numero: m.numero,
      comensales: m.cantidad_comensales,
      tipo: this.tipoDemo(m.tipo),
      disponible: m.estado === 'libre',
      qrToken: m.qr_token,
      fotoUrl: m.foto_url ?? null,
    };
  }
  private aUsuario(f: Tablas<'usuarios'>): Usuario {
    return {
      id: f.id,
      nombres: f.nombres,
      apellidos: f.apellidos ?? '',
      correo: f.correo ?? '',
      perfil: f.perfil,
      etiquetaPerfil: etiquetaDePerfil(f.perfil),
      estado: f.estado,
      fotoUrl: f.foto_url,
    };
  }
  private aPedido(p: Pedido, items: Item[]): PedidoDemo {
    const estado =
      p.estado === 'entregado' && p.recibido_en !== null
        ? 'recibido'
        : p.estado === 'pagado'
          ? 'recibido'
          : (p.estado as EstadoPedido);
    return {
      id: p.id,
      mesa: this.mesas().find((m) => m.id === this.sesionActiva?.mesa_id)?.numero ?? 0,
      cliente: 'Cliente de la mesa',
      creadoEn: new Date(p.creado_en).toLocaleString('es-AR'),
      items: items.map((i) => ({
        productoId: i.producto_id,
        nombre: this.productosPorId.get(i.producto_id)?.nombre ?? 'Producto',
        cantidad: i.cantidad,
        precio: Number(i.precio_unitario),
        sector: i.sector,
        minutos: this.productosPorId.get(i.producto_id)?.tiempo_elaboracion_min ?? 0,
      })),
      estado,
      motivoRechazo: p.motivo_rechazo ?? '',
      descuentoPorJuego: this.descuento(),
      sectoresListos: {
        cocina: items.filter((i) => i.sector === 'cocina').every((i) => i.estado === 'listo'),
        bar: items.filter((i) => i.sector === 'bar').every((i) => i.estado === 'listo'),
      },
    };
  }
  private aMensaje(m: Tablas<'mensajes'>, id: string): MensajeDemo {
    return {
      id: m.id,
      autor: m.autor_id === id ? 'Vos' : 'Equipo TUMBO',
      texto: m.cuerpo,
      fecha: new Date(m.enviado_en).toLocaleString('es-AR'),
      esPropio: m.autor_id === id,
    };
  }
  private aNotificacion = (n: Tablas<'notificaciones'>): NotificacionDemo => ({
    id: n.id,
    mensaje: n.cuerpo,
    fecha: new Date(n.enviada_en).toLocaleString('es-AR'),
    destinatarios: [],
  });
  private tipoMesa(t: TipoMesa): Tablas<'mesas'>['tipo'] {
    if (t === 'VIP') return 'vip';
    if (t === 'estándar') return 'estandar';
    if (t === 'movilidad_reducida') return t;
    throw new Error('Tipo de mesa no admitido.');
  }
  private tipoDemo(t: Tablas<'mesas'>['tipo']): TipoMesa {
    return t === 'vip' ? 'VIP' : t === 'estandar' ? 'estándar' : 'movilidad_reducida';
  }
  private pedidoVacio(): PedidoDemo {
    return {
      id: '',
      mesa: 0,
      cliente: 'Sin pedido activo',
      creadoEn: '',
      items: [],
      estado: 'pendiente_confirmacion',
      motivoRechazo: '',
      descuentoPorJuego: 0,
      sectoresListos: { cocina: false, bar: false },
    };
  }
  private validar(error: unknown, recurso: string): void {
    if (error) this.registrarError(`cargar ${recurso}`, error);
  }
  private async insertar<
    T extends keyof import('../models/base-de-datos').Database['public']['Tables'],
  >(
    tabla: T,
    fila: import('../models/base-de-datos').Database['public']['Tables'][T]['Insert'],
  ): Promise<Resultado> {
    const r = await this.insertarConFila(tabla, fila);
    return { ok: r.ok, error: r.error };
  }
  private async insertarConFila<
    T extends keyof import('../models/base-de-datos').Database['public']['Tables'],
  >(
    tabla: T,
    fila: import('../models/base-de-datos').Database['public']['Tables'][T]['Insert'],
  ): Promise<{ ok: boolean; fila?: Tablas<T>; error?: string }> {
    if (!this.cliente) return { ok: false };
    const r = await this.cliente.from(tabla).insert(fila).select().single();
    return r.error || !r.data
      ? { ok: false, error: this.fallo('guardar datos', r.error).error }
      : { ok: true, fila: r.data as Tablas<T> };
  }
  private async actualizar<
    T extends keyof import('../models/base-de-datos').Database['public']['Tables'],
  >(
    tabla: T,
    id: string,
    cambios: import('../models/base-de-datos').Database['public']['Tables'][T]['Update'],
  ): Promise<Resultado> {
    if (!this.cliente) return { ok: false };
    const r = await this.cliente.from(tabla).update(cambios).eq('id', id);
    return r.error ? this.fallo(`actualizar ${String(tabla)}`, r.error) : { ok: true };
  }
  private fallo(accion: string, error: unknown): Resultado {
    this.registrarError(accion, error);
    const mensaje =
      typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';
    return {
      ok: false,
      error: mensaje.toLowerCase().includes('row-level')
        ? 'No tenés permisos para realizar esta operación.'
        : `No se pudo ${accion}. Revisá la conexión e intentá nuevamente.`,
    };
  }
  private registrarError(accion: string, error: unknown): void {
    console.error(`[TUMBO] Error al ${accion}`, error);
  }
}
