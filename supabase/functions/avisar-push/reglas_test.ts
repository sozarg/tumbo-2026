import { strict as assert } from 'node:assert';
import { avisoDeClientePendiente, avisoDePedidoListo, clasificar } from './reglas.ts';

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
  for (const estado of ['confirmado', 'en_preparacion', 'entregado']) {
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
