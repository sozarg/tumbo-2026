import { leerCodigoDeDni } from './codigo-de-dni';
import { cuilDeDni, cuilTieneDigitoCorrecto } from '../validacion/cuil';

/**
 * Los códigos de estas pruebas son inventados: el DNI y el CUIL no son de
 * ninguna persona. Lo que se prueba es la FORMA del código, que es
 * pública, no los datos de nadie.
 */

/** Variante vieja: nueve campos, arranca con el número de trámite. */
const VIEJA = '00123456789@PEREZ GOMEZ@MARIA LAURA@F@43210987@A@01/01/1990@01/01/2015@274';

/** Variante nueva: un campo más después del trámite, todo corrido un lugar. */
const NUEVA = '00123456789@A@PEREZ GOMEZ@MARIA LAURA@F@43210987@A@01/01/1990@01/01/2015@274';

describe('leerCodigoDeDni', () => {
  it('lee la variante vieja', () => {
    const datos = leerCodigoDeDni(VIEJA);

    expect(datos?.apellidos).toBe('Perez Gomez');
    expect(datos?.nombres).toBe('Maria Laura');
    expect(datos?.dni).toBe('43210987');
    expect(datos?.sexo).toBe('F');
  });

  /**
   * LA PRUEBA QUE JUSTIFICA EL DISEÑO.
   *
   * Si el parser contara posiciones desde el principio, acá el apellido
   * caería en el nombre y el nombre en el apellido, sin error ninguno:
   * el alta se guardaría con los datos cruzados y nadie se enteraría
   * hasta que el empleado mire su propio legajo.
   */
  it('lee la variante nueva igual que la vieja', () => {
    expect(leerCodigoDeDni(NUEVA)).toEqual(leerCodigoDeDni(VIEJA));
  });

  it('reconoce el varón', () => {
    expect(leerCodigoDeDni(VIEJA.replace('@F@', '@M@'))?.sexo).toBe('M');
  });

  it('acepta DNI de siete dígitos', () => {
    expect(leerCodigoDeDni(VIEJA.replace('43210987', '4321098'))?.dni).toBe('4321098');
  });

  describe('el CUIL', () => {
    it('usa el que trae el código cuando el dígito cierra', () => {
      // 27-43210987-4 es el que va en el campo final de VIEJA, y cierra.
      const datos = leerCodigoDeDni(VIEJA);
      expect(datos?.cuil).not.toBeNull();
      expect(cuilTieneDigitoCorrecto(datos!.cuil!)).toBe(true);
    });

    /**
     * Un código con el CUIL roto no puede envenenar el formulario: si el
     * dígito no cierra, se calcula en lugar de copiarlo.
     */
    it('lo calcula si el del código tiene el dígito mal', () => {
      const roto = VIEJA.replace(/@274$/, '@279');
      expect(leerCodigoDeDni(roto)?.cuil).toBe(cuilDeDni('43210987', 'F'));
    });

    it('lo calcula si el código no trae CUIL', () => {
      const sinCuil = VIEJA.replace(/@274$/, '');
      expect(leerCodigoDeDni(sinCuil)?.cuil).toBe(cuilDeDni('43210987', 'F'));
    });

    /**
     * Cualquiera sea el camino —copiado del código o calculado— lo que
     * sale tiene que pasar el mismo validador que usa el formulario.
     */
    it('siempre sale un CUIL que el formulario acepta', () => {
      for (let i = 0; i < 500; i += 1) {
        const dni = String(10_000_000 + Math.floor(Math.random() * 35_000_000));
        const sexo = Math.random() < 0.5 ? 'F' : 'M';
        const datos = leerCodigoDeDni(
          `0011@APELLIDO@NOMBRE@${sexo}@${dni}@A@01/01/1990@01/01/2015`,
        );

        expect(datos).not.toBeNull();
        expect(cuilTieneDigitoCorrecto(datos!.cuil!)).toBe(true);
      }
    });

    it('el CUIL contiene el DNI leído', () => {
      const datos = leerCodigoDeDni(VIEJA);
      expect(datos!.cuil!.replace(/\D/g, '').slice(2, -1)).toBe('43210987');
    });
  });

  describe('lo que no es un DNI', () => {
    /**
     * El lector está configurado para QR además de PDF417, así que va a
     * leer cualquier QR que se le ponga adelante: el de una mesa, el de
     * una propina. Tiene que devolver null, no datos a medias.
     */
    it.each([
      ['un QR de mesa', 'tumbo://mesa/3'],
      ['un QR de propina', 'tumbo://propina/10'],
      ['texto suelto', 'hola'],
      ['vacío', ''],
      ['arrobas sin datos', '@@@@@'],
      ['sin campo de sexo', '0011@PEREZ@MARIA@X@43210987@A'],
      ['sin DNI después del sexo', '0011@PEREZ@MARIA@F@nada@A'],
      ['el sexo demasiado al principio', 'F@43210987@A@B@C'],
    ])('devuelve null con %s', (_, codigo) => {
      expect(leerCodigoDeDni(codigo)).toBeNull();
    });
  });

  describe('cómo quedan los nombres', () => {
    it('pasa las mayúsculas del código a capitalizado', () => {
      expect(leerCodigoDeDni(VIEJA)?.nombres).toBe('Maria Laura');
    });

    it('respeta los apellidos compuestos con guion', () => {
      const datos = leerCodigoDeDni(VIEJA.replace('PEREZ GOMEZ', 'PEREZ-GOMEZ'));
      expect(datos?.apellidos).toBe('Perez-Gomez');
    });

    /**
     * Lo que sale del parser tiene que entrar en los campos sin que el
     * formulario lo rechace: el validador `soloLetras` no acepta números
     * ni símbolos, y `LIMITES.nombres` corta en 50.
     */
    it('sale limpio para los validadores del formulario', () => {
      const datos = leerCodigoDeDni(VIEJA);

      for (const valor of [datos!.nombres, datos!.apellidos]) {
        expect(valor.length).toBeGreaterThanOrEqual(2);
        expect(valor.length).toBeLessThanOrEqual(50);
        expect(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$/.test(valor)).toBe(true);
      }
    });
  });

  describe('el correo', () => {
    /** Un DNI real no trae ninguno: el campo queda para que lo complete la pantalla. */
    it('es null cuando el código no trae', () => {
      expect(leerCodigoDeDni(VIEJA)?.correo).toBeNull();
    });

    it('lo lee cuando viene con la arroba escapada', () => {
      const con = `${VIEJA}@maria.perez.0987%40tumbo.demo`;
      expect(leerCodigoDeDni(con)?.correo).toBe('maria.perez.0987@tumbo.demo');
    });

    /**
     * Agregar el correo al final no puede mover nada de lo anterior: el
     * CUIL se busca por su forma y no por ser el último campo.
     */
    it('no le roba el lugar al CUIL', () => {
      const con = `${VIEJA}@maria.perez.0987%40tumbo.demo`;
      expect(leerCodigoDeDni(con)?.cuil).toBe(leerCodigoDeDni(VIEJA)?.cuil);
      expect(leerCodigoDeDni(con)?.dni).toBe('43210987');
    });
  });

  it('tolera espacios de más alrededor de los campos', () => {
    const conEspacios = ' 0011 @ PEREZ @ MARIA @ F @ 43210987 @ A ';
    expect(leerCodigoDeDni(conEspacios)?.dni).toBe('43210987');
  });
});
