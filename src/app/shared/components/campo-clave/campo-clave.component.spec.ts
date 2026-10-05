import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { provideIonicAngular } from '@ionic/angular';
import { CampoClave } from './campo-clave.component';

@Component({
  imports: [CampoClave, ReactiveFormsModule],
  template: `
    <form [formGroup]="formulario">
      <tumbo-campo-clave etiqueta="Contraseña" control="clave" />
      <tumbo-campo-clave etiqueta="Repetir contraseña" control="repetirClave" />
    </form>
  `,
})
class Anfitrion {
  readonly formulario = new FormBuilder().nonNullable.group({
    clave: [''],
    repetirClave: [''],
  });
}

describe('Campo de clave: el ojo y el formulario', () => {
  let fixture: ComponentFixture<Anfitrion>;

  const campos = (): HTMLIonInputElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('tumbo-campo-clave ion-input'));
  const ojos = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.campo-clave__ojo'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Anfitrion],
      providers: [provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
  });

  it('nace tapado y el formulario de afuera sigue siendo el dueño del valor', async () => {
    expect(campos().map((campo) => campo.type)).toEqual(['password', 'password']);

    fixture.componentInstance.formulario.patchValue({ clave: 'Tumbito2026' });
    await fixture.whenStable();
    expect(campos()[0].value).toBe('Tumbito2026');
  });

  it('mostrar una clave no destapa la otra', async () => {
    ojos()[0].click();
    await fixture.whenStable();

    /*
     * Lo importante de la prueba es el «y la otra no»: con una señal
     * compartida entre los dos campos —que es lo que pasaría si el
     * estado viviera en la pantalla y no adentro de cada campo— tocar
     * un ojo dejaría las dos contraseñas a la vista de cualquiera que
     * esté mirando el teléfono.
     */
    expect(campos().map((campo) => campo.type)).toEqual(['text', 'password']);

    ojos()[0].click();
    await fixture.whenStable();
    expect(campos().map((campo) => campo.type)).toEqual(['password', 'password']);
  });

  it('el botón dice en voz alta qué hace y en qué estado está', async () => {
    expect(ojos()[0].getAttribute('aria-label')).toBe('Mostrar la contraseña');
    expect(ojos()[0].getAttribute('aria-pressed')).toBe('false');

    ojos()[0].click();
    await fixture.whenStable();
    expect(ojos()[0].getAttribute('aria-label')).toBe('Ocultar la contraseña');
    expect(ojos()[0].getAttribute('aria-pressed')).toBe('true');
  });
});
