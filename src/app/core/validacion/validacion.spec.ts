import { FormControl, Validators } from '@angular/forms';
import { LIMITES } from './limites';
import { mensajeDeError } from './mensajes';
import {
  conLimite,
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

describe('coherencia con la base de datos', () => {
  /**
   * Espejo de las migraciones 20260901000600 y 20260901000700.
   * Si alguien cambia un número de un lado y se olvida del otro, este
   * test lo detecta antes de que lo detecte la demostración.
   */
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
