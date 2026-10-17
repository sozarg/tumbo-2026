import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { LectorDeDni } from '../../core/dispositivo/lector-de-dni.service';
import { SesionService } from '../../core/services/sesion.service';
import { CodigoQrService } from '../../core/services/codigo-qr.service';
import { OperacionService } from '../../core/services/operacion.service';
import { abrirComo } from './operacion.testing';

/**
 * El recorrido de entrada del cliente (correcciones F1 y F5).
 *
 * Las dos salieron de la misma frase del profesor: la pantalla tiene
 * que ir llevando sola. Son reglas de navegación, no de dibujo, así que
 * se verifican mirando en qué sección queda parada la pantalla.
 */
describe('La entrada del cliente lleva sola', () => {
  const abrirSinSeccion = async (perfil: 'cliente_registrado' | 'mozo', conMesa: boolean) => {
    const fixture = await abrirComo(perfil, 'menu');
    const servicio = TestBed.inject(OperacionService);
    servicio.mesaVinculada.set(conMesa ? 2 : null);
    fixture.componentInstance['seccion'].set(null);
    return { fixture, servicio };
  };

  it('F1: un cliente sin mesa aterriza en la pantalla del QR, no en el home', async () => {
    const { fixture } = await abrirSinSeccion('cliente_registrado', false);

    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();

    expect(fixture.componentInstance['seccion']()).toBe('entrada');
  });

  it('F1: un cliente que ya tiene mesa sigue viendo el home', async () => {
    const { fixture } = await abrirSinSeccion('cliente_registrado', true);

    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();

    expect(fixture.componentInstance['seccion']()).toBeNull();
  });

  it('F1: a un empleado no se lo manda a ningún lado', async () => {
    const { fixture } = await abrirSinSeccion('mozo', false);

    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();

    expect(fixture.componentInstance['seccion']()).toBeNull();
  });

  it('F1: si eligió una sección mientras cargaba, no se la cambia', async () => {
    const { fixture } = await abrirSinSeccion('cliente_registrado', false);

    /*
     * `cargar()` tarda y en ese rato la persona tocó «Menú». Mandarla a
     * la entrada después de que eligió sería pisarle la decisión, así
     * que el aterrizaje solo corre si sigue en el home.
     */
    fixture.componentInstance.ionViewWillEnter();
    fixture.componentInstance['abrir']('menu');
    await fixture.whenStable();

    expect(fixture.componentInstance['seccion']()).toBe('menu');
  });

  it('F5: con la mesa vinculada, la pantalla se va sola al home', async () => {
    const fixture = await abrirComo('cliente_registrado', 'entrada');
    const servicio = TestBed.inject(OperacionService);
    // Sin mesa vinculada todavía: es justo el momento en que el metre
    // asignó una y el cliente va a escanear su QR.
    servicio.mesaVinculada.set(null);
    servicio.espera.set([
      { id: 'espera-1', nombre: 'Camila', foto: '', fecha: '05/10/2026 10:00', mesaAsignada: 2 },
    ]);
    vi.spyOn(TestBed.inject(LectorDeDni), 'leerCodigo').mockResolvedValue({
      estado: 'leido',
      contenido: 'tumbo://mesa/token-2',
    });
    vi.spyOn(TestBed.inject(CodigoQrService), 'tokenDeMesa').mockReturnValue('token-2');
    vi.spyOn(servicio, 'vincularMesaPorQr').mockResolvedValue({ ok: true });

    await fixture.componentInstance['escanearMesaAsignada']();
    await fixture.whenStable();

    expect(fixture.componentInstance['estadoQrMesa']()).toBe('correcto');
    expect(fixture.componentInstance['seccion']()).toBeNull();
  });

  /**
   * Cerrar sesión deja el recorrido de entrada en cero.
   *
   * Estas señales son locales y la pantalla no se destruye al navegar,
   * así que sobrevivían al cierre de sesión: quien tocaba «entrar sin
   * cuenta» después de que se fuera un cliente anónimo caía directo en
   * «escaneá el QR de tu mesa», con la mesa del anterior.
   */
  it('sin sesión, la entrada vuelve al primer tramo', async () => {
    const fixture = await abrirComo('cliente_anonimo', 'entrada');
    fixture.componentInstance['anotadoEnEspera'].set(true);
    fixture.componentInstance['ingresoEscaneado'].set(true);
    expect(fixture.componentInstance['etapaDeEntrada']()).toBe(3);

    TestBed.inject(SesionService).cerrar();
    fixture.componentInstance.ionViewWillEnter();
    await fixture.whenStable();

    expect(fixture.componentInstance['anotadoEnEspera']()).toBe(false);
    expect(fixture.componentInstance['ingresoEscaneado']()).toBe(false);
    expect(fixture.componentInstance['etapaDeEntrada']()).toBe(1);
  });

  /**
   * Recuperar la visita devuelve a donde estaba.
   *
   * Con la mesa ya vinculada, la entrada no es su pantalla: su pedido y
   * su cuenta están en el home. Quedarse en el recorrido de entrada
   * sería pedirle que rehaga un trámite que ya hizo.
   */
  it('recuperada la visita con mesa vinculada, vuelve al home', async () => {
    const fixture = await abrirComo('cliente_anonimo', 'entrada');
    const servicio = TestBed.inject(OperacionService);
    servicio.mesaVinculada.set(3);
    vi.spyOn(servicio, 'reclamarVisita').mockResolvedValue({ ok: true });
    fixture.componentInstance['codigoReclamado'].set('GFC8H');

    await fixture.componentInstance['recuperarVisita']();
    await fixture.whenStable();

    expect(fixture.componentInstance['seccion']()).toBeNull();
  });

  it('recuperada sin mesa todavía, se queda en la entrada', async () => {
    const fixture = await abrirComo('cliente_anonimo', 'entrada');
    const servicio = TestBed.inject(OperacionService);
    servicio.mesaVinculada.set(null);
    vi.spyOn(servicio, 'reclamarVisita').mockResolvedValue({ ok: true });
    fixture.componentInstance['codigoReclamado'].set('GFC8H');

    await fixture.componentInstance['recuperarVisita']();
    await fixture.whenStable();

    expect(fixture.componentInstance['seccion']()).toBe('entrada');
    expect(fixture.componentInstance['etapaDeEntrada']()).toBe(3);
  });

  /**
   * El formulario del código y el QR no conviven.
   *
   * La tarjeta de la entrada es una columna de alto acotado que
   * heredaba `flex-wrap: wrap` de su versión en fila: al sumarle el
   * formulario dejó de entrar y envolvió, que en una columna significa
   * armar una SEGUNDA COLUMNA. El QR y el texto quedaban uno al lado
   * del otro, saliéndose de la pantalla. Con `nowrap` eso no pasa, y
   * mientras se escribe el código el QR se esconde para no quedar
   * aplastado hasta ser ilegible.
   */
  it('al abrir el código de visita, la tarjeta cambia de modo', async () => {
    const fixture = await abrirComo('cliente_anonimo', 'entrada');

    fixture.componentInstance['alternarRecuperarVisita']();
    fixture.detectChanges();
    await fixture.whenStable();

    const tarjeta = fixture.debugElement.query(By.css('.anonymous-entry'));

    expect((tarjeta.nativeElement as HTMLElement).classList).toContain('anonymous-entry--codigo');
    expect(fixture.debugElement.query(By.css('.codigo-visita__form'))).not.toBeNull();
  });

  it('F5: si el QR no es el de su mesa, se queda donde está', async () => {
    const fixture = await abrirComo('cliente_registrado', 'entrada');
    const servicio = TestBed.inject(OperacionService);
    // Sin mesa vinculada todavía: es justo el momento en que el metre
    // asignó una y el cliente va a escanear su QR.
    servicio.mesaVinculada.set(null);
    servicio.espera.set([
      { id: 'espera-1', nombre: 'Camila', foto: '', fecha: '05/10/2026 10:00', mesaAsignada: 2 },
    ]);
    vi.spyOn(TestBed.inject(LectorDeDni), 'leerCodigo').mockResolvedValue({
      estado: 'leido',
      contenido: 'tumbo://mesa/otro',
    });
    vi.spyOn(TestBed.inject(CodigoQrService), 'tokenDeMesa').mockReturnValue('otro');
    vi.spyOn(servicio, 'vincularMesaPorQr').mockResolvedValue({
      ok: false,
      error: 'No es tu mesa.',
    });

    await fixture.componentInstance['escanearMesaAsignada']();
    await fixture.whenStable();

    expect(fixture.componentInstance['estadoQrMesa']()).toBe('incorrecto');
    expect(fixture.componentInstance['seccion']()).toBe('entrada');
  });
});
