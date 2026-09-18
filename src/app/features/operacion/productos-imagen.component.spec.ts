import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { vi } from 'vitest';
import { Camara, FotoTomada } from '../../core/dispositivo/camara.service';
import { provideCargadorDeIlustraciones } from '../../core/imagenes/cargador-de-ilustraciones';
import { AUTENTICACION } from '../../core/services/autenticacion.port';
import { AutenticacionMockService } from '../../core/services/autenticacion-mock.service';
import { OperacionService } from '../../core/services/operacion.service';
import { SesionService } from '../../core/services/sesion.service';
import { Operacion } from './operacion.component';

describe('Productos: una imagen visible y contrato de fotos compatible', () => {
  let fixture: ComponentFixture<Operacion>;
  let component: Operacion;
  let service: OperacionService;
  const photo = (name: string): FotoTomada => ({
    file: new File(['imagen'], name + '.png', { type: 'image/png' }),
    previewUrl: 'data:image/png;base64,' + name,
    simulada: true,
  });
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Operacion],
      providers: [
        provideIonicAngular(),
        provideCargadorDeIlustraciones(),
        provideRouter([]),
        { provide: AUTENTICACION, useClass: AutenticacionMockService },
      ],
    }).compileComponents();
    TestBed.inject(SesionService).iniciar({
      id: 'qa',
      nombres: 'Prueba',
      apellidos: 'Producto',
      correo: 'qa@tumbo.demo',
      perfil: 'dueno',
      etiquetaPerfil: 'Dueño',
      estado: 'aprobado',
      fotoUrl: null,
    });
    service = TestBed.inject(OperacionService);
    fixture = TestBed.createComponent(Operacion);
    component = fixture.componentInstance;
    component['abrir']('productos');
    component['alternarFormulario']();
    await fixture.whenStable();
  });
  it('exige una imagen en alta, reemplaza la selección y envía un array de una foto', async () => {
    const first = photo('primera');
    const second = photo('segunda');
    const chooser = vi.spyOn(TestBed.inject(Camara), 'elegirImagen');
    expect(component['productoForm'].controls.fotos.invalid).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.product-photo').length).toBe(1);
    chooser.mockResolvedValueOnce({ estado: 'tomada', foto: first });
    await component['elegirFotoDeProducto'](0);
    expect(component['productoForm'].controls.fotos.valid).toBe(true);
    chooser.mockResolvedValueOnce({ estado: 'tomada', foto: second });
    await component['elegirFotoDeProducto'](0);
    await fixture.whenStable();
    expect(component['productoForm'].controls.fotos.value).toEqual([second]);
    expect(fixture.nativeElement.querySelectorAll('.product-photo img').length).toBe(1);
    component['productoForm'].patchValue({
      nombre: 'Producto prueba',
      descripcion: 'Descripción del producto de prueba',
      minutos: 10,
      precio: 2500,
      tipo: 'plato',
    });
    const save = vi.spyOn(service, 'registrarProducto').mockResolvedValue({ ok: true });
    await component['registrarProducto']();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].fotos).toEqual([second]);
  });
  it('muestra la primera foto existente y no exige recargarla al editar', async () => {
    const product = service.productos()[0];
    component['editarProducto'](product);
    await fixture.whenStable();
    expect(component['imagenActualDelProducto']()).toBe(product.fotos[0]);
    expect(component['productoForm'].controls.fotos.valid).toBe(true);
    const save = vi.spyOn(service, 'actualizarProducto').mockResolvedValue({ ok: true });
    await component['registrarProducto']();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][1].fotos).toEqual([]);
  });
  it('cancelar no altera la imagen; descartar una selección recupera la existente', async () => {
    const product = service.productos()[0];
    component['editarProducto'](product);
    const chooser = vi.spyOn(TestBed.inject(Camara), 'elegirImagen');
    chooser.mockResolvedValueOnce({ estado: 'cancelado' });
    await component['elegirFotoDeProducto'](0);
    expect(component['imagenActualDelProducto']()).toBe(product.fotos[0]);
    chooser.mockResolvedValueOnce({ estado: 'tomada', foto: photo('nueva') });
    await component['elegirFotoDeProducto'](0);
    component['quitarFotoDeProducto'](0);
    expect(component['imagenActualDelProducto']()).toBe(product.fotos[0]);
    expect(component['productoForm'].controls.fotos.value).toEqual([]);
  });
});
