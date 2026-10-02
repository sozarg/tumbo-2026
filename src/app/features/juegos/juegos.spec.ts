import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { INTENTOS, JuegoAdivinanza, pista } from './adivinanza/juego-adivinanza.component';
import {
  JuegoPiedraPapelTijera,
  ganador,
} from './piedra-papel-tijera/juego-piedra-papel-tijera.component';

describe('Adivinanza del número (punto 15)', () => {
  it('da la pista correcta', () => {
    expect(pista(30, 10)).toBe('mayor');
    expect(pista(30, 40)).toBe('menor');
    expect(pista(30, 30)).toBe('acertaste');
  });

  it('seis intentos alcanzan siempre buscando por la mitad', () => {
    for (let secreto = 1; secreto <= 50; secreto++) {
      let bajo = 1;
      let alto = 50;
      let intentos = 0;
      for (;;) {
        intentos++;
        const medio = Math.floor((bajo + alto) / 2);
        const p = pista(secreto, medio);
        if (p === 'acertaste') break;
        if (p === 'mayor') bajo = medio + 1;
        else alto = medio - 1;
      }
      expect(intentos).toBeLessThanOrEqual(INTENTOS);
    }
  });

  function armar(secreto: number) {
    const fixture = TestBed.createComponent(JuegoAdivinanza);
    fixture.componentRef.setInput('numeroFijo', secreto);
    const resultados: boolean[] = [];
    fixture.componentInstance.terminado.subscribe((g) => resultados.push(g));
    fixture.detectChanges();
    const probar = (n: number) => {
      const input = fixture.debugElement.query(By.css('input')).nativeElement as HTMLInputElement;
      input.value = String(n);
      input.dispatchEvent(new Event('input'));
      fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
      fixture.detectChanges();
    };
    const texto = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ');
    return { probar, resultados, texto };
  }

  it('avisa que ganó al acertar', () => {
    const { probar, resultados, texto } = armar(23);
    probar(10);
    expect(texto()).toContain('El número es mayor que 10.');
    probar(23);
    expect(resultados).toEqual([true]);
    expect(texto()).toContain('¡Acertaste! Era el 23.');
  });

  it('avisa que perdió al quedarse sin intentos', () => {
    const { probar, resultados, texto } = armar(50);
    for (let i = 0; i < INTENTOS; i++) probar(1);
    expect(resultados).toEqual([false]);
    expect(texto()).toContain('No llegaste: era el 50.');
  });

  it('un número fuera de rango no gasta un intento', () => {
    const { probar, texto } = armar(5);
    probar(80);
    expect(texto()).toContain('Elegí un número entero del 1 al 50.');
    expect(texto()).toContain(`Te quedan ${INTENTOS} intentos`);
  });
});

describe('Piedra, papel o tijera (punto 15)', () => {
  it('sabe quién gana', () => {
    expect(ganador('piedra', 'tijera')).toBe('persona');
    expect(ganador('papel', 'piedra')).toBe('persona');
    expect(ganador('tijera', 'papel')).toBe('persona');
    expect(ganador('piedra', 'papel')).toBe('tumbito');
    expect(ganador('papel', 'papel')).toBe('empate');
  });

  function armar(tumbito: 'piedra' | 'papel' | 'tijera') {
    const fixture = TestBed.createComponent(JuegoPiedraPapelTijera);
    fixture.componentRef.setInput('jugadaFija', tumbito);
    const resultados: boolean[] = [];
    fixture.componentInstance.terminado.subscribe((g) => resultados.push(g));
    fixture.detectChanges();
    const elegir = (nombre: string) => {
      const boton = fixture.debugElement
        .queryAll(By.css('button'))
        .find((b) => (b.nativeElement as HTMLElement).textContent?.trim() === nombre)!;
      boton.nativeElement.click();
      fixture.detectChanges();
    };
    const texto = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ');
    return { elegir, resultados, texto, fixture };
  }

  it('el empate no termina la partida', () => {
    const { elegir, resultados, texto } = armar('papel');
    elegir('Papel');
    expect(resultados).toEqual([]);
    expect(texto()).toContain('empate. Elegí de nuevo.');
  });

  it('ganar y perder terminan la partida', () => {
    const gana = armar('tijera');
    gana.elegir('Piedra');
    expect(gana.resultados).toEqual([true]);
    const pierde = armar('papel');
    pierde.elegir('Piedra');
    expect(pierde.resultados).toEqual([false]);
    expect(pierde.texto()).toContain('ganó Tumbito.');
  });
});
