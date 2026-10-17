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
    const { fixture } = await abrirJuegos('cliente_anonimo');

    // Entra a la ficha, no al cartel de «función exclusiva».
    expect(fixture.debugElement.query(By.css('.game-card'))).not.toBeNull();
    expect(texto(fixture, '.games-regla')).toContain('solo para clientes registrados');
    expect(texto(fixture, '.game-board__estado')).toContain('no otorga descuento');
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
