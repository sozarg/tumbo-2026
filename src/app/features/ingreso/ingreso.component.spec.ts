import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { provideRouter } from '@angular/router';
import { AutenticacionMockService } from '../../core/services/autenticacion-mock.service';
import { AUTENTICACION } from '../../core/services/autenticacion.port';
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
});
