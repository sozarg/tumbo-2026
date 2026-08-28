import { TestBed } from '@angular/core/testing';
import { AutenticacionMockService } from './autenticacion-mock.service';
import { SesionService } from './sesion.service';

describe('AutenticacionMockService', () => {
  let service: AutenticacionMockService;
  let sesion: SesionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AutenticacionMockService);
    sesion = TestBed.inject(SesionService);
  });

  it('ofrece un acceso rápido por cada perfil', () => {
    expect(service.modo).toBe('demo');
    expect(service.accesosRapidos().length).toBeGreaterThanOrEqual(8);
  });

  it('cubre los ocho perfiles del enunciado', () => {
    const perfiles = new Set(service.accesosRapidos().map((acceso) => acceso.perfil));
    expect(perfiles.size).toBe(8);
  });

  it('inicia sesión con una credencial de demostración válida', async () => {
    const resultado = await service.ingresar('mateo@tumbo.demo', service.claveDemostracion);
    expect(resultado.usuario.perfil).toBe('dueno');
    expect(sesion.estaAutenticado()).toBe(true);
  });

  it('rechaza una clave incorrecta', async () => {
    await expect(service.ingresar('mateo@tumbo.demo', 'incorrecta')).rejects.toThrow();
    expect(sesion.estaAutenticado()).toBe(false);
  });

  it('el acceso rápido deja la sesión iniciada y el cierre la limpia', async () => {
    const [primero] = service.accesosRapidos();
    await service.ingresarRapido(primero.id);
    expect(sesion.usuario()?.id).toBe(primero.id);

    await service.cerrarSesion();
    expect(sesion.estaAutenticado()).toBe(false);
  });
});
