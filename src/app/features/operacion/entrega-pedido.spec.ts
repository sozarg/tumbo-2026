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
    expect(encuesta.debugElement.query(By.css('.survey-card'))).toBeNull();
  });

  it('la cuenta también espera la recepción', async () => {
    const cuenta = await abrirComo('cliente_registrado', 'cuenta');
    expect(texto(cuenta, '.locked-card strong')).toEqual(['La cuenta se habilita con tu pedido']);
    expect(cuenta.debugElement.query(By.css('.tip-card'))).toBeNull();
  });

  it('al confirmar la recepción se abren la encuesta y la cuenta', async () => {
    const fixture = await abrirComo('cliente_registrado', 'encuesta');
    const servicio = TestBed.inject(OperacionService);
    await servicio.marcarEntregado(await dejarListoElPedidoDelCliente());
    await servicio.confirmarRecepcion();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.locked-card'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.survey-card'))).not.toBeNull();
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
