import { TestBed } from '@angular/core/testing';
import { OperacionService, comoSeGuarda, mismoNombre, paraIlike } from './operacion.service';
import { DemoRestauranteService } from './demo-restaurante.service';
import { AltaMesaDemo, AltaProductoDemo } from '../models/demo-restaurante';
import { tipoProductoDelPerfil } from '../navegacion/secciones';

describe('Adaptador de operación en demostración', () => {
  it('muestra los datos del mock y refleja las acciones en la misma fuente', async () => {
    const servicio = TestBed.inject(OperacionService);
    const mock = TestBed.inject(DemoRestauranteService);
    expect(servicio.productos()).toEqual(mock.productos());
    expect(servicio.productos().length).toBeGreaterThan(0);
    const producto = servicio.productos()[0];
    servicio.agregarAlCarrito(producto);
    expect(mock.carrito()[0].productoId).toBe(producto.id);
    expect((await servicio.enviarPedido()).ok).toBe(true);
    expect(servicio.pedidoActivo().items[0].productoId).toBe(producto.id);
    expect(servicio.carrito()).toEqual([]);
  });
});

/**
 * Punto 2 del enunciado: «se verifica la existencia en la carta (menú)».
 *
 * Estas pruebas corren en modo demostración —sin Supabase configurado—,
 * que es el camino que el adaptador toma cuando no hay cliente. El camino
 * con base de datos usa la misma regla, con `ilike` en vez de comparar en
 * memoria; lo que se fija acá es la REGLA, no el transporte.
 */
describe('Verificación de existencia en la carta (punto 2)', () => {
  const plato = (nombre: string): AltaProductoDemo => ({
    nombre,
    descripcion: 'Descripción de prueba con largo suficiente.',
    minutos: 15,
    precio: 9500,
    tipo: 'plato',
  });

  it('agrega un plato que no está en la carta', async () => {
    const servicio = TestBed.inject(OperacionService);
    const antes = servicio.productos().length;

    expect((await servicio.registrarProducto(plato('Provoleta al romero'))).ok).toBe(true);
    expect(servicio.productos().length).toBe(antes + 1);
  });

  it('rechaza un plato con un nombre que ya está en la carta', async () => {
    const servicio = TestBed.inject(OperacionService);
    const existente = servicio.productos().find((p) => p.tipo === 'plato')!;
    const antes = servicio.productos().length;

    const resultado = await servicio.registrarProducto(plato(existente.nombre));

    expect(resultado.ok).toBe(false);
    expect(resultado.error).toContain('en la carta');
    expect(servicio.productos().length).toBe(antes);
  });

  /**
   * El caso que motiva `comoSeGuarda` y `mismoNombre`: nadie escribe dos
   * veces exactamente igual. Sin normalizar, «  milanesa  NAPOLITANA »
   * entra como un plato nuevo y la carta termina con el mismo plato dos
   * veces, escrito distinto.
   */
  it('reconoce el mismo plato aunque cambien mayúsculas y espacios', async () => {
    const servicio = TestBed.inject(OperacionService);
    const existente = servicio.productos().find((p) => p.tipo === 'plato')!;
    const disfrazado = `  ${existente.nombre.toUpperCase().replace(/ /g, '   ')}  `;

    expect((await servicio.registrarProducto(plato(disfrazado))).ok).toBe(false);
  });

  it('guarda el nombre ya normalizado, no como se tipeó', async () => {
    const servicio = TestBed.inject(OperacionService);

    await servicio.registrarProducto(plato('  Ñoquis   de   la   casa  '));

    expect(servicio.productos().some((p) => p.nombre === 'Ñoquis de la casa')).toBe(true);
  });

  /**
   * El nombre solo choca dentro de su propio tipo: la base tiene
   * `unique (tipo, nombre)` y no `unique (nombre)`. Un «Limonada» plato y
   * un «Limonada» bebida son dos cosas distintas de la carta.
   */
  it('no confunde un plato con una bebida del mismo nombre', async () => {
    const servicio = TestBed.inject(OperacionService);

    expect((await servicio.registrarProducto(plato('Pomelo rosado'))).ok).toBe(true);
    expect(
      (await servicio.registrarProducto({ ...plato('Pomelo rosado'), tipo: 'bebida' })).ok,
    ).toBe(true);
  });

  it('al editar, deja conservar el nombre propio', async () => {
    const servicio = TestBed.inject(OperacionService);
    const producto = servicio.productos().find((p) => p.tipo === 'plato')!;

    const resultado = await servicio.actualizarProducto(producto.id, {
      ...plato(producto.nombre),
      precio: 12345,
    });

    expect(resultado.ok).toBe(true);
    expect(servicio.productos().find((p) => p.id === producto.id)!.precio).toBe(12345);
  });

  it('al editar, no deja tomar el nombre de otro producto', async () => {
    const servicio = TestBed.inject(OperacionService);
    const platos = servicio.productos().filter((p) => p.tipo === 'plato');
    const [uno, otro] = platos;

    const resultado = await servicio.actualizarProducto(uno.id, plato(otro.nombre));

    expect(resultado.ok).toBe(false);
    expect(servicio.productos().find((p) => p.id === uno.id)!.nombre).toBe(uno.nombre);
  });
});

describe('Normalización de nombres de producto', () => {
  it('recorta y colapsa los espacios', () => {
    expect(comoSeGuarda('  Milanesa   napolitana ')).toBe('Milanesa napolitana');
  });

  it('no toca acentos ni mayúsculas', () => {
    expect(comoSeGuarda('Café Irlandés')).toBe('Café Irlandés');
  });

  it('compara sin distinguir mayúsculas', () => {
    expect(mismoNombre('Milanesa  Napolitana', 'milanesa napolitana')).toBe(true);
    expect(mismoNombre('Té', 'Te')).toBe(false);
  });

  /**
   * `%` y `_` son comodines de `ilike`. Sin escaparlos, «Café 100%
   * arábica» le preguntaría a la base por cualquier nombre que empiece
   * «Café 100» y termine « arábica»: un producto distinto se rechazaría
   * por repetido, sin explicación posible.
   */
  it('escapa los comodines de ilike', () => {
    expect(paraIlike('Café 100% arábica')).toBe('Café 100\\% arábica');
    expect(paraIlike('Menú_del_día')).toBe('Menú\\_del\\_día');
    expect(paraIlike('Barra \\ parrilla')).toBe('Barra \\\\ parrilla');
  });

  it('deja intacto un nombre sin comodines', () => {
    expect(paraIlike('Provoleta al romero')).toBe('Provoleta al romero');
  });
});

/**
 * Punto 3 del enunciado: «Agregar una nueva bebida (dispositivo 3).
 * Perfil: cantinero.»
 *
 * ─────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTE BLOQUE EXISTE SI EL CÓDIGO ES EL MISMO
 *
 * El punto 3 pide lo mismo que el 2 y lo resuelve el mismo formulario:
 * `tipoProductoDelPerfil` le fija `tipo: 'bebida'` al cantinero y de ahí
 * en adelante es el circuito del punto 2.
 *
 * Que ANDE por ser el mismo código no es lo mismo que que SIGA andando.
 * Hay tres lugares donde el tipo se ramifica —el sector, el nombre que
 * se le muestra a la persona, y el único por (tipo, nombre)—, y las
 * pruebas del punto 2 solo recorren la rama del plato. Sin esto, el día
 * que alguien toque una de esas tres ramas, el punto 3 se rompe y las
 * 142 pruebas siguen en verde.
 */
describe('Alta de bebida · punto 3 (cantinero)', () => {
  const bebida = (nombre: string): AltaProductoDemo => ({
    nombre,
    descripcion: 'Bebida de prueba con descripción suficiente.',
    minutos: 5,
    precio: 3200,
    tipo: 'bebida',
  });

  it('agrega una bebida que no está en la carta', async () => {
    const servicio = TestBed.inject(OperacionService);
    const antes = servicio.productos().length;

    expect((await servicio.registrarProducto(bebida('Limonada de jengibre'))).ok).toBe(true);
    expect(servicio.productos().length).toBe(antes + 1);
  });

  /**
   * El `check (sector_coherente)` de la base exige que una bebida vaya a
   * `bar` y un plato a `cocina`. Si el alta mandara el sector cruzado, la
   * base lo rechazaría con un error que en pantalla se lee como «no se
   * pudo guardar datos», sin decir por qué.
   */
  it('manda la bebida al sector bar y no a cocina', async () => {
    const servicio = TestBed.inject(OperacionService);

    await servicio.registrarProducto(bebida('Tónica de pomelo'));

    const guardada = servicio.productos().find((p) => p.nombre === 'Tónica de pomelo')!;
    expect(guardada.sector).toBe('bar');
    expect(guardada.tipo).toBe('bebida');
  });

  it('rechaza una bebida con un nombre que ya está en la carta', async () => {
    const servicio = TestBed.inject(OperacionService);
    const existente = servicio.productos().find((p) => p.tipo === 'bebida')!;
    const antes = servicio.productos().length;

    const resultado = await servicio.registrarProducto(bebida(existente.nombre));

    expect(resultado.ok).toBe(false);
    expect(servicio.productos().length).toBe(antes);
  });

  /**
   * El mensaje tiene que decir «bebida», no «plato», Y CON EL ARTÍCULO
   * QUE CORRESPONDE.
   *
   * Esto salió probando el punto 3 en el navegador: el cantinero veía
   * «Ya hay UN BEBIDA con ese nombre en la carta». El código guardaba el
   * sustantivo y escribía «un» a mano, así que la rama del plato se veía
   * perfecta y la de la bebida no. Es exactamente el tipo de detalle que
   * ninguna prueba del punto 2 podía atrapar.
   */
  it('nombra el tipo con su artículo en el mensaje de rechazo', async () => {
    const servicio = TestBed.inject(OperacionService);
    const existente = servicio.productos().find((p) => p.tipo === 'bebida')!;

    const resultado = await servicio.registrarProducto(bebida(existente.nombre.toUpperCase()));

    expect(resultado.error).toContain('una bebida');
    expect(resultado.error).not.toContain('un bebida');
    expect(resultado.error).not.toContain('plato');
  });

  it('usa el artículo masculino para los platos', async () => {
    const servicio = TestBed.inject(OperacionService);
    const existente = servicio.productos().find((p) => p.tipo === 'plato')!;

    const resultado = await servicio.registrarProducto({
      ...bebida(existente.nombre),
      tipo: 'plato',
    });

    expect(resultado.error).toContain('un plato');
  });

  it('reconoce la misma bebida aunque cambien mayúsculas y espacios', async () => {
    const servicio = TestBed.inject(OperacionService);
    const existente = servicio.productos().find((p) => p.tipo === 'bebida')!;
    const disfrazada = `  ${existente.nombre.toUpperCase().replace(/ /g, '   ')}  `;

    expect((await servicio.registrarProducto(bebida(disfrazada))).ok).toBe(false);
  });

  it('el cantinero solo ve bebidas en su listado', () => {
    const servicio = TestBed.inject(OperacionService);
    const deSuSector = servicio
      .productos()
      .filter((p) => p.tipo === tipoProductoDelPerfil('cantinero'));

    expect(deSuSector.length).toBeGreaterThan(0);
    expect(deSuSector.every((p) => p.tipo === 'bebida')).toBe(true);
  });

  it('da de baja una bebida y desaparece del listado', async () => {
    const servicio = TestBed.inject(OperacionService);
    await servicio.registrarProducto(bebida('Agua saborizada'));
    const creada = servicio.productos().find((p) => p.nombre === 'Agua saborizada')!;

    expect((await servicio.eliminarProducto(creada.id)).ok).toBe(true);
    expect(servicio.productos().some((p) => p.id === creada.id)).toBe(false);
  });
});

/**
 * Punto 4 del enunciado: «Agregar una nueva mesa (dispositivo 4).
 * Perfiles: dueño o supervisor.»
 *
 * Acá se fija la parte de datos: que no se pueda repetir el número y que
 * la mesa nazca disponible. Las validaciones del formulario viven en el
 * componente y los rangos en `RANGOS`, que es el espejo de los CHECK.
 */
describe('Alta de mesa · punto 4', () => {
  const mesa = (numero: number): AltaMesaDemo => ({
    numero,
    comensales: 4,
    tipo: 'estándar',
  });

  it('crea una mesa con un número libre', async () => {
    const servicio = TestBed.inject(OperacionService);
    const numero = Math.max(...servicio.mesas().map((m) => m.numero)) + 1;

    expect((await servicio.registrarMesa(mesa(numero))).ok).toBe(true);
    expect(servicio.mesas().some((m) => m.numero === numero)).toBe(true);
  });

  /**
   * «Se verifica la existencia de la nueva mesa (listado)».
   *
   * `mesas.numero` es `unique` en la base. Sin este control, repetir un
   * número llegaba al insert y volvía como «No se pudo guardar datos.
   * Revisá la conexión», que además manda a mirar la conexión.
   */
  it('rechaza un número de mesa que ya existe, y dice cuál', async () => {
    const servicio = TestBed.inject(OperacionService);
    const existente = servicio.mesas()[0];
    const antes = servicio.mesas().length;

    const resultado = await servicio.registrarMesa(mesa(existente.numero));

    expect(resultado.ok).toBe(false);
    expect(resultado.error).toContain(String(existente.numero));
    expect(servicio.mesas().length).toBe(antes);
  });

  /** «Disponibilidad (vacía, por defecto)». */
  it('la mesa nueva nace disponible', async () => {
    const servicio = TestBed.inject(OperacionService);
    const numero = Math.max(...servicio.mesas().map((m) => m.numero)) + 1;

    await servicio.registrarMesa(mesa(numero));

    expect(servicio.mesas().find((m) => m.numero === numero)!.disponible).toBe(true);
  });

  /** «Generar el código QR correspondiente de forma automática». */
  it('la mesa nueva viene con su token de QR', async () => {
    const servicio = TestBed.inject(OperacionService);
    const numero = Math.max(...servicio.mesas().map((m) => m.numero)) + 1;

    await servicio.registrarMesa(mesa(numero));

    const creada = servicio.mesas().find((m) => m.numero === numero)!;
    expect(creada.qrToken).toBeTruthy();
    expect(creada.qrToken).not.toBe(servicio.mesas()[0].qrToken);
  });

  /** «Permitir la gestión de mesas, dando la posibilidad de modificar la disponibilidad». */
  it('libera y ocupa una mesa', async () => {
    const servicio = TestBed.inject(OperacionService);
    const numero = servicio.mesas()[0].numero;
    const antes = servicio.mesas()[0].disponible;

    expect((await servicio.cambiarDisponibilidadMesa(numero)).ok).toBe(true);
    expect(servicio.mesas().find((m) => m.numero === numero)!.disponible).toBe(!antes);

    await servicio.cambiarDisponibilidadMesa(numero);
    expect(servicio.mesas().find((m) => m.numero === numero)!.disponible).toBe(antes);
  });
});

/**
 * Gestión de mesas: modificar y sacar del salón.
 *
 * El enunciado solo pide poder cambiar la disponibilidad. Esto va más
 * allá, y la razón es práctica: sin borrado no hay forma de probar el
 * alta sin dejar el salón lleno de mesas de prueba, y un restaurante con
 * quince mesas numeradas salteado no es creíble en una defensa.
 */
describe('Gestión de mesas · modificar y sacar (punto 4)', () => {
  const mesa = (numero: number): AltaMesaDemo => ({ numero, comensales: 4, tipo: 'estándar' });

  it('cambia los datos de una mesa sin tocar su número', async () => {
    const servicio = TestBed.inject(OperacionService);
    const existente = servicio.mesas()[0];

    const resultado = await servicio.actualizarMesa(existente.id, {
      numero: existente.numero,
      comensales: 2,
      tipo: 'VIP',
    });

    expect(resultado.ok).toBe(true);
    const guardada = servicio.mesas().find((m) => m.id === existente.id)!;
    expect(guardada.comensales).toBe(2);
    expect(guardada.tipo).toBe('VIP');
  });

  it('al modificar, no deja tomar el número de otra mesa', async () => {
    const servicio = TestBed.inject(OperacionService);
    const [una, otra] = servicio.mesas();

    const resultado = await servicio.actualizarMesa(una.id, mesa(otra.numero));

    expect(resultado.ok).toBe(false);
    expect(resultado.error).toContain(String(otra.numero));
    expect(servicio.mesas().find((m) => m.id === una.id)!.numero).toBe(una.numero);
  });

  it('saca del salón una mesa libre', async () => {
    const servicio = TestBed.inject(OperacionService);
    const libre = servicio.mesas().find((m) => m.disponible)!;

    expect((await servicio.eliminarMesa(libre.id)).ok).toBe(true);
    expect(servicio.mesas().some((m) => m.id === libre.id)).toBe(false);
  });

  /**
   * Una mesa ocupada tiene gente sentada. La base la rechazaría igual
   * —`sesiones_mesa` no cascadea— pero con un error de clave foránea
   * que en pantalla no dice nada útil. Se avisa antes y con nombre.
   */
  it('no deja sacar una mesa ocupada, y explica por qué', async () => {
    const servicio = TestBed.inject(OperacionService);
    const ocupada = servicio.mesas().find((m) => !m.disponible)!;

    const resultado = await servicio.eliminarMesa(ocupada.id);

    expect(resultado.ok).toBe(false);
    expect(resultado.error).toContain('ocupada');
    expect(servicio.mesas().some((m) => m.id === ocupada.id)).toBe(true);
  });

  it('avisa si la mesa ya no existe', async () => {
    const servicio = TestBed.inject(OperacionService);
    expect((await servicio.eliminarMesa('mesa-inexistente')).ok).toBe(false);
  });
});
