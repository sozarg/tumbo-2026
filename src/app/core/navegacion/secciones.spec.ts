import { puedeAcceder, SECCIONES } from './secciones';

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
        'reportes',
      ] as const) {
        expect(puedeAcceder(perfil, seccion)).toBe(false);
      }
      expect(puedeAcceder(perfil, 'menu')).toBe(true);
      expect(puedeAcceder(perfil, 'cuenta')).toBe(true);
    }
  });
  it('limita cocina y barra a su sector y excluye juegos para anónimos', () => {
    expect(SECCIONES.filter((s) => puedeAcceder('cocinero', s.id)).map((s) => s.id)).toEqual([
      'cocina',
    ]);
    expect(SECCIONES.filter((s) => puedeAcceder('cantinero', s.id)).map((s) => s.id)).toEqual([
      'barra',
    ]);
    expect(puedeAcceder('cliente_anonimo', 'juegos')).toBe(false);
    expect(puedeAcceder(undefined, 'personal')).toBe(false);
  });
});
