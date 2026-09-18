import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { vi } from 'vitest';
import { LectorDeDni } from '../../core/dispositivo/lector-de-dni.service';
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
    await fixture.whenStable();
    component['abrir']('productos');
    component['alternarFormulario']();
    await fixture.whenStable();
  });
  it('exige tres fotos, conserva posiciones y reemplaza una sin perder las otras', async () => {
    const first = photo('primera');
    const second = photo('segunda');
    const chooser = vi.spyOn(TestBed.inject(Camara), 'elegirImagen');
    expect(component['productoForm'].controls.fotos.invalid).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.product-photo').length).toBe(3);
    chooser.mockResolvedValueOnce({ estado: 'tomada', foto: first });
    await component['elegirFotoDeProducto'](0);
    expect(component['productoForm'].controls.fotos.invalid).toBe(true);
    chooser.mockResolvedValueOnce({ estado: 'tomada', foto: second });
    await component['elegirFotoDeProducto'](0);
    await fixture.whenStable();
    expect(component['productoForm'].controls.fotos.value).toEqual([second]);
    expect(fixture.nativeElement.querySelectorAll('.product-photo img').length).toBe(1);
    chooser.mockResolvedValueOnce({ estado: 'tomada', foto: first });
    await component['elegirFotoDeProducto'](1);
    expect(component['productoForm'].controls.fotos.invalid).toBe(true);
    chooser.mockResolvedValueOnce({ estado: 'tomada', foto: photo('tercera') });
    await component['elegirFotoDeProducto'](2);
    expect(component['productoForm'].controls.fotos.valid).toBe(true);
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
    expect(save.mock.calls[0][0].fotos).toEqual([second, first, photo('tercera')]);
  });
  it('muestra la primera foto existente y no exige recargarla al editar', async () => {
    service.productos.update((items) =>
      items.map((item, i) =>
        i === 0 ? { ...item, fotos: ['primera.jpg', 'segunda.jpg', 'tercera.jpg'] } : item,
      ),
    );
    const product = service.productos()[0];
    component['editarProducto'](product);
    await fixture.whenStable();
    expect(component['imagenActualDelProducto'](0)).toBe(product.fotos[0]);
    expect(component['productoForm'].controls.fotos.valid).toBe(true);
    const save = vi.spyOn(service, 'actualizarProducto').mockResolvedValue({ ok: true });
    await component['registrarProducto']();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][1].fotos).toEqual([]);
  });
  it('descarta una selección que termina después de cerrar la sesión', async () => {
    let resolver!: (resultado: { estado: 'tomada'; foto: FotoTomada }) => void;
    vi.spyOn(TestBed.inject(Camara), 'elegirImagen').mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    const pendiente = component['elegirFotoDeProducto'](1);
    expect(component['fotoEnCarga']()).toBe(1);
    TestBed.inject(SesionService).cerrar();
    await fixture.whenStable();
    resolver({ estado: 'tomada', foto: photo('sesión-anterior') });
    await pendiente;
    expect(component['fotosDelProducto']()).toEqual([]);
    expect(component['fotoEnCarga']()).toBeNull();
  });
  it('cancelar no altera la imagen; descartar una selección recupera la existente', async () => {
    const product = service.productos()[0];
    component['editarProducto'](product);
    const chooser = vi.spyOn(TestBed.inject(Camara), 'elegirImagen');
    chooser.mockResolvedValueOnce({ estado: 'cancelado' });
    await component['elegirFotoDeProducto'](0);
    expect(component['imagenActualDelProducto'](0)).toBe(product.fotos[0]);
    chooser.mockResolvedValueOnce({ estado: 'tomada', foto: photo('nueva') });
    await component['elegirFotoDeProducto'](0);
    component['quitarFotoDeProducto'](0);
    expect(component['imagenActualDelProducto'](0)).toBe(product.fotos[0]);
    expect(component['productoForm'].controls.fotos.value).toEqual([null]);
  });
  it('DNI incompleto conserva campos manuales y no inventa CUIL ni correo', async () => {
    component['empleadoForm'].patchValue({
      nombres: 'Nombre Manual',
      correo: 'manual@example.invalid',
    });
    vi.spyOn(TestBed.inject(LectorDeDni), 'leer').mockResolvedValue({
      estado: 'leido',
      simulado: false,
      formato: 'PDF417',
      datos: {
        nombres: 'Nombre Leído',
        apellidos: 'Apellido Leído',
        dni: '43210987',
        sexo: 'F',
        cuil: null,
        correo: null,
      },
    });
    await component['leerDniEmpleado']();
    expect(component['empleadoForm'].getRawValue()).toMatchObject({
      nombres: 'Nombre Manual',
      apellidos: 'Apellido Leído',
      correo: 'manual@example.invalid',
      cuil: '',
    });
  });
  it.each([0, 1, 2, 4])('rechaza %i fotos al confirmar', (cantidad) => {
    component['productoForm'].controls.fotos.setValue(
      Array.from({ length: cantidad }, (_, i) => photo(String(i))),
    );
    expect(component['productoForm'].controls.fotos.invalid).toBe(true);
  });
  it('no desplaza las posiciones al quitar la segunda foto', async () => {
    const chooser = vi.spyOn(TestBed.inject(Camara), 'elegirImagen');
    for (const i of [0, 1, 2]) {
      chooser.mockResolvedValueOnce({ estado: 'tomada', foto: photo(String(i)) });
      await component['elegirFotoDeProducto'](i);
    }
    component['quitarFotoDeProducto'](1);
    expect(component['productoForm'].controls.fotos.value).toEqual([photo('0'), null, photo('2')]);
    expect(component['productoForm'].controls.fotos.invalid).toBe(true);
  });
  it('cambiar usuario limpia formulario y fotos sin recargar', async () => {
    vi.spyOn(TestBed.inject(Camara), 'elegirImagen').mockResolvedValueOnce({
      estado: 'tomada',
      foto: photo('anterior'),
    });
    await component['elegirFotoDeProducto'](0);
    TestBed.inject(SesionService).cerrar();
    await fixture.whenStable();
    expect(component['fotosDelProducto']()).toEqual([]);
    expect(component['empleadoForm'].controls.clave.value).toBe('');
  });
});
