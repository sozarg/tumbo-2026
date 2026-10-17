import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { AutenticacionMockService } from '../../core/services/autenticacion-mock.service';
import { AUTENTICACION } from '../../core/services/autenticacion.port';
import { SesionService } from '../../core/services/sesion.service';
import { Ingreso } from './ingreso.component';

describe('Ingreso', () => {
  let component: Ingreso;
  let fixture: ComponentFixture<Ingreso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ingreso],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: AUTENTICACION, useClass: AutenticacionMockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Ingreso);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * Regresión de R13.
   *
   * `ion-router-outlet` no destruye esta pantalla al navegar: la deja en
   * la pila. Al cerrar sesión se vuelve a la MISMA instancia, así que si
   * no se reinicia a mano, la siguiente persona ve el correo del
   * anterior y, si había tocado el ojito, su clave en texto plano.
   *
   * Se llama a `ionViewWillEnter` directamente porque en una prueba
   * unitaria no hay router de Ionic que lo dispare.
   */
  it('borra las credenciales al volver a la pantalla', () => {
    const componenteInterno = component as unknown as {
      formulario: { setValue(v: { correo: string; clave: string }): void; value: unknown };
      mostrarClave: { set(v: boolean): void; (): boolean };
      errorMensaje: { set(v: string): void; (): string };
      ionViewWillEnter(): void;
    };

    componenteInterno.formulario.setValue({
      correo: 'mateo@tumbo.demo',
      clave: 'Tumbito2026',
    });
    componenteInterno.mostrarClave.set(true);
    componenteInterno.errorMensaje.set('El correo o la clave no coinciden.');

    componenteInterno.ionViewWillEnter();

    // El grupo es `nonNullable`, así que reset() deja cadena vacía y no
    // null. Es lo que queremos: el input queda en blanco de verdad.
    expect(componenteInterno.formulario.value).toEqual({ correo: '', clave: '' });
    expect(componenteInterno.mostrarClave()).toBe(false);
    expect(componenteInterno.errorMensaje()).toBe('');
  });

  /**
   * La vuelta del cliente anónimo.
   *
   * Se llega a esta pantalla con la sesión viva más seguido de lo que
   * parece —el botón de atrás de Android, por ejemplo—. El empleado
   * vuelve a entrar con su correo, pero el anónimo no tiene
   * credenciales: su identidad es el token guardado. Sin este botón, lo
   * que pierde no es «la sesión», es la visita entera.
   */
  it('ofrece volver a la sesión que quedó abierta', async () => {
    TestBed.inject(SesionService).iniciar({
      id: 'anonimo-1',
      nombres: 'Martín',
      apellidos: '',
      correo: '',
      perfil: 'cliente_anonimo',
      etiquetaPerfil: 'Cliente sin cuenta',
      estado: 'aprobado',
      fotoUrl: null,
    });

    (component as unknown as { ionViewWillEnter(): void }).ionViewWillEnter();
    await fixture.whenStable();
    fixture.detectChanges();

    const boton = fixture.debugElement.query(By.css('.login-card__sesion ion-button'));

    expect(boton).not.toBeNull();
    expect((boton.nativeElement as HTMLElement).textContent).toContain('Seguir como Martín');
  });

  it('sin sesión abierta no ofrece nada', async () => {
    (component as unknown as { ionViewWillEnter(): void }).ionViewWillEnter();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.login-card__sesion'))).toBeNull();
  });
});
