import { TestBed } from '@angular/core/testing';
import { OperacionService } from './operacion.service';
import { DemoRestauranteService } from './demo-restaurante.service';

describe('Adaptador de operación en demostración', () => {
  it('muestra los datos del mock y refleja las acciones en la misma fuente', async () => {
    const servicio = TestBed.inject(OperacionService);
    const mock = TestBed.inject(DemoRestauranteService);
    expect(servicio.productos()).toEqual(mock.productos());
    expect(servicio.productos().length).toBeGreaterThan(0);
    const producto = servicio.productos()[0];
    servicio.agregarAlCarrito(producto);
    expect(mock.carrito()[0].productoId).toBe(producto.id);
    expect((await servicio.enviarPedido()).ok).toBe(true);
    expect(servicio.pedidoActivo().items[0].productoId).toBe(producto.id);
    expect(servicio.carrito()).toEqual([]);
  });
});
