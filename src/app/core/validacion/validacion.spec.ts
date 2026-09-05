import { FormControl, FormGroup, Validators } from '@angular/forms';
import { LIMITES } from './limites';
import { mensajeDeError } from './mensajes';
import {
  conLimite,
  correoValido,
  cuilCoincideConDni,
  cuilValido,
  dniValido,
  sinEspaciosSolos,
  soloLetras,
  soloNumeros,
  validadoresDeNombre,
} from './validadores';

/**
 * Estos casos son los mismos que se probaron contra PostgreSQL al
 * aplicar la migración 20260901000600. Si alguno empieza a fallar
 * significa que el formulario y la base dejaron de estar de acuerdo,
 * que es justo el error que nadie nota hasta la demostración.
 */
describe('validadores de nombre', () => {
  function probar(valor: string): boolean {
    const control = new FormControl(valor, validadoresDeNombre('nombres'));
    return control.valid;
  }

  it('acepta un nombre de 2 letras, que es el mínimo', () => {
    expect(probar('Jo')).toBe(true);
  });

  it('rechaza un nombre de 1 letra', () => {
    expect(probar('J')).toBe(false);
  });

  it('acepta tildes y ñ', () => {
    expect(probar('Iñaki')).toBe(true);
    expect(probar('María José')).toBe(true);
  });

  it('acepta apellidos con apóstrofo y con guión', () => {
    const conApostrofo = new FormControl("D'Angelo", validadoresDeNombre('apellidos'));
    const conGuion = new FormControl('García-López', validadoresDeNombre('apellidos'));
    expect(conApostrofo.valid).toBe(true);
    expect(conGuion.valid).toBe(true);
  });

  it('acepta 50 caracteres y rechaza 51', () => {
    expect(probar('a'.repeat(LIMITES.nombres.max))).toBe(true);
    expect(probar('a'.repeat(LIMITES.nombres.max + 1))).toBe(false);
  });

  it('rechaza números y símbolos', () => {
    expect(probar('Juan3')).toBe(false);
    expect(probar('<script>')).toBe(false);
    expect(probar('juan@mail')).toBe(false);
  });

  it('rechaza un valor que solo tiene espacios', () => {
    expect(probar('    ')).toBe(false);
  });
});

describe('correoValido', () => {
  /**
   * La regla del formulario y la de la base tienen que aceptar y
   * rechazar exactamente lo mismo. `Validators.email` de Angular no
   * sirve para esto: da por bueno 'hola@gmail', que el CHECK
   * formato_correo de PostgreSQL después rechaza. El usuario veía el
   * campo en verde y recibía un error del servidor al enviar.
   *
   * REGEX_BASE es copia literal del CHECK. Cada caso se compara contra
   * las dos reglas, así que si alguien toca una de las dos, falla acá.
   */
  const REGEX_BASE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  const CASOS: readonly [string, boolean][] = [
    ['hola', false],
    ['hola@', false],
    ['@gmail.com', false],
    ['hola@gmail', false],
    ['hola@gmail.', false],
    ['hola@.com', false],
    ['hola @gmail.com', false],
    [' hola@gmail.com ', false],
    ['hola@gmail.com', true],
    ['nombre.apellido@bna.com.ar', true],
    ['a@b.co', true],
  ];

  for (const [valor, esperado] of CASOS) {
    it(`${esperado ? 'acepta' : 'rechaza'} ${JSON.stringify(valor)}`, () => {
      const control = new FormControl(valor, [correoValido]);
      expect(control.valid).toBe(esperado);
      // y la base opina lo mismo
      expect(REGEX_BASE.test(valor)).toBe(esperado);
    });
  }

  it('no opina sobre el campo vacío: de eso se encarga required', () => {
    expect(correoValido(new FormControl(''))).toBeNull();
  });

  it('es más estricto que Validators.email, que acepta hola@gmail', () => {
    expect(new FormControl('hola@gmail', [Validators.email]).valid).toBe(true);
    expect(new FormControl('hola@gmail', [correoValido]).valid).toBe(false);
  });
});

describe('sinEspaciosSolos', () => {
  it('rechaza espacios y deja pasar el vacío para que se queje required', () => {
    expect(sinEspaciosSolos(new FormControl('   '))).toEqual({
      sinEspaciosSolos: true,
    });
    expect(sinEspaciosSolos(new FormControl(''))).toBeNull();
    expect(sinEspaciosSolos(new FormControl('Ana'))).toBeNull();
  });
});

describe('soloLetras y soloNumeros', () => {
  it('no opinan sobre el campo vacío', () => {
    expect(soloLetras(new FormControl(''))).toBeNull();
    expect(soloNumeros(new FormControl(''))).toBeNull();
  });

  it('soloNumeros acepta un DNI y rechaza letras', () => {
    expect(soloNumeros(new FormControl('12345678'))).toBeNull();
    expect(soloNumeros(new FormControl('12.345.678'))).toEqual({
      soloNumeros: true,
    });
  });
});

describe('conLimite', () => {
  it('omite el mínimo cuando el campo permite el vacío', () => {
    const control = new FormControl('', conLimite('comentario'));
    expect(control.valid).toBe(true);
  });

  it('aplica el tope del campo', () => {
    const control = new FormControl('a'.repeat(LIMITES.mensaje.max + 1), conLimite('mensaje'));
    expect(control.hasError('maxlength')).toBe(true);
  });
});

describe('mensajeDeError', () => {
  it('usa el artículo correcto según el campo', () => {
    const clave = new FormControl('', [Validators.required]);
    const correo = new FormControl('', [Validators.required]);
    clave.markAsTouched();
    correo.markAsTouched();
    expect(mensajeDeError(clave, 'clave')).toBe('Completá la clave.');
    expect(mensajeDeError(correo, 'correo')).toBe('Completá el correo.');
  });

  it('dice cuántos caracteres sobran cuando se pasa del tope', () => {
    const control = new FormControl('a'.repeat(60), [Validators.maxLength(50)]);
    expect(mensajeDeError(control, 'nombre')).toBe(
      'El nombre no puede superar los 50 caracteres (llevás 60).',
    );
  });

  it('explica el mínimo', () => {
    const control = new FormControl('abc', [Validators.minLength(6)]);
    expect(mensajeDeError(control, 'clave')).toBe(
      'La clave tiene que tener al menos 6 caracteres.',
    );
  });

  it('traduce el formato de nombre', () => {
    const control = new FormControl('Juan3', [soloLetras]);
    expect(mensajeDeError(control, 'nombre')).toBe('El nombre solo puede tener letras y espacios.');
  });

  it('devuelve vacío cuando el control está bien', () => {
    const control = new FormControl('Ana', [Validators.required]);
    expect(mensajeDeError(control, 'nombre')).toBe('');
  });

  it('da un mensaje entendible ante un error desconocido', () => {
    const control = new FormControl('x');
    control.setErrors({ algoNuevo: true });
    expect(mensajeDeError(control, 'nombre')).toBe('Revisá el nombre.');
  });
});

describe('dniValido', () => {
  const probar = (valor: string) => dniValido(new FormControl(valor)) === null;

  it('acepta 7 y 8 dígitos, con puntos o sin ellos', () => {
    expect(probar('43210987')).toBe(true);
    expect(probar('43.210.987')).toBe(true);
    expect(probar('43 210 987')).toBe(true);
    expect(probar('4321098')).toBe(true);
  });

  it('rechaza los largos que la base no acepta', () => {
    expect(probar('123456')).toBe(false);
    expect(probar('123456789')).toBe(false);
  });

  /**
   * El caso que importa. `4321O987` tiene la letra O donde va un cero:
   * un error de tipeo muy común. Una versión anterior del normalizador
   * borraba todo lo que no fuera un dígito, así que esto se convertía
   * en `4321987` —siete dígitos, un DNI válido de OTRA persona— y se
   * guardaba sin decir nada.
   */
  it('rechaza una letra en lugar de un cero, en vez de borrarla', () => {
    expect(probar('4321O987')).toBe(false);
    expect(probar('abcdefgh')).toBe(false);
  });

  it('deja pasar el vacío, que es trabajo de required', () => {
    expect(probar('')).toBe(true);
  });
});

describe('cuilValido', () => {
  const probar = (valor: string) => cuilValido(new FormControl(valor)) === null;

  it('acepta con guiones y sin guiones', () => {
    expect(probar('27-43210987-6')).toBe(true);
    expect(probar('27432109876')).toBe(true);
  });

  it('rechaza letras y largos que no cierran', () => {
    expect(probar('27-4321O987-6')).toBe(false);
    expect(probar('abc')).toBe(false);
    expect(probar('27-432-6')).toBe(false);
  });
});

describe('cuilCoincideConDni', () => {
  /** Un grupo de verdad: el validador necesita ver los dos campos. */
  function grupoCon(dni: string, cuil: string) {
    const grupo = new FormGroup(
      { dni: new FormControl(dni), cuil: new FormControl(cuil) },
      { validators: cuilCoincideConDni() },
    );
    grupo.updateValueAndValidity();
    return grupo;
  }

  const marcado = (dni: string, cuil: string) =>
    grupoCon(dni, cuil).get('cuil')?.hasError('cuilCoincide') ?? false;

  it('acepta el CUIL que contiene ese DNI', () => {
    expect(marcado('43210987', '27-43210987-6')).toBe(false);
    expect(marcado('43210987', '27432109876')).toBe(false);
    expect(marcado('43.210.987', '27-43210987-6')).toBe(false);
  });

  it('marca el CUIL cuando adentro hay otro DNI', () => {
    expect(marcado('43210987', '27-99999999-6')).toBe(true);
    expect(marcado('43210987', '27-43210986-6')).toBe(true);
  });

  /** Un DNI de 7 dígitos viaja dentro del CUIL con un cero adelante. */
  it('entiende el cero de relleno de los DNI de 7 dígitos', () => {
    expect(marcado('4321098', '20-04321098-7')).toBe(false);
  });

  it('no opina mientras la persona todavía está escribiendo', () => {
    expect(marcado('432', '27-43210987-6')).toBe(false);
    expect(marcado('43210987', '27')).toBe(false);
  });

  /**
   * El validador cuelga su error en el control del CUIL. Si lo hiciera
   * a lo bruto con `setErrors`, borraría los errores que ese control ya
   * tenía y el formulario diría que un CUIL inválido está bien.
   */
  it('no pisa los errores que el CUIL ya tenía', () => {
    const grupo = new FormGroup(
      {
        dni: new FormControl('43210987'),
        cuil: new FormControl('abc', [cuilValido]),
      },
      { validators: cuilCoincideConDni() },
    );
    grupo.updateValueAndValidity();

    expect(grupo.get('cuil')?.hasError('cuilValido')).toBe(true);
  });
});

describe('prioridad de los mensajes del CUIL', () => {
  /**
   * Cambiar un dígito del MEDIO del CUIL rompe las dos validaciones a
   * la vez: deja de coincidir con el DNI y el verificador tampoco
   * cierra. Cuál de los dos mensajes se muestra no es un detalle —uno
   * manda a la persona a corregir el campo equivocado—.
   */
  it('cuando fallan las dos, habla de la coincidencia y no del dígito', () => {
    const control = new FormControl('27-43210988-4');
    control.setErrors({ cuilCoincide: true, cuilDigito: true });

    expect(mensajeDeError(control, 'CUIL')).toContain('no contiene el DNI');
  });

  it('cuando solo falla el verificador, lo dice', () => {
    const control = new FormControl('27-43210987-9');
    control.setErrors({ cuilDigito: true });

    expect(mensajeDeError(control, 'CUIL')).toContain('no existe');
  });
});

describe('coherencia con la base de datos', () => {
  /**
   * Espejo de las migraciones 20260901000600 y 20260901000700.
   * Si alguien cambia un número de un lado y se olvida del otro, este
   * test lo detecta antes de que lo detecte la demostración.
   */
  /**
   * Estos dos regex están copiados TAL CUAL de los CHECK de
   * `20260901000100_tablas_base.sql`. Si alguien afloja el validador
   * del formulario, el usuario pasa y la base lo rechaza igual: un
   * error del servidor en vez de uno en rojo abajo del campo. Este
   * test compara los dos lados con los mismos casos.
   */
  it('el validador de DNI acepta exactamente lo que acepta el CHECK', () => {
    const CHECK_DNI = /^[0-9]{7,8}$/;
    const casos = ['43210987', '4321098', '123456', '123456789', '4321O987', 'abcdefgh'];

    for (const caso of casos) {
      const laBase = CHECK_DNI.test(caso.replace(/[.\s]/g, ''));
      const elFormulario = dniValido(new FormControl(caso)) === null;
      expect(elFormulario).toBe(laBase);
    }
  });

  it('el validador de CUIL acepta exactamente lo que acepta el CHECK', () => {
    const CHECK_CUIL = /^[0-9]{2}-?[0-9]{7,8}-?[0-9]$/;
    const casos = ['27-43210987-6', '27432109876', '20-3877766-1', 'abc', '27-432-6'];

    for (const caso of casos) {
      expect(cuilValido(new FormControl(caso)) === null).toBe(CHECK_CUIL.test(caso));
    }
  });

  it('mantiene los rangos que declara la migración', () => {
    expect(LIMITES.nombres).toEqual({ min: 2, max: 50 });
    expect(LIMITES.apellidos).toEqual({ min: 2, max: 50 });
    expect(LIMITES.correo.max).toBe(80);
    expect(LIMITES.nombreProducto).toEqual({ min: 2, max: 60 });
    expect(LIMITES.descripcionProducto).toEqual({ min: 10, max: 300 });
    expect(LIMITES.motivoRechazo).toEqual({ min: 5, max: 300 });
    expect(LIMITES.mensaje.max).toBe(500);
    expect(LIMITES.preguntaEncuesta).toEqual({ min: 5, max: 200 });
  });
});
