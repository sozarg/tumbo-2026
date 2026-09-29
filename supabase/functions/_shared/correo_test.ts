import { strict as assert } from 'node:assert';
import { armarCorreo, entregarConBrevo } from './correo.ts';

/**
 * Lo que se prueba acá es lo que el enunciado pide del correo y lo que
 * podría romperse sin que nadie se entere: que los dos mensajes estén
 * trabajados, que el motivo del rechazo llegue escapado, y que un fallo
 * de Brevo vuelva explicado en vez de tirar.
 */

const cliente = { nombres: 'Lucía Mariel', apellidos: 'Fernández', estado: 'aprobado' } as const;

Deno.test('el correo de aprobación trae logo, título propio y el nombre de pila', () => {
  const correo = armarCorreo(cliente);

  assert.match(correo.asunto, /Lucía/);
  // El logo, que piden los puntos 7 y 8, y que se puede reemplazar sin
  // tocar el código: la primera prueba real salió sin marca porque la
  // imagen todavía no estaba publicada.
  assert.match(correo.html, /<img src="https:\/\/[^"]+" width="240"/);
  assert.match(
    armarCorreo(cliente, 'https://ejemplo.invalid/marca.png').html,
    /src="https:\/\/ejemplo\.invalid\/marca\.png"/,
  );
  // «fuentes distintas, colores y tamaños diferentes a los que vienen
  // por defecto» (puntos 7 y 8).
  assert.match(correo.html, /Georgia/);
  assert.match(correo.html, /Trebuchet MS/);
  assert.match(correo.html, /font-size:28px/);
  assert.match(correo.html, /#fbb103/);
  // El apellido no va en el saludo: se tutea con el primer nombre.
  assert.match(correo.html, /¡Lucía, ya sos parte!/);
  assert.ok(correo.texto.includes('Lucía'), 'la versión en texto plano también se personaliza');
});

Deno.test('el correo de rechazo explica el motivo y usa otro acento', () => {
  const correo = armarCorreo({
    ...cliente,
    estado: 'rechazado',
    motivo: 'La foto no coincide con el documento.',
  });

  assert.match(correo.html, /La foto no coincide con el documento\./);
  assert.match(correo.html, /#dc5b02/);
  assert.match(correo.texto, /Motivo: La foto no coincide con el documento\./);
  // Los dos mensajes tienen que ser distintos entre sí, no el mismo con
  // otra palabra: es lo que pide «todos estos cambios también deben ser
  // respecto al correo de confirmación».
  assert.notEqual(correo.asunto, armarCorreo(cliente).asunto);
});

Deno.test('sin motivo no queda un recuadro vacío', () => {
  const correo = armarCorreo({ ...cliente, estado: 'rechazado', motivo: '   ' });

  assert.ok(!correo.html.includes('MOTIVO'), 'no dibuja el bloque');
  assert.ok(!/Motivo:/.test(correo.texto));
  assert.match(correo.html, /no pudimos aprobar tu registro/i);
});

Deno.test('el motivo se escapa antes de entrar al HTML', () => {
  const correo = armarCorreo({
    ...cliente,
    estado: 'rechazado',
    motivo: '<script>alert("x")</script> & otra cosa',
  });

  assert.ok(!correo.html.includes('<script>'), 'no deja pasar etiquetas');
  assert.match(correo.html, /&lt;script&gt;/);
  assert.match(correo.html, /&amp; otra cosa/);
});

Deno.test('un error de Brevo vuelve explicado y no tira', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(new Response('{"message":"sender not valid"}', { status: 400 }));

  try {
    const salida = await entregarConBrevo(
      armarCorreo(cliente),
      { correo: 'cliente@example.invalid', nombre: 'Lucía' },
      { correo: 'no-responder@example.invalid', nombre: 'Tumbito' },
      'clave-de-prueba',
    );

    assert.equal(salida.ok, false);
    assert.ok(salida.ok === false && salida.error.includes('400'));
    assert.ok(salida.ok === false && salida.error.includes('sender not valid'));
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('si la red falla tampoco tira', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error('sin salida a internet'));

  try {
    const salida = await entregarConBrevo(
      armarCorreo(cliente),
      { correo: 'cliente@example.invalid', nombre: 'Lucía' },
      { correo: 'no-responder@example.invalid', nombre: 'Tumbito' },
      'clave-de-prueba',
    );

    assert.equal(salida.ok, false);
    assert.ok(salida.ok === false && salida.error.includes('sin salida a internet'));
  } finally {
    globalThis.fetch = original;
  }
});
