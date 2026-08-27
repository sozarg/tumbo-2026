import { TestBed } from '@angular/core/testing';
import { AutenticacionMockService } from './autenticacion-mock.service';

describe('AutenticacionMockService', () => {
  let service: AutenticacionMockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AutenticacionMockService);
  });

  it('se crea y ofrece usuarios de prueba', () => {
    expect(service).toBeTruthy();
    expect(service.usuariosDePrueba.length).toBeGreaterThanOrEqual(8);
  });

  it('inicia sesión con una credencial de demostración válida', async () => {
    const resultado = await service.ingresar('mateo@tumbo.demo', service.claveDemostracion);
    expect(resultado.usuario.perfil).toBe('dueno');
  });
});
