import { leerCodigoDeDni } from './codigo-de-dni';
import { cuilTieneDigitoCorrecto } from '../validacion/cuil';
import { DocumentoDePrueba, inventarTanda } from '../../../../tools/generar-qr-dni.mjs';

/**
 * El puente entre el generador de QR de prueba y el lector.
 *
 * POR QUÉ ESTA PRUEBA EXISTE
 * `tools/generar-qr-dni.mjs` tiene su propia copia del algoritmo del
 * CUIL: es un script de Node y no puede importar el TypeScript de la
 * aplicación. Dos copias del mismo algoritmo se separan sin que nadie se
 * dé cuenta, y el síntoma sería el peor posible: la hoja de documentos
 * impresa deja de funcionar justo en la defensa.
 *
 * Acá se importa el script de verdad y se comprueba que TODO lo que
 * genera lo lee el parser de la aplicación, con el CUIL cerrando. Si
 * alguien toca una de las dos copias, esto se cae.
 */

const TANDA: readonly DocumentoDePrueba[] = inventarTanda(60, 2026);

describe('los QR de prueba', () => {
  it('el lector entiende todos', () => {
    for (const documento of TANDA) {
      expect(leerCodigoDeDni(documento.carga)).not.toBeNull();
    }
  });

  it('los datos leídos son los que el script dijo que puso', () => {
    for (const documento of TANDA) {
      const leido = leerCodigoDeDni(documento.carga)!;

      expect(leido.dni).toBe(documento.dni);
      expect(leido.sexo).toBe(documento.sexo);
      expect(leido.apellidos.toLowerCase()).toBe(documento.apellidos.toLowerCase());
      expect(leido.nombres.toLowerCase()).toBe(documento.nombres.toLowerCase());
    }
  });

  /**
   * La que atrapa la deriva entre las dos copias del módulo 11: si el
   * script calculara mal el dígito, el parser lo detectaría y caería al
   * cálculo propio, y el CUIL leído dejaría de ser el del documento.
   */
  it('el CUIL que trae cada documento es el correcto', () => {
    for (const documento of TANDA) {
      const leido = leerCodigoDeDni(documento.carga)!;
      // El CUIL ya no es el último campo: después va el correo. Se lo
      // busca por su forma, igual que hace el parser.
      const delDocumento = documento.carga.split('@').find((c) => /^[0-9]{3}$/.test(c));

      expect(cuilTieneDigitoCorrecto(leido.cuil!)).toBe(true);
      expect(leido.cuil!.replace(/\D/g, '').slice(2, -1)).toBe(documento.dni);
      // El prefijo y el dígito del CUIL leído son los que puso el script.
      expect(leido.cuil!.replace(/\D/g, '').slice(0, 2) + leido.cuil!.slice(-1)).toBe(delDocumento);
    }
  });

  describe('el correo que agregamos', () => {
    it('el lector lo recupera de todos', () => {
      for (const documento of TANDA) {
        expect(leerCodigoDeDni(documento.carga)!.correo).toBe(documento.correo);
      }
    });

    /**
     * La arroba es el separador del formato. Si el generador la
     * escribiera sin escapar, el correo se partiría en dos campos y el
     * lector no encontraría ninguno: el campo quedaría vacío en el alta
     * y nadie sabría por qué.
     */
    it('viaja escapado dentro del código', () => {
      for (const documento of TANDA) {
        expect(documento.carga).toContain('%40');
        // Nueve campos del documento más el correo; la variante nueva
        // suma uno más después del trámite.
        expect(documento.carga.split('@')).toHaveLength(
          documento.variante === 'nueva' ? 11 : 10,
        );
      }
    });

    it('no hay dos correos iguales', () => {
      expect(new Set(TANDA.map((d) => d.correo)).size).toBe(TANDA.length);
    });
  });

  it('genera las dos variantes del formato', () => {
    const variantes = new Set(TANDA.map((d) => d.variante));
    expect(variantes).toEqual(new Set(['vieja', 'nueva']));
  });

  it('no repite ningún DNI', () => {
    expect(new Set(TANDA.map((d) => d.dni)).size).toBe(TANDA.length);
  });

  /**
   * Los números tienen que estar fuera del rango asignado a personas
   * nacidas en el país: un DNI inventado en el rango normal podría ser
   * el de alguien de verdad.
   */
  it('usa números que no son de nadie', () => {
    for (const documento of TANDA) {
      expect(Number(documento.dni)).toBeGreaterThanOrEqual(95_000_000);
      expect(documento.dni).toHaveLength(8);
    }
  });

  /** La misma semilla tiene que reimprimir la misma hoja. */
  it('con la misma semilla da la misma tanda', () => {
    expect(inventarTanda(10, 7)).toEqual(inventarTanda(10, 7));
    expect(inventarTanda(10, 7)).not.toEqual(inventarTanda(10, 8));
  });
});
