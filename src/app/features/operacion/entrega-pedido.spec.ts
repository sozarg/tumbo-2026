import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { OperacionService } from '../../core/services/operacion.service';
import { AvancePedidos } from './avance-pedidos.component';
import { MenuOperacion } from './menu-operacion.component';
import { abrirComo, texto } from './operacion.testing';

/**
 * Punto 19 en pantalla, en modo demostración. La mesa 2 es la del
 * cliente; se la deja lista marcando cocina y bar antes de cada prueba.
 */
async function dejarListoElPedidoDelCliente(): Promise<string> {
  const servicio = TestBed.inject(OperacionService);
  const id = servicio.pedidoActivo().id;
  await servicio.marcarSectorListo(id, 'cocina');
  await servicio.marcarSectorListo(id, 'bar');
  return id;
}

describe('El mozo entrega el pedido (punto 19)', () => {
  it('ve qué lleva de cada tipo y lo marca entregado', async () => {
    const fixture = await abrirComo('mozo', 'pedidos');
    await dejarListoElPedidoDelCliente();
    const avance = fixture.debugElement.query(By.directive(AvancePedidos))
      .componentInstance as AvancePedidos;
    avance['pagina'].set(1);
    fixture.detectChanges();

    expect(texto(fixture, 'tumbo-avance-pedidos h3')).toEqual(['Mesa 2']);
    expect(texto(fixture, '.avance__entrega h4')).toEqual(['Comidas', 'Bebidas']);
    expect(texto(fixture, '.avance__entrega li')).toEqual([
      'Hamburguesa TUMBO 2 ×',
      'Limonada de la casa 2 ×',
    ]);

    avance.entregar.emit({ pedidoId: TestBed.inject(OperacionService).pedidoActivo().id, mesa: 2 });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(OperacionService).pedidoActivo().estado).toBe('entregado');
    expect(fixture.componentInstance['mensaje']()).toBe(
      'Mesa 2: pedido entregado. El cliente tiene que confirmar la recepción.',
    );
    expect(texto(fixture, '.avance__espera')).toEqual([
      'Entregado. Esperando que el cliente confirme la recepción.',
    ]);
  });

  it('ya no hay un «Marcar entregado» sin elegir pedido', async () => {
    const fixture = await abrirComo('mozo', 'pedidos');
    const fuera = fixture.debugElement
      .queryAll(By.css('.staff-order-card tumbo-boton-confirmacion'))
      .map((e) => (e.nativeElement as HTMLElement).textContent!.trim());
    expect(fuera).not.toContain('Marcar entregado');
  });
});

describe('Lo que se habilita con la recepción (punto 19)', () => {
  it('encuesta y cuenta muestran por qué están bloqueadas', async () => {
    const encuesta = await abrirComo('cliente_registrado', 'encuesta');
    expect(texto(encuesta, '.locked-card strong')).toEqual([
      'La encuesta se habilita con tu pedido',
    ]);
    expect(encuesta.debugElement.query(By.css('tumbo-encuesta-form'))).toBeNull();
  });

  it('la cuenta también espera la recepción', async () => {
    const cuenta = await abrirComo('cliente_registrado', 'cuenta');
    expect(texto(cuenta, 'tumbo-cuenta-cliente .aviso strong')).toEqual([
      'La cuenta se habilita con tu pedido',
    ]);
    expect(texto(cuenta, 'tumbo-cuenta-cliente ion-button')).not.toContain('Pedir la cuenta');
  });

  it('al confirmar la recepción se abren la encuesta y la cuenta', async () => {
    const fixture = await abrirComo('cliente_registrado', 'encuesta');
    const servicio = TestBed.inject(OperacionService);
    await servicio.marcarEntregado(await dejarListoElPedidoDelCliente());
    await servicio.confirmarRecepcion();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.locked-card'))).toBeNull();
    expect(fixture.debugElement.query(By.css('tumbo-encuesta-form'))).not.toBeNull();
  });

  it('el inicio del cliente marca con candado lo que todavía no puede usar', async () => {
    const fixture = await abrirComo('cliente_registrado', 'pedidos');
    fixture.componentInstance['seccion'].set(null);
    fixture.detectChanges();
    const menu = fixture.debugElement.query(By.directive(MenuOperacion));
    const bloqueadas = menu
      .queryAll(By.css('.dashboard-action--bloqueada'))
      .map((e) => (e.nativeElement as HTMLElement).getAttribute('aria-label'));
    expect([...bloqueadas].sort()).toEqual([
      'Cuenta, se habilita con tu pedido',
      'Encuesta, se habilita con tu pedido',
    ]);
  });
});

describe('El mozo decide sobre cada pedido (puntos 13 y 14)', () => {
  it('confirma o rechaza ESE pedido, no el de otra mesa', async () => {
    const fixture = await abrirComo('mozo', 'pedidos');
    const servicio = TestBed.inject(OperacionService);
    servicio.pedidoActivo.update((p) => ({ ...p, estado: 'pendiente_confirmacion' }));
    fixture.detectChanges();
    const avance = fixture.debugElement.query(By.directive(AvancePedidos))
      .componentInstance as AvancePedidos;
    const indice = avance['pedidos']().findIndex((p) => p.mesa === 2);
    avance['pagina'].set(indice);
    fixture.detectChanges();
    expect(texto(fixture, '.avance__nuevo')).toEqual(['Pedido nuevo: espera tu confirmación.']);

    avance.rechazar.emit({
      pedidoId: servicio.pedidoActivo().id,
      mesa: 2,
      motivo: 'No queda limonada',
    });
    await fixture.whenStable();
    expect(servicio.pedidoActivo().estado).toBe('rechazado');
    expect(servicio.pedidoActivo().motivoRechazo).toBe('No queda limonada');
    expect(fixture.componentInstance['mensaje']()).toBe(
      'Mesa 2: pedido rechazado y devuelto al cliente con el motivo.',
    );

    const repetido = await servicio.confirmarPedido(servicio.pedidoActivo().id);
    expect(repetido).toEqual({ ok: false, error: 'El pedido ya no espera confirmación.' });

    servicio.pedidoActivo.update((p) => ({ ...p, estado: 'pendiente_confirmacion' }));
    avance.confirmar.emit({ pedidoId: servicio.pedidoActivo().id, mesa: 2 });
    await fixture.whenStable();
    expect(servicio.pedidoActivo().estado).toBe('confirmado');
    expect(servicio.pedidosEnCurso().find((p) => p.mesa === 4)?.estado).not.toBe('confirmado');
  });
});

describe('El rechazo lleva el motivo que escribe el mozo (punto 13)', () => {
  it('no deja rechazar sin un motivo de 5 a 300 caracteres y lo manda limpio', async () => {
    const fixture = await abrirComo('mozo', 'pedidos');
    const servicio = TestBed.inject(OperacionService);
    servicio.pedidoActivo.update((p) => ({ ...p, estado: 'pendiente_confirmacion' }));
    fixture.detectChanges();
    const avance = fixture.debugElement.query(By.directive(AvancePedidos))
      .componentInstance as AvancePedidos;
    avance['pagina'].set(avance['pedidos']().findIndex((p) => p.mesa === 2));
    fixture.detectChanges();

    const emitidos: unknown[] = [];
    avance.rechazar.subscribe((accion) => emitidos.push(accion));
    avance['abrirRechazo'](servicio.pedidoActivo().id);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.avance__rechazo ion-textarea')).not.toBeNull();

    avance['motivo'].set('No');
    fixture.detectChanges();
    expect(avance['motivoValido']()).toBe(false);
    expect(texto(fixture, '.avance__error')).toEqual([
      'El motivo tiene que tener entre 5 y 300 caracteres.',
    ]);
    avance['emitirRechazo'](servicio.pedidoActivo());
    expect(emitidos).toEqual([]);

    avance['motivo'].set('  No queda bife de chorizo  ');
    avance['emitirRechazo'](servicio.pedidoActivo());
    expect(emitidos).toEqual([
      { pedidoId: servicio.pedidoActivo().id, mesa: 2, motivo: 'No queda bife de chorizo' },
    ]);
    expect(avance['rechazando']()).toBeNull();
  });

  it('el cliente ve el motivo y retoma el pedido en el carrito para reenviarlo', async () => {
    const fixture = await abrirComo('cliente_registrado', 'pedidos');
    const servicio = TestBed.inject(OperacionService);
    servicio.pedidoActivo.update((p) => ({
      ...p,
      estado: 'rechazado',
      motivoRechazo: 'No queda limonada',
    }));
    fixture.detectChanges();
    expect(texto(fixture, '.order-rejected strong')).toEqual(['El mozo rechazó tu pedido']);
    expect(texto(fixture, '.order-rejected p')).toEqual(['Motivo: No queda limonada']);

    fixture.componentInstance['retomarPedido']();
    fixture.detectChanges();
    expect(servicio.carrito().map((i) => [i.nombre, i.cantidad])).toEqual(
      servicio.pedidoActivo().items.map((i) => [i.nombre, i.cantidad]),
    );
    expect(fixture.componentInstance['seccion']()).toBe('menu');
  });
});

describe('La consulta al mozo es por mesa (punto 11)', () => {
  it('el cliente ve autor, mesa, fecha y hora de cada mensaje', async () => {
    const fixture = await abrirComo('cliente_registrado', 'consulta');
    expect(texto(fixture, '.chat-message span')[0]).toMatch(
      /^Mozo · Mesa 2 · \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/,
    );
    expect(fixture.nativeElement.querySelector('.chat-mesa')).toBeNull();
  });

  it('el mozo elige a qué mesa responder', async () => {
    const fixture = await abrirComo('mozo', 'consulta');
    expect(fixture.nativeElement.querySelector('.chat-mesa')).not.toBeNull();
    expect(fixture.componentInstance['mesasEnConsulta']()).toEqual([
      { sesionId: 'sesion-demo', mesa: 2 },
    ]);
    expect(fixture.componentInstance['mesaDeRespuesta']()).toBe('sesion-demo');
  });

  it('sigue a la última mesa hasta que el mozo fija una, y después no se mueve', async () => {
    const fixture = await abrirComo('mozo', 'consulta');
    const servicio = TestBed.inject(OperacionService);
    const mensaje = (sesionId: string, mesa: number, id: string) => ({
      id,
      autor: 'Cliente',
      texto: 'Hola',
      fecha: '01/10/2026 20:00',
      esPropio: false,
      sesionId,
      mesa,
      deCliente: true,
    });
    const pantalla = fixture.componentInstance;
    servicio.mensajes.set([mensaje('s3', 3, 'a'), mensaje('s2', 2, 'b')]);
    expect(pantalla['mesaDeRespuesta']()).toBe('s2');
    servicio.mensajes.update((m) => [...m, mensaje('s3', 3, 'c')]);
    expect(pantalla['mesaDeRespuesta']()).toBe('s3');

    pantalla['mesaElegida'].set('s3');
    servicio.mensajes.update((m) => [...m, mensaje('s2', 2, 'd')]);
    expect(pantalla['mesaDeRespuesta']()).toBe('s3');
    expect(pantalla['mensajesVisibles']().map((m) => m.id)).toEqual(['a', 'c']);
  });
});
