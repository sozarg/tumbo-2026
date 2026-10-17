import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { MesaDemo } from '../../core/models/demo-restaurante';
import { OperacionService } from '../../core/services/operacion.service';
import { abrirComo } from './operacion.testing';

/**
 * La asignación de mesa desde la lista de espera.
 *
 * Dos cosas se cuidan acá. Una es que el aviso diga la verdad: el
 * servicio devuelve un objeto `{ ok, error }` y un objeto siempre da
 * verdadero, así que preguntarle directamente al resultado hacía que
 * todo saliera "asignada y notificada", incluso cuando la base lo había
 * rechazado. La otra es que la tarjeta muestre todas las mesas libres a
 * la vez: antes iban de a una con un paginador adentro de la tarjeta y
 * se leía como si la persona tuviera varias mesas asignadas.
 */
describe('Asignar mesa desde la lista de espera', () => {
  const mesa = (numero: number, disponible = true): MesaDemo => ({
    id: 'mesa-' + numero,
    numero,
    comensales: 4,
    tipo: 'estándar',
    disponible,
    qrToken: 'token-' + numero,
    fotoUrl: null,
  });

  const abrirEspera = async () => {
    const fixture = await abrirComo('dueno', 'espera');
    const servicio = TestBed.inject(OperacionService);
    servicio.mesas.set([mesa(1), mesa(2), mesa(3), mesa(4, false)]);
    servicio.espera.set([
      { id: 'espera-1', nombre: 'Camila Pérez', foto: '', fecha: '17/10/2026 20:10' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, servicio };
  };

  it('si la base rechaza la asignación, muestra el motivo y no canta éxito', async () => {
    const { fixture, servicio } = await abrirEspera();
    vi.spyOn(servicio, 'asignarMesa').mockResolvedValue({
      ok: false,
      error: 'Esa mesa ya está ocupada.',
    });
    const recarga = vi.spyOn(servicio, 'cargar').mockResolvedValue(undefined);

    await fixture.componentInstance['asignarMesa']('espera-1', 2);

    expect(fixture.componentInstance['error']()).toBe('Esa mesa ya está ocupada.');
    expect(fixture.componentInstance['mensaje']()).toBe('');
    // Y la lista se refresca: lo que estaba en pantalla ya no era lo que hay.
    expect(recarga).toHaveBeenCalled();
  });

  it('si sale bien, avisa que la mesa quedó asignada', async () => {
    const { fixture, servicio } = await abrirEspera();
    vi.spyOn(servicio, 'asignarMesa').mockResolvedValue({ ok: true });

    await fixture.componentInstance['asignarMesa']('espera-1', 2);

    expect(fixture.componentInstance['mensaje']()).toBe('Mesa 2 asignada y notificada.');
    expect(fixture.componentInstance['error']()).toBe('');
  });

  it('la tarjeta ofrece todas las mesas libres juntas, no de a una', async () => {
    const { fixture } = await abrirEspera();

    const fichas = fixture.debugElement
      .queryAll(By.css('.assign-actions__mesa'))
      .map((ficha) => (ficha.nativeElement as HTMLElement).textContent?.trim());

    // La 4 no está porque no está disponible.
    expect(fichas).toEqual(['Mesa 1', 'Mesa 2', 'Mesa 3']);
  });

  it('el lugar que sobra en la pantalla lo ocupa un panel, no queda en blanco', async () => {
    const { fixture } = await abrirEspera();
    // Una pantalla alta: abajo de la única tarjeta sobra media pantalla.
    fixture.componentInstance['sobraEnLista'].set(300);
    fixture.detectChanges();
    await fixture.whenStable();

    const panel = fixture.debugElement.query(By.css('.wait-slot'));

    expect(panel).not.toBeNull();
    expect((panel.nativeElement as HTMLElement).textContent).toContain('no hay nadie más');
  });

  it('una mesa ya tomada por otra persona en espera deja de ofrecerse', async () => {
    const { fixture, servicio } = await abrirEspera();
    servicio.espera.set([
      { id: 'espera-1', nombre: 'Camila Pérez', foto: '', fecha: '17/10/2026 20:10' },
      {
        id: 'espera-2',
        nombre: 'Luis Gómez',
        foto: '',
        fecha: '17/10/2026 20:15',
        mesaAsignada: 2,
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const fichas = fixture.debugElement
      .queryAll(By.css('.assign-actions__mesa'))
      .map((ficha) => (ficha.nativeElement as HTMLElement).textContent?.trim());

    expect(fichas).toEqual(['Mesa 1', 'Mesa 3']);
  });
});
