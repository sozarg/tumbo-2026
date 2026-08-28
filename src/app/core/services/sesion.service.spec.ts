import { TestBed } from '@angular/core/testing';
import { Usuario } from '../models/usuario';
import { SesionService } from './sesion.service';

describe('SesionService', () => {
  let service: SesionService;
  const usuario: Usuario = {
    id: 'demo',
    nombres: 'Usuario',
    apellidos: 'Demo',
    correo: 'demo@tumbo.demo',
    perfil: 'mozo',
    etiquetaPerfil: 'Mozo',
    estado: 'aprobado',
    fotoUrl: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SesionService);
  });

  it('inicia y cierra una sesión', () => {
    service.iniciar(usuario);
    expect(service.estaAutenticado()).toBe(true);
    expect(service.usuario()?.correo).toBe(usuario.correo);
    service.cerrar();
    expect(service.estaAutenticado()).toBe(false);
  });

  it('deja el usuario en nulo al cerrar', () => {
    service.iniciar(usuario);
    service.cerrar();
    expect(service.usuario()).toBeNull();
  });
});
