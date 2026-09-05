import { cuilDeDni, cuilTieneDigitoCorrecto } from './cuil';

describe('cuilDeDni', () => {
  it('usa 20 para varón y 27 para mujer', () => {
    expect(cuilDeDni('31670563', 'M')?.startsWith('20-')).toBe(true);
    expect(cuilDeDni('28139223', 'F')?.startsWith('27-')).toBe(true);
  });

  it('rellena con ceros los DNI de 7 dígitos', () => {
    expect(cuilDeDni('4321098', 'M')).toContain('-04321098-');
  });

  /**
   * La prueba que de verdad importa: lo que el generador arma, el
   * verificador lo tiene que aceptar. Si el algoritmo estuviera mal en
   * una sola de las dos puntas, esto se cae.
   */
  it('todo lo que genera pasa la verificación', () => {
    for (let i = 0; i < 3000; i += 1) {
      const dni = String(10_000_000 + Math.floor(Math.random() * 35_000_000));
      const sexo = Math.random() < 0.5 ? 'F' : 'M';
      const cuil = cuilDeDni(dni, sexo);

      expect(cuil).not.toBeNull();
      expect(cuilTieneDigitoCorrecto(cuil!)).toBe(true);
    }
  });

  /**
   * El caso raro: cuando el resto da 1, el dígito daría 10 y no entra.
   * La convención es pasar el prefijo a 23. Acá se recalcula en lugar
   * de usar los valores memorizados (9 varón / 4 mujer); esta prueba
   * confirma que las dos maneras dan lo mismo.
   */
  it('el prefijo 23 termina en 9 para varón y en 4 para mujer', () => {
    let encontrados = 0;

    for (let dni = 10_000_000; dni < 10_060_000 && encontrados < 40; dni += 1) {
      for (const sexo of ['M', 'F'] as const) {
        const cuil = cuilDeDni(String(dni), sexo);
        if (cuil?.startsWith('23-')) {
          expect(cuil.slice(-1)).toBe(sexo === 'M' ? '9' : '4');
          encontrados += 1;
        }
      }
    }

    expect(encontrados).toBeGreaterThan(0);
  });
});

describe('cuilTieneDigitoCorrecto', () => {
  it('rechaza un CUIL con el último número cambiado', () => {
    const cuil = cuilDeDni('43210987', 'F')!;
    const ultimo = Number(cuil.slice(-1));
    const alterado = cuil.slice(0, -1) + ((ultimo + 1) % 10);

    expect(cuilTieneDigitoCorrecto(cuil)).toBe(true);
    expect(cuilTieneDigitoCorrecto(alterado)).toBe(false);
  });

  it('rechaza lo que no tiene once dígitos', () => {
    expect(cuilTieneDigitoCorrecto('27-4321098-6')).toBe(false);
    expect(cuilTieneDigitoCorrecto('')).toBe(false);
  });

  /**
   * Los CUIL que trae supabase/crear-usuarios.mjs están inventados.
   * Esta prueba lo deja documentado: si algún día se corrigen, falla y
   * hay que actualizarla (que es exactamente lo que queremos que pase).
   */
  it('deja constancia de que los CUIL de la carga inicial son falsos', () => {
    const deLaCarga = ['20-38333444-5', '20-38444555-6', '27-38555666-7', '20-38666777-8'];

    for (const cuil of deLaCarga) {
      expect(cuilTieneDigitoCorrecto(cuil)).toBe(false);
    }
  });
});
