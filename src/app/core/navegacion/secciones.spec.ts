import {
  puedeAcceder,
  SECCIONES,
  accesosDelPerfil,
  tipoProductoDelPerfil,
  esGerencia,
} from './secciones';

describe('Acceso a secciones por rol', () => {
  it('permite al dueño acceder a todas las secciones', () => {
    expect(SECCIONES.every((s) => puedeAcceder('dueno', s.id))).toBe(true);
  });
  it('impide a clientes acceder a altas y tareas del personal', () => {
    for (const perfil of ['cliente_registrado', 'cliente_anonimo'] as const) {
      for (const seccion of [
        'personal',
        'productos',
        'mesas',
        'clientes',
        'espera',
        'cocina',
        'barra',
      ] as const) {
        expect(puedeAcceder(perfil, seccion)).toBe(false);
      }
      expect(puedeAcceder(perfil, 'menu')).toBe(true);
      expect(puedeAcceder(perfil, 'cuenta')).toBe(true);
    }
  });
  it('limita cocina y barra a su sector y excluye juegos para anónimos', () => {
    expect(SECCIONES.filter((s) => puedeAcceder('cocinero', s.id)).map((s) => s.id)).toEqual([
      'productos',
      'cocina',
    ]);
    expect(SECCIONES.filter((s) => puedeAcceder('cantinero', s.id)).map((s) => s.id)).toEqual([
      'productos',
      'barra',
    ]);
    expect(puedeAcceder('cliente_anonimo', 'juegos')).toBe(false);
    expect(puedeAcceder(undefined, 'personal')).toBe(false);
  });
  it('habilita las tareas de salón sin otorgar permisos de gerencia', () => {
    expect(accesosDelPerfil('metre').map((s) => s.id)).toEqual(['espera', 'mesas', 'clientes']);
    expect(accesosDelPerfil('mozo').map((s) => s.id)).toEqual([
      'pedidos',
      'mesas',
      'consulta',
      'cuenta',
    ]);
    expect(esGerencia('metre')).toBe(false);
    expect(esGerencia('mozo')).toBe(false);
    expect(esGerencia('supervisor')).toBe(true);
  });
  it('separa el catálogo y prioriza las tareas de cada sector', () => {
    expect(accesosDelPerfil('cocinero').map((s) => s.titulo)).toEqual(['Cocina', 'Platos']);
    expect(accesosDelPerfil('cantinero').map((s) => s.titulo)).toEqual(['Barra', 'Bebidas']);
    expect(tipoProductoDelPerfil('cocinero')).toBe('plato');
    expect(tipoProductoDelPerfil('cantinero')).toBe('bebida');
    expect(tipoProductoDelPerfil('dueno')).toBeUndefined();
  });
  it('permite consultar resultados de encuestas a ambos tipos de cliente', () => {
    expect(puedeAcceder('cliente_registrado', 'reportes')).toBe(true);
    expect(puedeAcceder('cliente_anonimo', 'reportes')).toBe(true);
    expect(accesosDelPerfil(undefined)).toEqual([]);
  });
});
