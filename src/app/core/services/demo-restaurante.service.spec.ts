import { TestBed } from '@angular/core/testing';
import { DemoRestauranteService } from './demo-restaurante.service';

describe('DemoRestauranteService', () => {
  let service: DemoRestauranteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DemoRestauranteService);
  });

  it('inicia con los datos mínimos para la demostración', () => {
    expect(service.productos().length).toBeGreaterThanOrEqual(10);
    expect(service.mesas().length).toBeGreaterThanOrEqual(5);
    expect(service.clientesPendientes().length).toBe(1);
  });

  it('impide duplicar mesas y agrega productos al carrito', () => {
    expect(service.registrarMesa({ numero: 2, comensales: 4, tipo: 'estándar' })).toBe(false);
    const producto = service.productos()[0];
    service.agregarAlCarrito(producto);
    service.agregarAlCarrito(producto);
    expect(service.carrito()[0].cantidad).toBe(2);
    expect(service.totalCarrito()).toBe(producto.precio * 2);
  });

  it('aplica solo el descuento del primer intento ganador', () => {
    service.jugar('memoria', true);
    service.jugar('palabras', true);
    expect(service.descuento()).toBe(10);
  });
});
