import { strict as assert } from 'node:assert';
import {
  DESTINATARIOS_DE_CUENTA,
  avisoDeClientePendiente,
  avisoDeCuenta,
  avisoDePedidoListo,
  clasificar,
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
