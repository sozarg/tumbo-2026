import { TestBed } from '@angular/core/testing';
import { ErroresService } from './errores.service';

/**
 * R9 pide vibración ante TODOS los errores. Lo que se prueba acá no es
 * que el celular vibre —eso solo se puede ver en el dispositivo— sino
 * que el camino centralizado funcione y no se rompa en el navegador,
 * donde el plugin de vibración no existe. Si esto fallara, todos los
 * catch de la aplicación quedarían sin efecto.
 */
describe('ErroresService', () => {
  let servicio: ErroresService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(ErroresService);
  });

  it('registra el mensaje y lo devuelve', async () => {
    const mensaje = await servicio.mostrar('No se pudo iniciar sesión.');
    expect(mensaje).toBe('No se pudo iniciar sesión.');
    expect(servicio.ultimoError()).toBe('No se pudo iniciar sesión.');
  });

  it('saca el texto de una excepción', async () => {
    const mensaje = await servicio.desdeExcepcion(new Error('Clave incorrecta'), 'respaldo');
    expect(mensaje).toBe('Clave incorrecta');
  });

  it('usa el respaldo cuando lo que se lanzó no es un Error', async () => {
    expect(await servicio.desdeExcepcion('algo raro', 'No se pudo completar.')).toBe(
      'No se pudo completar.',
    );
    expect(await servicio.desdeExcepcion(new Error(''), 'No se pudo completar.')).toBe(
      'No se pudo completar.',
    );
  });

  it('no explota sin motor de vibración, que es el caso del navegador', async () => {
    await expect(servicio.mostrar('Error grave', 'grave')).resolves.toBe('Error grave');
  });

  it('limpia el último error', async () => {
    await servicio.mostrar('algo');
    servicio.limpiar();
    expect(servicio.ultimoError()).toBe('');
  });
});
