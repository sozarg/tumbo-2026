import {
  puedeAcceder,
  SECCIONES,
  accesosDelPerfil,
  menuDelPerfil,
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
  it('limita cocina y barra a su sector, y deja los juegos abiertos a los dos clientes', () => {
    expect(SECCIONES.filter((s) => puedeAcceder('cocinero', s.id)).map((s) => s.id)).toEqual([
      'productos',
      'cocina',
    ]);
    expect(SECCIONES.filter((s) => puedeAcceder('cantinero', s.id)).map((s) => s.id)).toEqual([
      'productos',
      'barra',
    ]);
    /*
     * El anónimo entra a los juegos: juega, pero su partida no otorga
     * descuento. La encuesta sigue siendo solo del registrado.
     */
    expect(puedeAcceder('cliente_anonimo', 'juegos')).toBe(true);
    expect(puedeAcceder('cliente_anonimo', 'encuesta')).toBe(false);
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

  /**
   * Punto 20, corrección del profesor: el cliente ya no tiene el botón
   * de «Reportes» suelto en el menú. Se llega desde la encuesta
   * respondida, desde el QR de ingreso (punto 9) y desde el cierre de
   * la cuenta (punto 22), así que la sección sigue siendo accesible:
   * lo que se saca es el botón, no el permiso.
   */
  it('el cliente no ve «Reportes» en el menú pero puede abrirlo, y se llama por su nombre', () => {
    for (const perfil of ['cliente_registrado', 'cliente_anonimo'] as const) {
      expect(puedeAcceder(perfil, 'reportes')).toBe(true);
      expect(menuDelPerfil(perfil).map((s) => s.id)).not.toContain('reportes');
      expect(accesosDelPerfil(perfil).find((s) => s.id === 'reportes')?.titulo).toBe(
        'Encuestas anteriores',
      );
    }
    // A la gerencia no le cambia nada: lo ve en el menú y con su nombre.
    expect(menuDelPerfil('supervisor').map((s) => s.id)).toContain('reportes');
    expect(accesosDelPerfil('supervisor').find((s) => s.id === 'reportes')?.titulo).toBe(
      'Reportes',
    );
  });
});
