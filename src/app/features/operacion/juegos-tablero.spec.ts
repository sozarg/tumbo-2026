import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { PerfilUsuario } from '../../core/models/usuario';
import { OperacionService } from '../../core/services/operacion.service';
import { Operacion } from './operacion.component';
import { abrirComo } from './operacion.testing';

/**
 * La ficha de los juegos (punto 15).
 *
 * Los tres juegos se eligen con las fichas de arriba y se dibujan en una
 * sola tarjeta. El tablero del medio es el que llena el alto que antes
 * quedaba en blanco, y lo llena con lo único que acá importa: cuánto
 * paga este juego y si esta partida cuenta para el descuento.
 */
describe('La ficha de los juegos', () => {
  const abrirJuegos = async (perfil: PerfilUsuario) => {
    const fixture = await abrirComo(perfil, 'juegos');
    const servicio = TestBed.inject(OperacionService);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, servicio };
  };

  const texto = (fixture: ComponentFixture<Operacion>, selector: string) =>
    (
      fixture.debugElement.query(By.css(selector))?.nativeElement as HTMLElement | undefined
    )?.textContent
      ?.replace(/\s+/g, ' ')
      .trim();

  it('al cambiar de juego cambian el título y lo que paga', async () => {
    const { fixture } = await abrirJuegos('dueno');

    expect(texto(fixture, '.game-card h2')).toBe('Recolección tumbito');
    expect(texto(fixture, '.game-board__premio')).toBe('10 %');

    fixture.componentInstance['pagina'].set(2);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(texto(fixture, '.game-card h2')).toBe('Piedra, papel o tijera');
    expect(texto(fixture, '.game-board__premio')).toBe('20 %');
  });

  it('el cliente anónimo entra a los juegos, con el aviso de que no suman descuento', async () => {
    const { fixture, servicio } = await abrirJuegos('cliente_anonimo');
    // El pedido de la demostración ya está confirmado, que es la puerta.
    expect(servicio.juegosHabilitados()).toBe(true);

    // Entra a la ficha, no al cartel de «función exclusiva».
    expect(fixture.debugElement.query(By.css('.game-card'))).not.toBeNull();
    expect(texto(fixture, '.games-regla')).toContain('solo para clientes registrados');
    expect(texto(fixture, '.game-board__estado')).toContain('no otorga descuento');
  });

  /**
   * La puerta del punto 14, para los DOS clientes.
   *
   * El profesor marcó que faltaba: el anónimo entraba a los juegos
   * desde el minuto cero. El punto pone la condición sin hablar de
   * descuentos —«El mozo confirma... El cliente ve el estado y puede
   * acceder a juegos»—, así que el candado es de los dos. Lo que
   * distingue al anónimo es que su partida no paga, no que entre antes.
   */
  it.each(['cliente_registrado', 'cliente_anonimo'] as const)(
    'sin la confirmación del mozo, %s ve el candado y no el tablero',
    async (perfil) => {
      const { fixture, servicio } = await abrirJuegos(perfil);
      servicio.pedidoActivo.update((pedido) => ({ ...pedido, estado: 'pendiente_confirmacion' }));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(servicio.juegosHabilitados()).toBe(false);
      expect(fixture.componentInstance['seccionesBloqueadas']()).toContain('juegos');
      expect(fixture.debugElement.query(By.css('.game-card'))).toBeNull();
      expect(texto(fixture, '.locked-card strong')).toBe('Los juegos se habilitan con tu pedido');
    },
  );

  /**
   * El aviso no se queda flotando sobre la pantalla de ingreso.
   *
   * `ion-router-outlet` deja esta pantalla viva al navegar y los toasts
   * de Ionic se dibujan al tope de la aplicación, así que un aviso
   * abierto justo al tocar «salir» quedaba encima del login de la
   * sesión siguiente.
   *
   * Apagar la señal no alcanza: la vista queda desatada del detector de
   * cambios y `[isOpen]` nunca se vuelve a evaluar. Por eso el test no
   * mira solo las señales, mira que al toast ya dibujado le hayan
   * pedido que se cierre.
   */
  it('al salir de la pantalla se bajan los avisos', async () => {
    const { fixture } = await abrirJuegos('dueno');
    fixture.componentInstance['mensaje'].set('Mesa 1: bar listo.');
    fixture.componentInstance['error'].set('Algo salió mal.');

    // El toast que Ionic ya movió al tope de la aplicación.
    const toast = document.createElement('ion-toast');
    const cerrar = vi.fn().mockResolvedValue(true);
    (toast as HTMLElement & { dismiss: () => Promise<boolean> }).dismiss = cerrar;
    document.body.appendChild(toast);

    try {
      fixture.componentInstance.ionViewWillLeave();

      expect(fixture.componentInstance['mensaje']()).toBe('');
      expect(fixture.componentInstance['error']()).toBe('');
      expect(cerrar).toHaveBeenCalled();
    } finally {
      toast.remove();
    }
  });

  /**
   * La regla del punto 15, como la precisó el profesor.
   *
   * El «primer intento» es uno por VISITA, no uno por juego. Antes se
   * contaba por juego: perder la memoria y después ganar piedra, papel
   * o tijera daba el 20 %, así que perder no costaba nada y convenía ir
   * probando juegos hasta ganar el de mayor porcentaje.
   */
  it('perder la primera partida deja la visita sin descuento, gane lo que gane después', async () => {
    const { fixture, servicio } = await abrirJuegos('cliente_registrado');

    await fixture.componentInstance['jugar']('memoria', false);
    expect(servicio.descuento()).toBe(0);
    expect(fixture.componentInstance['mensaje']()).toContain('esta visita no tiene');

    // Piedra, papel o tijera paga 20 %: antes de la corrección, lo daba.
    await fixture.componentInstance['jugar']('piedra', true);
    expect(servicio.descuento()).toBe(0);
    expect(fixture.componentInstance['mensaje']()).toContain('ya no suma');
  });

  it('el descuento es el del juego de la primera partida y no se acumula', async () => {
    const { fixture, servicio } = await abrirJuegos('cliente_registrado');

    await fixture.componentInstance['jugar']('memoria', true);
    expect(servicio.descuento()).toBe(10);

    await fixture.componentInstance['jugar']('piedra', true);
    expect(servicio.descuento()).toBe(10);
    expect(fixture.componentInstance['mensaje']()).toContain('no se acumula');
  });

  it('el tablero avisa cuando la visita ya se quedó sin descuento', async () => {
    const { fixture } = await abrirJuegos('cliente_registrado');
    expect(texto(fixture, '.game-board__estado')).toContain('Esta es tu primera partida');

    await fixture.componentInstance['jugar']('memoria', false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(texto(fixture, '.game-board__estado')).toContain('no suma descuento');
  });

  it('la partida de quien no es cliente registrado no se manda a la base', async () => {
    const { fixture, servicio } = await abrirJuegos('cliente_anonimo');
    const registrar = vi.spyOn(servicio, 'jugar');

    await fixture.componentInstance['jugar']('adivinanza', true);

    expect(registrar).not.toHaveBeenCalled();
    expect(fixture.componentInstance['mensaje']()).toContain('¡Ganaste!');
    expect(fixture.componentInstance['mensaje']()).toContain('clientes registrados');
  });
});
