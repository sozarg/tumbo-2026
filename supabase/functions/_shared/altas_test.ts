import { strict as assert } from 'node:assert';
import jpeg from 'npm:jpeg-js@0.4.4';
// @deno-types="npm:@types/pngjs@6.0.5"
import { PNG } from 'npm:pngjs@7.0.0';
import { Buffer } from 'node:buffer';
import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { validarEmpleado, validarProducto, validarMesa } from '../_shared/validacion-altas.ts';
import { imagenSegura } from '../_shared/imagen-segura.ts';
import { atenderAlta } from '../_shared/alta.ts';
const empleado = {
  nombres: 'María José',
  apellidos: "Muñoz O'Neill",
  dni: '43210987',
  cuil: '27432109874',
  correo: 'fixture@example.invalid',
  clave: 'PruebaSoloTests',
  perfil: 'cocinero',
};
const producto = {
  nombre: 'Plato de prueba',
  descripcion: 'Descripción válida para probar',
  tipo: 'plato',
  minutos: 10,
  precio: 100,
};
const mesa = { numero: 900, comensales: 4, tipo: 'vip' };
Deno.test('empleado: tipos, vacíos, formato, CUIL, privilegios y contraseña', () => {
  assert.equal(validarEmpleado(empleado).nombres, 'María José');
  for (const cambio of [
    { nombres: [] },
    { apellidos: ' ' },
    { dni: 12345678 },
    { cuil: '27432109879' },
    { dni: '12345678' },
    { correo: 'sin correo' },
    { clave: 123456 },
    { clave: '      ' },
    { clave: 'á'.repeat(37) },
    { perfil: 'dueno' },
  ])
    assert.throws(() => validarEmpleado({ ...empleado, ...cambio }));
});
Deno.test('producto: límites, precisión, tipos y sector', () => {
  assert.equal(validarProducto(producto).precio, 100);
  for (const cambio of [
    { nombre: ' ' },
    { descripcion: 'corta' },
    { minutos: 0 },
    { minutos: 601 },
    { minutos: 1.5 },
    { precio: 0.99 },
    { precio: 1.001 },
    { precio: '100' },
    { tipo: 'otro' },
  ])
    assert.throws(() => validarProducto({ ...producto, ...cambio }));
});
Deno.test('límites de textos y campos obligatorios en los cuatro contratos', () => {
  for (const campo of ['nombres', 'apellidos', 'dni', 'cuil', 'correo', 'clave', 'perfil'])
    for (const valor of [null, {}, [], 42, '', '   '])
      assert.throws(() => validarEmpleado({ ...empleado, [campo]: valor }));
  for (const campo of ['nombres', 'apellidos']) {
    for (const n of [2, 50])
      assert.equal(
        validarEmpleado({ ...empleado, [campo]: 'a'.repeat(n) })[campo as 'nombres' | 'apellidos']
          .length,
        n,
      );
    for (const n of [1, 51])
      assert.throws(() => validarEmpleado({ ...empleado, [campo]: 'a'.repeat(n) }));
  }
  for (const tipo of ['plato', 'bebida']) {
    for (const [campo, min, max] of [
      ['nombre', 2, 60],
      ['descripcion', 10, 300],
    ] as const) {
      for (const n of [min, max])
        assert.equal(
          validarProducto({ ...producto, tipo, [campo]: 'a'.repeat(n) })[campo].length,
          n,
        );
      for (const v of [null, 42, [], {}, '   ', 'a'.repeat(min - 1), 'a'.repeat(max + 1)])
        assert.throws(() => validarProducto({ ...producto, tipo, [campo]: v }));
    }
    for (const minutos of [1, 600])
      assert.equal(validarProducto({ ...producto, tipo, minutos }).minutos, minutos);
    for (const precio of [1, 99999999.99])
      assert.equal(validarProducto({ ...producto, tipo, precio }).precio, precio);
  }
  for (const n of [1, 999]) assert.equal(validarMesa({ ...mesa, numero: n }).numero, n);
  for (const n of [1, 20]) assert.equal(validarMesa({ ...mesa, comensales: n }).comensales, n);
});
Deno.test('mesa: positivos, enteros, capacidad y enumeración', () => {
  assert.equal(validarMesa(mesa).tipo, 'vip');
  for (const cambio of [
    { numero: 0 },
    { numero: 1000 },
    { numero: '4' },
    { comensales: 1.2 },
    { comensales: 21 },
    { tipo: 'desconocido' },
  ])
    assert.throws(() => validarMesa({ ...mesa, ...cambio }));
});
const jpg = new Uint8Array(
  jpeg.encode({ width: 2, height: 2, data: Buffer.alloc(16, 255) }, 80).data,
);
Deno.test(
  'archivo: decodifica bytes reales y rechaza MIME engañoso, truncamiento y exceso',
  async () => {
    assert.ok((await imagenSegura(new File([jpg], 'foto.jpg', { type: 'image/jpeg' }))).length > 0);
    const png = PNG.sync.write({ width: 2, height: 2, data: Buffer.alloc(16, 255) } as PNG);
    assert.ok(
      (await imagenSegura(new File([new Uint8Array(png)], 'foto.png', { type: 'image/png' })))
        .length > 0,
    );
    for (const data of [
      new Uint8Array(),
      new TextEncoder().encode('imagen falsa'),
      jpg.slice(0, 30),
      new Uint8Array(5242881),
    ])
      await assert.rejects(() =>
        imagenSegura(new File([data], 'foto.jpg', { type: 'image/jpeg' })),
      );
  },
);
Deno.test(
  'segunda subida fallida: compensa solo la primera, no publica y admite reintento',
  async () => {
    const eliminadas: string[] = [];
    let subidas = 0,
      finalizaciones = 0,
      desbloqueos = 0;
    const mockFetch: typeof fetch = async (input, init) => {
      const u = String(input),
        method = init?.method ?? 'GET';
      const response = (v: unknown, status = 200) =>
        new Response(JSON.stringify(v), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      if (u.includes('/auth/v1/user'))
        return response({ id: '10000000-0000-4000-8000-000000000001' });
      if (u.includes('/rest/v1/usuarios'))
        return response({ perfil: 'cocinero', estado: 'aprobado' });
      if (u.includes('/rpc/reservar_alta'))
        return response({
          id: '10000000-0000-4000-8000-000000000002',
          recurso: '10000000-0000-4000-8000-000000000003',
          destino: null,
          finalizada: false,
        });
      if (u.includes('/rpc/finalizar_alta')) {
        finalizaciones++;
        return response({});
      }
      if (u.includes('/storage/v1/object/') && method === 'POST') {
        subidas++;
        return subidas === 2
          ? response({ message: 'Fallo controlado', statusCode: 500 }, 500)
          : response({ Key: 'subida' });
      }
      if (u.includes('/storage/v1/object/') && method === 'DELETE') {
        eliminadas.push(String(init?.body));
        return response([]);
      }
      if (u.includes('/rest/v1/solicitudes_alta')) {
        if (method === 'PATCH') desbloqueos++;
        return response({ finalizada: false });
      }
      throw Error('Petición inesperada: ' + u);
    };
    const client = createClient('https://fixture.invalid', 'clave-de-prueba', {
      global: { fetch: mockFetch },
      auth: { persistSession: false },
    });
    const f = new FormData();
    f.set('solicitud', '10000000-0000-4000-8000-000000000002');
    f.set('datos', JSON.stringify(producto));
    for (let i = 1; i <= 3; i++) f.set('foto' + i, new File([jpg], 'foto.jpg'));
    const r = await atenderAlta(
      new Request('https://fixture.invalid', {
        method: 'POST',
        headers: { Authorization: 'Bearer prueba' },
        body: f,
      }),
      'producto',
      client,
    );
    assert.equal(r.status, 503);
    assert.equal(finalizaciones, 0);
    assert.equal(eliminadas.length, 1);
    assert.equal(desbloqueos, 1);
    const retry = await atenderAlta(
      new Request('https://fixture.invalid', {
        method: 'POST',
        headers: { Authorization: 'Bearer prueba' },
        body: f,
      }),
      'producto',
      client,
    );
    assert.equal(retry.status, 201);
    assert.equal(finalizaciones, 1);
    assert.equal(subidas, 5);
  },
);
Deno.test(
  'empleado: fallo parcial mantiene cuenta bloqueada y reintento activa la misma identidad',
  async () => {
    const id = '10000000-0000-4000-8000-000000000002',
      recurso = '10000000-0000-4000-8000-000000000003';
    let creada = false,
      creaciones = 0,
      finalizaciones = 0,
      activaciones = 0;
    const mockFetch: typeof fetch = async (input, init) => {
      const u = String(input),
        method = init?.method ?? 'GET';
      const response = (v: unknown, status = 200) =>
        new Response(JSON.stringify(v), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      if (u.includes('/auth/v1/user'))
        return response({ id: '10000000-0000-4000-8000-000000000001' });
      if (u.includes('/auth/v1/admin/users')) {
        if (method === 'POST') {
          const body = JSON.parse(String(init?.body));
          assert.equal(body.ban_duration, '876000h');
          creada = true;
          creaciones++;
        }
        if (method === 'PUT') {
          assert.equal(JSON.parse(String(init?.body)).ban_duration, 'none');
          activaciones++;
        }
        return creada
          ? response({ id: recurso, email: empleado.correo, app_metadata: { solicitud_alta: id } })
          : response({ message: 'No existe', code: 'user_not_found' }, 404);
      }
      if (u.includes('/rest/v1/usuarios')) return response({ perfil: 'dueno', estado: 'aprobado' });
      if (u.includes('/rpc/reservar_alta'))
        return response({ id, recurso, destino: null, finalizada: false });
      if (u.includes('/rpc/finalizar_alta')) {
        finalizaciones++;
        return finalizaciones === 1
          ? response({ message: 'Fallo de escritura controlado', code: '23514' }, 400)
          : response(recurso);
      }
      if (u.includes('/storage/v1/object/'))
        return response(method === 'DELETE' ? [] : { Key: 'subida' });
      if (u.includes('/rest/v1/solicitudes_alta')) return response({ finalizada: false });
      throw Error('Ruta inesperada');
    };
    const client = createClient('https://fixture.invalid', 'clave-de-prueba', {
      global: { fetch: mockFetch },
      auth: { persistSession: false },
    });
    const f = new FormData();
    f.set('solicitud', id);
    f.set('datos', JSON.stringify(empleado));
    f.set('foto1', new File([jpg], 'foto.jpg'));
    const enviar = () =>
      atenderAlta(
        new Request('https://fixture.invalid', {
          method: 'POST',
          headers: { Authorization: 'Bearer prueba' },
          body: f,
        }),
        'empleado',
        client,
      );
    assert.equal((await enviar()).status, 400);
    assert.equal(activaciones, 0);
    assert.equal(creaciones, 1);
    assert.equal((await enviar()).status, 201);
    assert.equal(activaciones, 1);
    assert.equal(creaciones, 1);
  },
);
