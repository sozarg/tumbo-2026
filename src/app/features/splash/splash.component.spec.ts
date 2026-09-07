import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { PrecargaDiferida } from '../../core/rutas/precarga-diferida';
import { SesionService } from '../../core/services/sesion.service';
import { SonidosService } from '../../core/services/sonidos.service';
import { Splash } from './splash.component';

// Exponemos los eventos de la plantilla para verificar el ciclo de vida sin red.
class SplashPrueba extends Splash {
  fallarImagen(): void {
    this.imagenFallida();
  }
  reintentar(): Promise<void> {
    return this.continuar();
  }
  tieneError(): boolean {
    return this.error();
  }
}

describe('Splash', () => {
  const navegar = vi.fn();
  const liberar = vi.fn();
  const sonido = vi.fn();
  let autenticado = false;
  let reducida = false;
  let splash: SplashPrueba;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    autenticado = false;
    reducida = false;
    navegar.mockResolvedValue(true);
    vi.stubGlobal('matchMedia', () => ({ matches: reducida }));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      setTimeout(() => callback(0), 16),
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate: navegar } },
        { provide: SesionService, useValue: { estaAutenticado: () => autenticado } },
        { provide: PrecargaDiferida, useValue: { liberar } },
        { provide: SonidosService, useValue: { sonarApertura: sonido } },
      ],
    });
    splash = TestBed.runInInjectionContext(() => new SplashPrueba());
  });

  afterEach(() => {
    splash.ngOnDestroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('continúa aunque la imagen nunca responda y libera la precarga después de navegar', async () => {
    splash.ngOnInit();
    await vi.advanceTimersByTimeAsync(4_515);
    expect(navegar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(navegar).toHaveBeenCalledWith(['/ingreso'], { replaceUrl: true });
    expect(liberar).toHaveBeenCalledOnce();
  });

  it('respeta movimiento reducido sin una espera de tres segundos', async () => {
    reducida = true;
    splash.ngOnInit();
    splash.fallarImagen();
    await vi.advanceTimersByTimeAsync(616);
    expect(navegar).toHaveBeenCalledOnce();
  });

  it('dirige una sesión activa a operación', async () => {
    autenticado = true;
    await splash.reintentar();
    expect(navegar).toHaveBeenCalledWith(['/operacion'], { replaceUrl: true });
  });

  it('permite reintentar una navegación fallida', async () => {
    navegar.mockRejectedValueOnce(new Error('No se pudo cargar la ruta'));
    await splash.reintentar();
    expect(splash.tieneError()).toBe(true);
    expect(liberar).not.toHaveBeenCalled();
    await splash.reintentar();
    expect(splash.tieneError()).toBe(false);
    expect(navegar).toHaveBeenCalledTimes(2);
  });

  it('no duplica una navegación pendiente', async () => {
    let completar: (value: boolean) => void = () => undefined;
    navegar.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        completar = resolve;
      }),
    );
    const pendiente = splash.reintentar();
    await splash.reintentar();
    expect(navegar).toHaveBeenCalledOnce();
    completar(true);
    await pendiente;
  });

  it('cancela el arranque al abandonar la pantalla', async () => {
    splash.ngOnInit();
    splash.fallarImagen();
    splash.ngOnDestroy();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(navegar).not.toHaveBeenCalled();
  });
});
