import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { LectorDeDni } from '../../core/dispositivo/lector-de-dni.service';
import { AUTENTICACION } from '../../core/services/autenticacion.port';
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

  /**
   * El cierre de la visita tiene salida.
   *
   * Antes la pantalla terminaba en «gracias por venir» y nada más: la
   * mesa estaba liberada y la persona quedaba adentro de una pantalla
   * terminada. La sesión no se cierra sola —la confirma el mozo desde
   * otro teléfono—, así que las puertas tienen que estar a la vista.
   */
  it('el cierre ofrece los resultados de encuestas y la salida (punto 22)', async () => {
    const fixture = await abrirComo('cliente_registrado', 'cuenta');
    await pedidoRecibido();
    const servicio = TestBed.inject(OperacionService);
    await servicio.solicitarCuenta();
    await servicio.generarCuenta('10', 10);
    await servicio.pagarCuenta();
    await servicio.confirmarPago(servicio.cuenta()!.id);
    fixture.detectChanges();

    const cuenta = fixture.debugElement.query(By.directive(CuentaCliente))
      .componentInstance as CuentaCliente;

    // La salida: cierra la sesión y vuelve al ingreso, como el botón del menú.
    const cerrar = vi.spyOn(TestBed.inject(AUTENTICACION), 'cerrarSesion').mockResolvedValue();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    cuenta.salir.emit();
    await fixture.whenStable();
    expect(cerrar).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(['/ingreso'], { replaceUrl: true });

    // Y la consulta de encuestas, que el punto pide que siga disponible.
    cuenta.verResultados.emit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance['seccion']()).toBe('reportes');
    expect(fixture.debugElement.query(By.directive(ResultadosEncuesta))).not.toBeNull();
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
    expect(texto(fixture, '.encuesta-hecha strong')).toEqual(['¡Gracias por responder!']);
  });

  /**
   * Lo que el profesor pidió para el punto 20: el botón de «Reportes»
   * sale del menú del cliente y su lugar es la encuesta ya respondida,
   * con un cartel grande y un acceso a las anteriores.
   */
  it('respondida, la pantalla lleva a las encuestas anteriores', async () => {
    const fixture = await abrirComo('cliente_registrado', 'encuesta');
    await pedidoRecibido();
    TestBed.inject(OperacionService).encuestaRespondida.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const boton = fixture.debugElement.query(By.css('.encuesta-hecha ion-button'));
    expect(boton).not.toBeNull();
    expect((boton.nativeElement as HTMLElement).textContent).toContain('Ver encuestas anteriores');

    boton.triggerEventHandler('click', {});
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance['seccion']()).toBe('reportes');
    expect(fixture.debugElement.query(By.directive(ResultadosEncuesta))).not.toBeNull();
    // Y la pantalla se llama por su nombre de cliente, no «Reportes».
    expect(fixture.componentInstance['titulo']()).toBe('Encuestas anteriores');
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
