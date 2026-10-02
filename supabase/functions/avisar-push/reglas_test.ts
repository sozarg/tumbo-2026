import { strict as assert } from 'node:assert';
import {
  DESTINATARIOS_DE_CUENTA,
  avisoDeClientePendiente,
  avisoDeCuenta,
  avisoDeEspera,
  avisoDeMensaje,
  avisoDePedido,
  avisoDePedidoListo,
  clasificar,
  detalleDeItems,
  recortar,
} from './reglas.ts';

Deno.test('un cliente que se registra avisa a gerencia (punto 6)', () => {
  assert.deepEqual(
    clasificar({
      type: 'INSERT',
      table: 'usuarios',
      record: { id: 'u1', perfil: 'cliente_registrado', estado: 'pendiente' },
    }),
    { tipo: 'cliente_pendiente', id: 'u1' },
  );
});

Deno.test('un empleado nuevo o un cliente ya resuelto no avisan', () => {
  const empleado = clasificar({
    type: 'INSERT',
    table: 'usuarios',
    record: { id: 'u2', perfil: 'mozo', estado: 'aprobado' },
  });
  assert.equal(empleado.tipo, 'ignorado');
});

Deno.test('un pedido que pasa a listo avisa al mozo (punto 18)', () => {
  assert.deepEqual(
    clasificar({ type: 'UPDATE', table: 'pedidos', record: { id: 'p1', estado: 'listo' } }),
    { tipo: 'pedido_listo', id: 'p1' },
  );
});

Deno.test('un pedido en cualquier otro estado no avisa', () => {
  for (const estado of ['en_preparacion', 'entregado', 'recibido', 'pagado']) {
    const evento = clasificar({ type: 'UPDATE', table: 'pedidos', record: { id: 'p1', estado } });
    assert.equal(evento.tipo, 'ignorado', estado);
  }
});

Deno.test('sin fila, o con una tabla que no avisa, se ignora', () => {
  assert.equal(clasificar({ type: 'UPDATE', table: 'pedidos' }).tipo, 'ignorado');
  assert.equal(
    clasificar({ type: 'UPDATE', table: 'mesas', record: { id: 'm1', estado: 'listo' } }).tipo,
    'ignorado',
  );
  assert.equal(
    clasificar({ type: 'INSERT', table: 'pedidos', record: { id: 'p1', estado: 'listo' } }).tipo,
    'ignorado',
  );
});

Deno.test('el aviso del pedido nombra la mesa y lleva a Pedidos', () => {
  const aviso = avisoDePedidoListo(4);
  assert.equal(aviso.titulo, 'Pedido listo para entregar');
  assert.match(aviso.cuerpo, /mesa 4/);
  assert.equal(aviso.seccion, 'pedidos');
  assert.doesNotMatch(avisoDePedidoListo(null).cuerpo, /null/);
});

Deno.test('el aviso del cliente pendiente conserva su texto', () => {
  assert.equal(
    avisoDeClientePendiente('Camila', 'Pérez').cuerpo,
    'Camila Pérez se registró y espera tu aprobación.',
  );
  assert.match(avisoDeClientePendiente(null, null).cuerpo, /^Un cliente/);
});

Deno.test('los momentos de la cuenta avisan (puntos 21 y 22)', () => {
  assert.deepEqual(
    clasificar({ type: 'INSERT', table: 'cuentas', record: { id: 'c1', estado: 'pendiente' } }),
    { tipo: 'cuenta', id: 'c1', momento: 'solicitada' },
  );
  assert.deepEqual(
    clasificar({ type: 'UPDATE', table: 'cuentas', record: { id: 'c1', estado: 'pagada' } }),
    { tipo: 'cuenta', id: 'c1', momento: 'pagada' },
  );
  assert.deepEqual(
    clasificar({ type: 'UPDATE', table: 'cuentas', record: { id: 'c1', estado: 'confirmada' } }),
    { tipo: 'cuenta', id: 'c1', momento: 'confirmada' },
  );
  assert.equal(
    clasificar({ type: 'UPDATE', table: 'cuentas', record: { id: 'c1', estado: 'pendiente' } }).tipo,
    'ignorado',
  );
});

Deno.test('cada momento de la cuenta le llega a quien corresponde', () => {
  assert.deepEqual([...DESTINATARIOS_DE_CUENTA.solicitada], ['mozo']);
  assert.deepEqual([...DESTINATARIOS_DE_CUENTA.pagada].sort(), ['dueno', 'mozo', 'supervisor']);
  assert.deepEqual([...DESTINATARIOS_DE_CUENTA.confirmada].sort(), ['dueno', 'supervisor']);
});

Deno.test('los avisos de la cuenta dicen la mesa y el monto', () => {
  assert.equal(avisoDeCuenta('solicitada', 4, 0).cuerpo, 'La mesa 4 pide la cuenta.');
  assert.match(avisoDeCuenta('pagada', 4, 44400).cuerpo, /^La mesa 4 pagó \$\s?44\.400\. Confirmá el pago\.$/);
  assert.match(avisoDeCuenta('confirmada', null, 100).cuerpo, /^Una mesa pagó .* y quedó libre\.$/);
});

Deno.test('el pedido que nace pendiente avisa a los mozos (punto 12)', () => {
  assert.deepEqual(
    clasificar({
      type: 'INSERT',
      table: 'pedidos',
      record: { id: 'p2', estado: 'pendiente_confirmacion' },
    }),
    { tipo: 'pedido', id: 'p2', momento: 'enviado' },
  );
  // Un pedido que nace en borrador no le interesa a nadie todavía.
  assert.equal(
    clasificar({ type: 'INSERT', table: 'pedidos', record: { id: 'p3', estado: 'borrador' } }).tipo,
    'ignorado',
  );
});

Deno.test('rechazo y confirmación son momentos distintos (puntos 13 y 14)', () => {
  assert.deepEqual(
    clasificar({ type: 'UPDATE', table: 'pedidos', record: { id: 'p4', estado: 'rechazado' } }),
    { tipo: 'pedido', id: 'p4', momento: 'rechazado' },
  );
  assert.deepEqual(
    clasificar({ type: 'UPDATE', table: 'pedidos', record: { id: 'p4', estado: 'confirmado' } }),
    { tipo: 'pedido', id: 'p4', momento: 'confirmado' },
  );
  // Un INSERT ya rechazado o confirmado no es un evento del circuito.
  assert.equal(
    clasificar({ type: 'INSERT', table: 'pedidos', record: { id: 'p5', estado: 'confirmado' } }).tipo,
    'ignorado',
  );
});

Deno.test('el rechazo le dice el motivo al cliente', () => {
  const aviso = avisoDePedido('rechazado', 4, { motivo: 'No queda bife de chorizo' });
  assert.equal(aviso.titulo, 'El mozo rechazó tu pedido');
  assert.equal(
    aviso.cuerpo,
    'Motivo: No queda bife de chorizo. Podés modificarlo y volver a enviarlo.',
  );
  assert.equal(
    avisoDePedido('rechazado', 4, { motivo: '  ' }).cuerpo,
    'Podés modificarlo y volver a enviarlo.',
  );
});

Deno.test('cocina y bar reciben solo lo suyo, con la mesa (punto 14)', () => {
  const detalle = detalleDeItems([
    { cantidad: 2, nombre: 'Bife de chorizo' },
    { cantidad: 1, nombre: 'Flan' },
  ]);
  assert.equal(detalle, '2 × Bife de chorizo, 1 × Flan');
  const aviso = avisoDePedido('confirmado', 7, { detalle });
  assert.equal(aviso.titulo, 'Nuevo pedido · mesa 7');
  assert.equal(aviso.cuerpo, 'Para preparar: 2 × Bife de chorizo, 1 × Flan.');
});

Deno.test('los mensajes avisan (punto 11): consulta a mozos, respuesta al cliente', () => {
  assert.deepEqual(clasificar({ type: 'INSERT', table: 'mensajes', record: { id: 'm1' } }), {
    tipo: 'mensaje',
    id: 'm1',
  });
  assert.equal(avisoDeMensaje(true, 3, '¿Tienen opciones sin TACC?').titulo, 'Consulta de la mesa 3');
  assert.equal(avisoDeMensaje(false, 3, 'Sí, tenemos.').titulo, 'El mozo te respondió');
});

Deno.test('un texto largo se recorta para que entre en la notificación', () => {
  const largo = 'palabra '.repeat(40);
  const corto = recortar(largo);
  assert.ok(corto.length <= 140);
  assert.ok(corto.endsWith('…'));
  assert.equal(recortar('  hola   mozo  '), 'hola mozo');
});

Deno.test('la lista de espera avisa al metre y al cliente (puntos 9 y 10)', () => {
  assert.deepEqual(
    clasificar({ type: 'INSERT', table: 'lista_espera', record: { id: 'e1', estado: 'esperando' } }),
    { tipo: 'espera', id: 'e1', momento: 'nueva' },
  );
  assert.deepEqual(
    clasificar({ type: 'UPDATE', table: 'lista_espera', record: { id: 'e1', estado: 'asignado' } }),
    { tipo: 'espera', id: 'e1', momento: 'asignada' },
  );
  for (const estado of ['eliminado', 'finalizado']) {
    assert.equal(
      clasificar({ type: 'UPDATE', table: 'lista_espera', record: { id: 'e1', estado } }).tipo,
      'ignorado',
      estado,
    );
  }
  assert.equal(avisoDeEspera('nueva', 'Lucía', null).cuerpo, 'Lucía se anotó y espera una mesa.');
  assert.equal(avisoDeEspera('asignada', null, 4).titulo, 'Tu mesa es la 4');
});
