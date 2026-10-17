import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { OperacionService } from '../../core/services/operacion.service';
import { Operacion } from './operacion.component';
import { abrirComo } from './operacion.testing';

/**
 * La ficha del personal (punto 2).
 *
 * El legajo entero tiene que leerse: el profesor marcó en la preentrega
 * que la lista mostraba solo nombre y apellido. Ya estaban los datos,
 * pero compartiendo renglón con la foto les quedaban unos 150px y el
 * correo se partía al medio, así que ahora van en su propia fila, a lo
 * ancho de la ficha.
 */
describe('La ficha del personal', () => {
  const abrirPersonal = async () => {
    const fixture = await abrirComo('dueno', 'personal');
    const servicio = TestBed.inject(OperacionService);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, servicio };
  };

  const filas = (fixture: ComponentFixture<Operacion>) =>
    fixture.debugElement.queryAll(By.css('.person-card--legajo .person-card__dato')).map((fila) => {
      const elemento = fila.nativeElement as HTMLElement;
      return {
        etiqueta: elemento.querySelector('dt')?.textContent?.trim(),
        valor: elemento.querySelector('dd')?.textContent?.trim(),
      };
    });

  it('muestra correo, DNI y CUIL como filas de etiqueta y valor', async () => {
    const { fixture, servicio } = await abrirPersonal();
    const empleado = servicio.empleados()[0];

    const tres = filas(fixture).slice(0, 3);

    expect(tres.map((f) => f.etiqueta)).toEqual(['Correo', 'DNI', 'CUIL']);
    expect(tres[0].valor).toBe(empleado.correo);
  });

  it('cuando la última página viene incompleta, el hueco lo ocupa un panel', async () => {
    const { fixture } = await abrirPersonal();
    // Entran dos fichas por pantalla y en esta página hay una sola.
    fixture.componentInstance['porPagina'].set(2);
    fixture.componentInstance['pagina'].set(
      Math.max(0, Math.ceil(TestBed.inject(OperacionService).empleados().length / 2) - 1),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    const panel = fixture.debugElement.query(By.css('.person-list--personal .wait-slot'));

    expect(fixture.componentInstance['hayLugarEnPersonal']()).toBe(true);
    expect(panel).not.toBeNull();
  });
});
