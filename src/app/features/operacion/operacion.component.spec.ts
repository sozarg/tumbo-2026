import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { vi } from 'vitest';
import { provideCargadorDeIlustraciones } from '../../core/imagenes/cargador-de-ilustraciones';
import { AUTENTICACION } from '../../core/services/autenticacion.port';
import { AutenticacionMockService } from '../../core/services/autenticacion-mock.service';
import { ErroresService } from '../../core/services/errores.service';
import { OperacionService } from '../../core/services/operacion.service';
import { SesionService } from '../../core/services/sesion.service';
import { BotonConfirmacion } from '../../shared/components/boton-confirmacion/boton-confirmacion.component';
import { Operacion } from './operacion.component';

describe('Pedidos del cliente: confirmar recepción', () => {
  let fixture: ComponentFixture<Operacion>;
  let servicio: OperacionService;

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
      id: 'cliente-prueba',
      nombres: 'Cliente',
      apellidos: 'Prueba',
      correo: 'cliente@tumbo.demo',
      perfil: 'cliente_registrado',
      etiquetaPerfil: 'Cliente',
      estado: 'aprobado',
      fotoUrl: null,
    });
    vi.spyOn(TestBed.inject(ErroresService), 'mostrar').mockImplementation(async (texto) => texto);
    servicio = TestBed.inject(OperacionService);
    servicio.pedidoActivo.update((pedido) => ({ ...pedido, estado: 'entregado' }));
    fixture = TestBed.createComponent(Operacion);
    fixture.componentInstance['abrir']('pedidos');
    await fixture.whenStable();
  });

  function boton(): BotonConfirmacion {
    return fixture.debugElement
      .query(By.directive(BotonConfirmacion))
      .injector.get(BotonConfirmacion);
  }

  it('conecta la confirmación con la recepción y muestra éxito solo al completarla', async () => {
    const confirmar = vi.spyOn(servicio, 'confirmarRecepcion');
    expect(boton().title()).toBe('Confirmar recepción');
    expect(boton().disabled()).toBe(false);
    expect(confirmar).not.toHaveBeenCalled();

    boton().confirmado.emit();
    await fixture.whenStable();

    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(servicio.pedidoActivo().estado).toBe('recibido');
    expect(boton().disabled()).toBe(true);
    expect(fixture.componentInstance['mensaje']()).toContain('Recepción confirmada.');
    expect(fixture.componentInstance['error']()).toBe('');
    await fixture.componentInstance['recibirPedido']();
    expect(confirmar).toHaveBeenCalledTimes(1);
  });

  it('bloquea emisiones repetidas mientras procesa y permite reintentar tras un error', async () => {
    type Resultado = Awaited<ReturnType<OperacionService['confirmarRecepcion']>>;
    let resolver!: (resultado: Resultado) => void;
    const confirmar = vi.spyOn(servicio, 'confirmarRecepcion').mockImplementationOnce(
      () =>
        new Promise<Resultado>((resolve) => {
          resolver = resolve;
        }),
    );

    const recepcion = fixture.componentInstance['recibirPedido']();
    boton().confirmado.emit();
    fixture.detectChanges();
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(boton().disabled()).toBe(true);
    expect(fixture.debugElement.query(By.css('tumbo-espera'))).not.toBeNull();
    expect(fixture.componentInstance['mensaje']()).toBe('');

    resolver({ ok: false, error: 'No se pudo guardar la recepción.' });
    await recepcion;
    await fixture.whenStable();
    expect(fixture.componentInstance['error']()).toBe('No se pudo guardar la recepción.');
    expect(fixture.componentInstance['mensaje']()).toBe('');
    expect(boton().disabled()).toBe(false);
    expect(fixture.debugElement.query(By.css('tumbo-espera'))).toBeNull();

    boton().confirmado.emit();
    await fixture.whenStable();
    expect(confirmar).toHaveBeenCalledTimes(2);
    expect(servicio.pedidoActivo().estado).toBe('recibido');
    expect(fixture.componentInstance['error']()).toBe('');
  });

  it('libera la espera y usa el aviso de error existente ante una excepción', async () => {
    vi.spyOn(servicio, 'confirmarRecepcion').mockRejectedValueOnce(new Error('Sin conexión.'));
    await fixture.componentInstance['recibirPedido']();
    expect(TestBed.inject(ErroresService).mostrar).toHaveBeenCalledWith('Sin conexión.');
    expect(fixture.componentInstance['error']()).toBe('Sin conexión.');
    expect(fixture.componentInstance['mensaje']()).toBe('');
    expect(fixture.componentInstance['confirmandoRecepcion']()).toBe(false);
  });

  it('no confirma si el pedido dejó de estar entregado mientras el diálogo estaba abierto', async () => {
    const confirmar = vi.spyOn(servicio, 'confirmarRecepcion');
    servicio.pedidoActivo.update((pedido) => ({ ...pedido, estado: 'recibido' }));
    boton().confirmado.emit();
    await fixture.whenStable();
    expect(confirmar).not.toHaveBeenCalled();
    expect(boton().disabled()).toBe(true);
  });
});
