import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { LectorDeDni } from '../../core/dispositivo/lector-de-dni.service';
import { OperacionService } from '../../core/services/operacion.service';
import { Cobros } from './cobros.component';
import { CuentaCliente } from './cuenta-cliente.component';
import { EncuestaForm } from './encuesta-form.component';
import { ResultadosEncuesta } from './resultados-encuesta.component';
import { abrirComo, texto } from './operacion.testing';

/** Puntos 20 a 22 en pantalla, en modo demostración, con la mesa 2 ya recibida. */
async function pedidoRecibido(): Promise<void> {
  const servicio = TestBed.inject(OperacionService);
  const id = servicio.pedidoActivo().id;
  await servicio.marcarSectorListo(id, 'cocina');
  await servicio.marcarSectorListo(id, 'bar');
  await servicio.marcarEntregado(id);
  await servicio.confirmarRecepcion();
}

const leer = (contenido: string) =>
  vi
    .spyOn(TestBed.inject(LectorDeDni), 'leerCodigo')
    .mockResolvedValueOnce({ estado: 'leido', contenido });

describe('La cuenta del cliente (punto 21)', () => {
  it('pide la cuenta, lee el QR de propina, ve el detalle y paga', async () => {
    const fixture = await abrirComo('cliente_registrado', 'cuenta');
    await pedidoRecibido();
    fixture.detectChanges();
    const cuenta = fixture.debugElement.query(By.directive(CuentaCliente))
      .componentInstance as CuentaCliente;

    cuenta.pedir.emit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(texto(fixture, 'tumbo-cuenta-cliente .aviso strong')).toEqual([
      'El mozo ya sabe que pediste la cuenta',
    ]);

    leer('TUMBO://mesa/tumbo-mesa-2');
    cuenta.escanearPropina.emit();
    await fixture.whenStable();
    expect(fixture.componentInstance['error']()).toBe('Ese código no es un QR de propina.');

    leer('TUMBO://propina/15');
    cuenta.escanearPropina.emit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(texto(fixture, '.total strong')).toEqual(['$ 23.460']);
    expect(texto(fixture, '.detalle li')).toEqual([
      '2 × Hamburguesa TUMBO $ 7.800 c/u $ 15.600',
      '2 × Limonada de la casa $ 2.400 c/u $ 4.800',
      'Subtotal $ 20.400',
      'Propina 15 % · Muy bueno $ 3.060',
    ]);

    cuenta.pagar.emit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(texto(fixture, 'tumbo-cuenta-cliente .aviso p')).toEqual([
      'Pago realizado. Esperá a que el mozo lo confirme.',
    ]);
  });

  it('con el pago confirmado verifica la mesa libre por QR (punto 22)', async () => {
    const fixture = await abrirComo('cliente_registrado', 'cuenta');
    await pedidoRecibido();
    const servicio = TestBed.inject(OperacionService);
    await servicio.solicitarCuenta();
    await servicio.generarCuenta('10', 10);
    await servicio.pagarCuenta();
    await servicio.confirmarPago(servicio.cuenta()!.id);
    fixture.detectChanges();

    const mesa2 = servicio.mesas().find((m) => m.numero === 2)!;
    leer(`TUMBO://mesa/${mesa2.qrToken}`);
    (
      fixture.debugElement.query(By.directive(CuentaCliente)).componentInstance as CuentaCliente
    ).verificarMesa.emit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(texto(fixture, '.verificacion')).toEqual([
      'Mesa 2: libre, lista para el próximo cliente.',
    ]);
  });
});

describe('Los cobros del mozo (puntos 21 y 22)', () => {
  it('ve la cuenta pagada de la mesa y la confirma', async () => {
    const fixture = await abrirComo('mozo', 'cuenta');
    await pedidoRecibido();
    const servicio = TestBed.inject(OperacionService);
    await servicio.solicitarCuenta();
    fixture.detectChanges();
    expect(texto(fixture, '.cobro__estado')).toEqual(['Pidió la cuenta']);

    await servicio.generarCuenta('20', 20);
    await servicio.pagarCuenta();
    fixture.detectChanges();
    expect(texto(fixture, '.cobro h3')).toEqual(['Mesa 2']);
    expect(texto(fixture, '.cobro__estado')).toEqual(['Pagó: falta confirmar']);

    const cobros = fixture.debugElement.query(By.directive(Cobros)).componentInstance as Cobros;
    cobros.confirmar.emit({ cuentaId: servicio.cuenta()!.id, mesa: 2 });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance['mensaje']()).toBe('Pago confirmado: la mesa 2 quedó libre.');
    expect(texto(fixture, '.cobros__vacio')).toEqual([
      'No hay cuentas pedidas ni pagos para confirmar.',
    ]);
  });
});

describe('La encuesta (punto 20)', () => {
  it('pregunta de a una, valida y guarda', async () => {
    const fixture = await abrirComo('cliente_registrado', 'encuesta');
    await pedidoRecibido();
    fixture.detectChanges();
    const formulario = fixture.debugElement.query(By.directive(EncuestaForm));
    const encuesta = formulario.componentInstance as EncuestaForm;
    expect(texto(fixture, '.encuesta__progreso')).toEqual(['Pregunta 1 de 7']);

    encuesta['avanzar']();
    fixture.detectChanges();
    expect(texto(fixture, '.encuesta__error')).toEqual(['Esta pregunta es obligatoria.']);

    const preguntas = TestBed.inject(OperacionService).preguntas();
    const respuestas = ['4', 'Rápido', null, 'Redes sociales', null, null, null];
    for (const [indice, pregunta] of preguntas.entries()) {
      const valor = respuestas[indice];
      if (pregunta.tipo === 'estrellas') encuesta['elegir'](pregunta, Number(valor));
      else if (valor !== null) encuesta['control'](pregunta).setValue(valor);
      encuesta['avanzar']();
      fixture.detectChanges();
    }
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(OperacionService).encuestaRespondida()).toBe(true);
    expect(texto(fixture, '.locked-card strong')).toEqual(['¡Gracias por responder!']);
  });
});

describe('Los gráficos (puntos 20 y 22)', () => {
  it('muestran un gráfico por pantalla, con datos', async () => {
    const fixture = await abrirComo('cliente_registrado', 'reportes');
    const resultados = fixture.debugElement.query(By.directive(ResultadosEncuesta));
    expect(texto(fixture, '.resultados__tipo')).toEqual(['Gráfico de torta']);
    expect(fixture.debugElement.queryAll(By.css('tumbo-grafico-torta path')).length).toBe(5);

    (resultados.componentInstance as ResultadosEncuesta)['pagina'].set(1);
    fixture.detectChanges();
    expect(texto(fixture, '.resultados__tipo')).toEqual(['Gráfico de barras']);
    expect(fixture.debugElement.query(By.css('tumbo-grafico-torta'))).toBeNull();

    (resultados.componentInstance as ResultadosEncuesta)['pagina'].set(2);
    fixture.detectChanges();
    expect(texto(fixture, '.resultados__tipo')).toEqual(['Gráfico de línea']);
    expect(fixture.debugElement.queryAll(By.css('tumbo-grafico-linea circle')).length).toBe(4);
  });
});
