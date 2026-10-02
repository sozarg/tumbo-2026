import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { OperacionService } from '../../core/services/operacion.service';
import { Operacion } from './operacion.component';
import { SectorPedidos } from './sector-pedidos.component';
import { AvancePedidos } from './avance-pedidos.component';
import { abrirComo, texto } from './operacion.testing';

/**
 * Puntos 16 a 18 en pantalla, en modo demostración. El mock trae tres
 * mesas: la 4 (cocina en preparación, bar listo, la más vieja), la 2
 * (las dos partes pendientes) y la 5 (las dos partes pendientes).
 */
describe('Sector cocina (punto 16)', () => {
  let fixture: ComponentFixture<Operacion>;
  beforeEach(async () => (fixture = await abrirComo('cocinero', 'cocina')));

  it('lista las mesas con pedidos pendientes, la más vieja primero', () => {
    expect(texto(fixture, '.sector__mesas button')).toEqual(['Mesa 4', 'Mesa 2', 'Mesa 5']);
    expect(texto(fixture, '.mesa__numero')).toEqual(['Mesa 4']);
  });

  it('muestra fecha con hora y minutos, y nombre y cantidad de los ítems de cocina', () => {
    expect(texto(fixture, '.pedido__fecha')).toEqual(['26/08/2026 20:05']);
    expect(texto(fixture, '.pedido__items li')).toEqual([
      '2 × Ravioles de la abuela',
      '1 × Ensalada fresca',
    ]);
  });

  it('no muestra productos del bar', () => {
    const todo = (fixture.nativeElement as HTMLElement).textContent!;
    expect(todo).not.toContain('Gaseosa');
    expect(todo).not.toContain('Limonada');
  });

  it('cambia de mesa con los accesos y marca la elegida', () => {
    const botones = fixture.debugElement.queryAll(By.css('.sector__mesas button'));
    (botones[1].nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(texto(fixture, '.mesa__numero')).toEqual(['Mesa 2']);
    expect((botones[1].nativeElement as HTMLElement).getAttribute('aria-current')).toBe('true');
  });

  it('al marcar listo la mesa sale del listado y se avisa el éxito', async () => {
    const sector = fixture.debugElement.query(By.directive(SectorPedidos))
      .componentInstance as SectorPedidos;
    const mesa4 = TestBed.inject(OperacionService)
      .pedidosEnCurso()
      .find((p) => p.mesa === 4)!;
    sector.listo.emit({ pedidoId: mesa4.id, mesa: 4 });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(texto(fixture, '.sector__mesas button')).toEqual(['Mesa 2', 'Mesa 5']);
    expect(fixture.componentInstance['mensaje']()).toBe('Mesa 4: cocina listo.');
  });

  it('empezar a preparar cambia el estado que ve el cocinero', async () => {
    (
      fixture.debugElement.queryAll(By.css('.sector__mesas button'))[1]
        .nativeElement as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(texto(fixture, '.pedido__estado')).toEqual(['Pendiente']);
    (fixture.debugElement.query(By.css('ion-button.empezar')).nativeElement as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(texto(fixture, '.pedido__estado')).toEqual(['En preparación']);
    expect(fixture.debugElement.query(By.css('ion-button.empezar'))).toBeNull();
  });

  it('con todo listo muestra el estado vacío', async () => {
    const servicio = TestBed.inject(OperacionService);
    for (const pedido of servicio.pedidosEnCurso())
      await servicio.marcarSectorListo(pedido.id, 'cocina');
    fixture.detectChanges();
    expect(texto(fixture, '.sector__vacio h3')).toEqual(['Cocina al día']);
  });

  it('un error del guardado se muestra y libera los botones', async () => {
    const servicio = TestBed.inject(OperacionService);
    vi.spyOn(servicio, 'marcarSectorListo').mockResolvedValueOnce({
      ok: false,
      error: 'El pedido ya no está pendiente en este sector.',
    });
    await fixture.componentInstance['marcarSectorListo']({ pedidoId: 'x', mesa: 4 });
    expect(fixture.componentInstance['error']()).toBe(
      'El pedido ya no está pendiente en este sector.',
    );
    expect(fixture.componentInstance['procesandoSector']()).toBeNull();
  });
});

describe('Sector bar (punto 17)', () => {
  it('ve solo bebidas, y no ve la mesa cuyo bar ya terminó', async () => {
    const fixture = await abrirComo('cantinero', 'barra');
    expect(texto(fixture, '.sector__encabezado h2')).toEqual(['Sector bar']);
    expect(texto(fixture, '.sector__mesas button')).toEqual(['Mesa 2', 'Mesa 5']);
    expect(texto(fixture, '.pedido__items li')).toEqual(['2 × Limonada de la casa']);
  });
});

describe('Avance para el mozo (punto 18)', () => {
  it('muestra cada parte del pedido y avisa cuando está completo', async () => {
    const fixture = await abrirComo('mozo', 'pedidos');
    const avance = fixture.debugElement.query(By.directive(AvancePedidos));
    expect(avance).not.toBeNull();
    expect(texto(fixture, 'tumbo-avance-pedidos h3')).toEqual(['Mesa 4']);
    expect(texto(fixture, 'tumbo-avance-pedidos li')).toEqual([
      'Cocina En preparación',
      'Bar Listo',
    ]);

    const servicio = TestBed.inject(OperacionService);
    const mesa4 = servicio.pedidosEnCurso().find((p) => p.mesa === 4)!;
    await servicio.marcarSectorListo(mesa4.id, 'cocina');
    fixture.detectChanges();
    expect(texto(fixture, '.avance__aviso')).toEqual(['Pedido completo: listo para entregar.']);
  });
});

describe('Estado por sector para el cliente (puntos 16 y 17)', () => {
  it('ve en qué anda cocina y bar con su pedido', async () => {
    const fixture = await abrirComo('cliente_registrado', 'pedidos');
    expect(texto(fixture, '.sector-progress li')).toEqual(['Cocina Pendiente', 'Bar Pendiente']);
    const servicio = TestBed.inject(OperacionService);
    await servicio.empezarSector(servicio.pedidoActivo().id, 'cocina');
    fixture.detectChanges();
    expect(texto(fixture, '.sector-progress li')).toEqual([
      'Cocina En preparación',
      'Bar Pendiente',
    ]);
  });
});
