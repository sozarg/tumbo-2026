import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import qrcode from 'qrcode';
import jsQR from 'jsqr';
const ref = process.env.TUMBO_TEST_PROJECT;
if (ref !== 'weeemajondwqstaoldtu' || process.env.TUMBO_TEST_DEVELOPMENT !== 'yes')
  throw Error('Se requiere identificar y autorizar explícitamente el proyecto de desarrollo.');
const llaves = JSON.parse(
  execFileSync('cmd.exe', ['/c', 'npx', 'supabase', 'projects', 'api-keys', '--project-ref', ref], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }),
).keys;
const secret = llaves.find((k) => k.name === 'service_role')?.api_key,
  anon = llaves.find((k) => k.name === 'anon')?.api_key;
if (!secret || !anon) throw Error('No se pudieron obtener las claves del proyecto autorizado.');
const url = `https://${ref}.supabase.co`;
const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const usuarios = [],
  productos = [],
  mesas = [],
  solicitudes = [],
  resultados = [];
const run = 'qa0104' + Date.now();
const clave = randomBytes(24).toString('base64url');
let dniBase = 80000000 + Math.floor(Math.random() * 1000000);
function persona(perfil) {
  let dni, cuil;
  do {
    dni = String(++dniBase);
    const n = '20' + dni;
    const suma = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2].reduce((s, p, i) => s + p * Number(n[i]), 0);
    const dig = (11 - (suma % 11)) % 11;
    cuil = dig < 10 ? n + dig : null;
  } while (!cuil);
  return {
    nombres: 'Persona',
    apellidos: 'Prueba',
    dni,
    cuil,
    correo: `${run}.${dni}@example.invalid`,
    clave,
    perfil,
  };
}
function ok(nombre, condicion) {
  assert.ok(condicion, nombre);
  resultados.push(nombre);
  console.log('OK', nombre);
}
async function fixture(perfil) {
  const d = persona(perfil);
  const r = await admin.auth.admin.createUser({
    email: d.correo,
    password: clave,
    email_confirm: true,
    user_metadata: { nombres: d.nombres, apellidos: d.apellidos, dni: d.dni, cuil: d.cuil },
    app_metadata: { perfil, estado: 'aprobado' },
  });
  if (r.error) throw Error('No se pudo preparar fixture ' + perfil + ': ' + r.error.code);
  usuarios.push(r.data.user.id);
  const p = await admin
    .from('usuarios')
    .update({ perfil, estado: 'aprobado' })
    .eq('id', r.data.user.id);
  assert.ifError(p.error);
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await client.auth.signInWithPassword({ email: d.correo, password: clave });
  assert.ifError(login.error);
  return { client, id: r.data.user.id, token: login.data.session.access_token, datos: d };
}
const image = await sharp({
  create: { width: 160, height: 120, channels: 3, background: '#FBB103' },
})
  .jpeg()
  .toBuffer();
async function enviar(
  actor,
  funcion,
  datos,
  cantidad = 1,
  destino = null,
  id = randomUUID(),
  corrupta = false,
  posiciones = null,
) {
  solicitudes.push(id);
  const f = new FormData();
  f.set('solicitud', id);
  f.set('datos', JSON.stringify(datos));
  if (destino) f.set('destino', destino);
  for (let i = 0; i < cantidad; i++)
    f.set(
      `foto${posiciones?.[i] ?? i + 1}`,
      new Blob([corrupta ? Buffer.from('no es imagen') : image], { type: 'image/jpeg' }),
      `foto${i}.jpg`,
    );
  const r = await fetch(`${url}/functions/v1/${funcion}`, {
    method: 'POST',
    headers: { apikey: anon, ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}) },
    body: f,
  });
  const b = await r.json();
  return { status: r.status, body: b };
}
try {
  const dueno = await fixture('dueno'),
    supervisor = await fixture('supervisor'),
    cocinero = await fixture('cocinero'),
    cantinero = await fixture('cantinero'),
    cliente = await fixture('cliente_registrado');
  if (process.env.TUMBO_BROWSER_ONLY === 'yes') {
    const { probarBrowser } = await import(
      process.env.TUMBO_BROWSER_TESTS === 'yes' ? './ui-altas.mjs' : process.env.TUMBO_BROWSER_TESTS
    );
    await probarBrowser({
      dueno,
      supervisor,
      cocinero,
      cantinero,
      cliente,
      productos,
      mesas,
      clave,
      ok,
      admin,
      run,
      usuarios,
      image,
    });
  } else {
    for (const actor of [dueno, supervisor]) {
      const datos = persona('cocinero'),
        id = randomUUID();
      const r = await enviar(actor, 'crear-empleado', datos, 1, null, id);
      if (!r.body.ok) console.log('ERROR_ALTA', r.status, JSON.stringify(r.body));
      ok('alta empleado ' + actor.datos.perfil, r.status === 201 && r.body.ok);
      usuarios.push(r.body.id);
      const perfil = await actor.client
        .from('usuarios')
        .select('perfil,estado,foto_url')
        .eq('id', r.body.id)
        .single();
      ok(
        'legajo y foto ' + actor.datos.perfil,
        perfil.data?.perfil === 'cocinero' &&
          perfil.data.estado === 'aprobado' &&
          Boolean(perfil.data.foto_url),
      );
      const otro = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const login = await otro.auth.signInWithPassword({ email: datos.correo, password: clave });
      ok('login empleado ' + actor.datos.perfil, !login.error);
      await otro.auth.signOut();
      ok(
        'sesión gerencial intacta ' + actor.datos.perfil,
        (await actor.client.auth.getUser()).data.user?.id === actor.id,
      );
      const retry = await enviar(actor, 'crear-empleado', datos, 1, null, id);
      ok('reintento empleado idempotente', retry.body.id === r.body.id);
    }
    for (const actor of [cliente, cocinero, null]) {
      const r = await enviar(actor, 'crear-empleado', persona('cocinero'));
      ok(
        'alta empleado no autorizada ' + (actor?.datos.perfil ?? 'anon'),
        [401, 403].includes(r.status),
      );
    }
    for (const cambio of [
      { perfil: 'dueno' },
      { dni: 12 },
      { nombres: [] },
      { clave: 123456 },
      { cuil: '20123456789' },
      { correo: 'no-correo' },
    ]) {
      const r = await enviar(dueno, 'crear-empleado', { ...persona('cocinero'), ...cambio });
      ok('empleado entrada inválida ' + Object.keys(cambio)[0], r.status === 400);
    }
    const prod = {
      nombre: run + ' plato',
      descripcion: 'Descripción sintética de prueba de integración',
      tipo: 'plato',
      minutos: 15,
      precio: 1500.5,
    };
    for (const [actor, tipo] of [
      [cocinero, 'plato'],
      [cantinero, 'bebida'],
    ]) {
      const datos = { ...prod, tipo, nombre: run + ' ' + tipo },
        request = randomUUID();
      const r = await enviar(actor, 'guardar-producto', datos, 3, null, request);
      if (!r.body.ok) console.log('ERROR_PRODUCTO', r.status, JSON.stringify(r.body));
      ok('alta ' + tipo, r.status === 201 && r.body.ok);
      productos.push(r.body.id);
      const vista = await cliente.client
        .from('productos')
        .select('nombre,descripcion,precio,tiempo_elaboracion_min,producto_fotos(url,orden)')
        .eq('id', r.body.id)
        .single();
      ok(
        'carta otra sesión ' + tipo,
        vista.data?.nombre === datos.nombre &&
          vista.data.producto_fotos.length === 3 &&
          vista.data.precio === 1500.5,
      );
      for (const f of vista.data.producto_fotos)
        ok('objeto real ' + tipo + ' ' + f.orden, (await fetch(f.url)).status === 200);
      const repetido = await enviar(actor, 'guardar-producto', datos, 3, null, request);
      ok('producto reintento sin duplicar ' + tipo, repetido.body.id === r.body.id);
      for (const pos of [1, 2, 3]) {
        const antes = await cliente.client
          .from('producto_fotos')
          .select('url,orden')
          .eq('producto_id', r.body.id)
          .order('orden');
        const cambio = await enviar(
          actor,
          'guardar-producto',
          datos,
          1,
          r.body.id,
          randomUUID(),
          false,
          [pos],
        );
        ok('reemplazo ' + tipo + ' ' + pos, cambio.body.ok);
        const despues = await cliente.client
          .from('producto_fotos')
          .select('url,orden')
          .eq('producto_id', r.body.id)
          .order('orden');
        ok(
          'solo posición y caché ' + tipo + ' ' + pos,
          despues.data.every((f, i) =>
            pos === f.orden ? f.url !== antes.data[i].url : f.url === antes.data[i].url,
          ),
        );
      }
      for (const n of [0, 1, 2, 4])
        ok(
          tipo + ' rechaza ' + n + ' fotos',
          (await enviar(actor, 'guardar-producto', { ...datos, nombre: datos.nombre + n }, n))
            .status === 400,
        );
      ok(
        tipo + ' rechaza archivo corrupto',
        (
          await enviar(
            actor,
            'guardar-producto',
            { ...datos, nombre: datos.nombre + ' roto' },
            3,
            null,
            randomUUID(),
            true,
          )
        ).status === 400,
      );
    }
    ok(
      'cocinero no crea bebida',
      (await enviar(cocinero, 'guardar-producto', { ...prod, tipo: 'bebida' }, 3)).status === 403,
    );
    const dobleId = randomUUID();
    const dobles = await Promise.all([
      enviar(
        cocinero,
        'guardar-producto',
        { ...prod, nombre: run + ' concurrente' },
        3,
        null,
        dobleId,
      ),
      enviar(
        cocinero,
        'guardar-producto',
        { ...prod, nombre: run + ' concurrente' },
        3,
        null,
        dobleId,
      ),
    ]);
    const guardado = dobles.find((r) => r.body.ok);
    ok(
      'doble envío concurrente confirma un único recurso',
      Boolean(guardado) && dobles.every((r) => r.status === 409 || r.body.id === guardado.body.id),
    );
    productos.push(guardado.body.id);
    ok(
      'reintento tras concurrencia recupera el mismo recurso',
      (
        await enviar(
          cocinero,
          'guardar-producto',
          { ...prod, nombre: run + ' concurrente' },
          3,
          null,
          dobleId,
        )
      ).body.id === guardado.body.id,
    );
    ok(
      'cantinero no edita plato',
      (await enviar(cantinero, 'guardar-producto', { ...prod, tipo: 'bebida' }, 1, productos[0]))
        .status === 403,
    );
    ok(
      'cliente no sobrescribe Storage',
      Boolean(
        (
          await cliente.client.storage
            .from('fotos-productos')
            .upload(`${productos[0]}/ajeno.jpg`, image, { contentType: 'image/jpeg', upsert: true })
        ).error,
      ),
    );
    const existentes = await admin.from('mesas').select('numero');
    const usados = new Set(existentes.data.map((m) => m.numero));
    let numero = 990;
    while (usados.has(numero)) numero--;
    for (const [i, tipo] of ['vip', 'estandar', 'movilidad_reducida'].entries()) {
      while (usados.has(numero)) numero--;
      const n = numero--;
      const actor = i % 2 ? supervisor : dueno;
      const datos = { numero: n, comensales: 4, tipo };
      const id = randomUUID();
      const r = await enviar(actor, 'guardar-mesa', datos, 1, null, id);
      if (!r.body.ok) console.log('ERROR_MESA', r.status, JSON.stringify(r.body));
      ok('alta mesa ' + tipo, r.body.ok);
      mesas.push(r.body.id);
      const m = await cliente.client.from('mesas').select('*').eq('id', r.body.id).single();
      ok(
        'mesa persistida y libre ' + tipo,
        m.data.estado === 'libre' && Boolean(m.data.foto_url) && Boolean(m.data.qr_token),
      );
      const cambio = await actor.client
        .from('mesas')
        .update({ estado: 'ocupada' })
        .eq('id', r.body.id)
        .select();
      ok('bloqueo administrativo ' + tipo, cambio.data?.[0].bloqueada_administrativamente === true);
      ok(
        'otra sesión ve disponibilidad ' + tipo,
        (await cliente.client.from('mesas').select('estado').eq('id', r.body.id).single()).data
          .estado === 'ocupada',
      );
      await actor.client.from('mesas').update({ estado: 'libre' }).eq('id', r.body.id);
      const retry = await enviar(actor, 'guardar-mesa', datos, 1, null, id);
      ok('mesa reintento mismo id ' + tipo, retry.body.id === r.body.id);
      ok('número duplicado ' + tipo, (await enviar(actor, 'guardar-mesa', datos)).status === 400);
    }
    // QR: generador de la app (qrcode) y decodificador independiente jsQR.
    const filas = await cliente.client.from('mesas').select('id,qr_token').in('id', mesas);
    const contenidos = [];
    for (const mesa of filas.data) {
      const contenido = `TUMBO://mesa/${mesa.qr_token}`;
      const png = await qrcode.toBuffer(contenido, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#003592ff', light: '#ffffffff' },
      });
      const raw = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const decodificado = jsQR(new Uint8ClampedArray(raw.data), raw.info.width, raw.info.height);
      ok('QR decodificado y asociado a fila', decodificado?.data === contenido);
      contenidos.push(decodificado.data);
    }
    ok('QR distintos', new Set(contenidos).size === mesas.length);
    const eventos = [];
    const canal = cliente.client
      .channel(run)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mesas', filter: `id=eq.${mesas[1]}` },
        (e) => eventos.push(e.new),
      );
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Realtime no suscribió')), 15000);
      canal.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    const cambioRemoto = await dueno.client
      .from('mesas')
      .update({ estado: 'ocupada' })
      .eq('id', mesas[1])
      .select('id');
    assert.ifError(cambioRemoto.error);
    assert.equal(cambioRemoto.data.length, 1);
    for (let i = 0; i < 200 && !eventos.length; i++) await new Promise((r) => setTimeout(r, 100));
    ok(
      'Realtime entre sesiones JWT distintas',
      eventos.some((e) => e.estado === 'ocupada'),
    );
    await cliente.client.removeChannel(canal);
    await dueno.client.from('mesas').update({ estado: 'libre' }).eq('id', mesas[1]);
    const despues = await cliente.client.from('mesas').select('id,qr_token').in('id', mesas);
    ok(
      'QR estable tras cambios de disponibilidad',
      despues.data.every((m) => filas.data.find((a) => a.id === m.id).qr_token === m.qr_token),
    );
    // Carrera real: liberar y abrir estadía nunca dejan libre una mesa con estadía activa.
    await Promise.all([
      dueno.client.from('mesas').update({ estado: 'libre' }).eq('id', mesas[2]),
      cliente.client.from('sesiones_mesa').insert({ mesa_id: mesas[2], cliente_id: cliente.id }),
    ]);
    const carreras = await admin
      .from('sesiones_mesa')
      .select('id')
      .eq('mesa_id', mesas[2])
      .eq('estado', 'activa');
    const estadoCarrera = await cliente.client
      .from('mesas')
      .select('estado')
      .eq('id', mesas[2])
      .single();
    ok(
      'carrera disponibilidad/estadía conserva invariante',
      !carreras.data.length || estadoCarrera.data.estado === 'ocupada',
    );
    if (carreras.data.length)
      await admin
        .from('sesiones_mesa')
        .delete()
        .in(
          'id',
          carreras.data.map((s) => s.id),
        );
    const activa = await cliente.client
      .from('sesiones_mesa')
      .insert({ mesa_id: mesas[0], cliente_id: cliente.id })
      .select()
      .single();
    assert.ifError(activa.error);
    const liberar = await dueno.client.from('mesas').update({ estado: 'libre' }).eq('id', mesas[0]);
    ok('no liberar estadía activa', liberar.error?.code === '23514');
    await admin.from('sesiones_mesa').delete().eq('id', activa.data.id);
    for (const datos of [
      { numero: 0, comensales: 4, tipo: 'vip' },
      { numero: 995, comensales: 2.5, tipo: 'vip' },
      { numero: 995, comensales: 4, tipo: 'desconocido' },
    ])
      ok(
        'mesa inválida ' + JSON.stringify(datos),
        (await enviar(dueno, 'guardar-mesa', datos)).status === 400,
      );
    ok(
      'mesa por cocinero denegada',
      (await enviar(cocinero, 'guardar-mesa', { numero: 995, comensales: 4, tipo: 'vip' }))
        .status === 403,
    );
    if (process.env.TUMBO_BROWSER_TESTS) {
      const { probarBrowser } = await import(
        process.env.TUMBO_BROWSER_TESTS === 'yes'
          ? './ui-altas.mjs'
          : process.env.TUMBO_BROWSER_TESTS
      );
      await probarBrowser({
        dueno,
        supervisor,
        cocinero,
        cantinero,
        cliente,
        productos,
        mesas,
        clave,
        ok,
        admin,
        run,
        usuarios,
        image,
      });
    }
  }
  writeFileSync(
    join(tmpdir(), 'tumbo-cierre-0104-resultados.json'),
    JSON.stringify({ run, pruebas: resultados }, null, 2),
  );
} finally {
  const propias = await admin
    .from('solicitudes_alta')
    .select('id,clase,recurso,destino')
    .in('actor', usuarios);
  assert.ifError(propias.error);
  for (const s of propias.data) {
    solicitudes.push(s.id);
    if (!s.destino) {
      const ids = s.clase === 'producto' ? productos : s.clase === 'mesa' ? mesas : usuarios;
      if (!ids.includes(s.recurso)) ids.push(s.recurso);
    }
  }
  // Solo recursos de esta ejecución, por sus UUID devueltos, nunca por filtros globales.
  for (const [bucket, ids] of [
    ['fotos-usuarios', usuarios],
    ['fotos-productos', productos],
    ['fotos-mesas', mesas],
  ])
    for (const id of ids) {
      const carpetas = await admin.storage.from(bucket).list(id);
      assert.ifError(carpetas.error);
      for (const c of carpetas.data ?? []) {
        const files = await admin.storage.from(bucket).list(`${id}/${c.name}`);
        assert.ifError(files.error);
        const rutas = (files.data ?? []).map((f) => `${id}/${c.name}/${f.name}`);
        if (rutas.length) assert.ifError((await admin.storage.from(bucket).remove(rutas)).error);
      }
    }
  if (productos.length)
    assert.ifError((await admin.from('productos').delete().in('id', productos)).error);
  if (mesas.length) {
    assert.ifError((await admin.from('sesiones_mesa').delete().in('mesa_id', mesas)).error);
    assert.ifError((await admin.from('mesas').delete().in('id', mesas)).error);
  }
  if (solicitudes.length)
    assert.ifError((await admin.from('solicitudes_alta').delete().in('id', solicitudes)).error);
  for (const id of usuarios) {
    const r = await admin.auth.admin.deleteUser(id);
    if (r.error && r.error.code !== 'user_not_found') throw r.error;
  }
  console.log(
    'Fin: limpieza limitada a fixtures de esta ejecución. Pruebas aprobadas:',
    resultados.length,
  );
}
