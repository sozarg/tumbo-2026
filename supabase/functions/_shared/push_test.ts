import { strict as assert } from 'node:assert';
import { firmarAfirmacion, leerCuentaDeServicio, mandarAviso, olvidarPermiso } from './push.ts';

/**
 * Lo que se prueba acá es la parte que no se puede probar contra
 * Firebase: que el token esté bien firmado y que los fallos de cada
 * envío se distingan entre sí.
 *
 * El envío de verdad solo se puede comprobar con un teléfono en la
 * mano, y por eso conviene que todo lo demás esté cubierto.
 */

/** Una cuenta de servicio de mentira, con una clave generada al vuelo. */
async function cuentaDePrueba() {
  const par = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );

  const pkcs8 = await crypto.subtle.exportKey('pkcs8', par.privateKey);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  const pem = `-----BEGIN PRIVATE KEY-----\n${base64.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----\n`;

  return {
    cuenta: {
      client_email: 'tumbito@tumbo-tfi.iam.gserviceaccount.com',
      private_key: pem,
      project_id: 'tumbo-tfi',
    },
    publica: par.publicKey,
  };
}

Deno.test('la afirmación queda firmada y Google la podría verificar', async () => {
  const { cuenta, publica } = await cuentaDePrueba();
  const ahora = 1_800_000_000;

  const jwt = await firmarAfirmacion(cuenta, ahora);
  const [encabezado, cuerpo, firma] = jwt.split('.');
  assert.equal(jwt.split('.').length, 3, 'un JWT tiene tres partes');

  const desdeBase64Url = (texto: string) =>
    Uint8Array.from(atob(texto.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

  const cabecera = JSON.parse(new TextDecoder().decode(desdeBase64Url(encabezado)));
  assert.equal(cabecera.alg, 'RS256');

  const reclamos = JSON.parse(new TextDecoder().decode(desdeBase64Url(cuerpo)));
  assert.equal(reclamos.iss, cuenta.client_email);
  assert.equal(reclamos.aud, 'https://oauth2.googleapis.com/token');
  assert.equal(reclamos.scope, 'https://www.googleapis.com/auth/firebase.messaging');
  assert.equal(reclamos.iat, ahora);
  // Una hora, que es lo máximo que Google acepta.
  assert.equal(reclamos.exp - reclamos.iat, 3600);

  const valida = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publica,
    desdeBase64Url(firma),
    new TextEncoder().encode(`${encabezado}.${cuerpo}`),
  );
  assert.ok(valida, 'la firma tiene que verificar contra la clave pública');
});

Deno.test('un secret mal cargado se explica en castellano', () => {
  assert.throws(() => leerCuentaDeServicio(undefined), /Falta el secret/);
  assert.throws(() => leerCuentaDeServicio('no soy json'), /no es un JSON válido/);
  assert.throws(() => leerCuentaDeServicio('{"project_id":"x"}'), /client_email/);
});

Deno.test('un envío bueno vuelve ok', async () => {
  const original = globalThis.fetch;
  let pedido: Request | null = null;
  globalThis.fetch = (url, init) => {
    pedido = new Request(String(url), init);
    return Promise.resolve(new Response('{"name":"projects/x/messages/1"}', { status: 200 }));
  };

  try {
    const salida = await mandarAviso(
      'token-del-telefono',
      { titulo: 'Nuevo cliente', cuerpo: 'Lucía se registró.', seccion: 'clientes' },
      'permiso-de-prueba',
      'tumbo-tfi',
    );

    assert.equal(salida.ok, true);
    assert.ok(pedido);
    assert.match(pedido!.url, /projects\/tumbo-tfi\/messages:send$/);
    assert.equal(pedido!.headers.get('Authorization'), 'Bearer permiso-de-prueba');
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('un teléfono que ya no existe se marca para borrar', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(new Response('{"error":{"status":"UNREGISTERED"}}', { status: 404 }));

  try {
    const salida = await mandarAviso('token-muerto', { titulo: 'a', cuerpo: 'b' }, 'p', 'proy');
    assert.equal(salida.ok, false);
    assert.ok(salida.ok === false && salida.caduco, 'hay que borrarlo de la base');
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('un fallo pasajero NO borra el token', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve(new Response('se cayó', { status: 503 }));

  try {
    const salida = await mandarAviso('token-bueno', { titulo: 'a', cuerpo: 'b' }, 'p', 'proy');
    assert.equal(salida.ok, false);
    assert.ok(salida.ok === false && !salida.caduco, 'un 503 se reintenta, no se borra');
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('si Firebase no contesta tampoco tira', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error('sin salida a internet'));

  try {
    const salida = await mandarAviso('token', { titulo: 'a', cuerpo: 'b' }, 'p', 'proy');
    assert.equal(salida.ok, false);
    assert.ok(salida.ok === false && salida.error.includes('sin salida a internet'));
    assert.ok(salida.ok === false && !salida.caduco);
  } finally {
    globalThis.fetch = original;
    olvidarPermiso();
  }
});
