import { FormControl, FormGroup, Validators } from '@angular/forms';
import { clavesCoinciden } from './validadores';

describe('Confirmación de contraseña', () => {
  const crear = () =>
    new FormGroup(
      {
        clave: new FormControl('', { nonNullable: true, validators: Validators.required }),
        repetirClave: new FormControl('', { nonNullable: true, validators: Validators.required }),
      },
      { validators: clavesCoinciden },
    );
  it('requiere repetirla y rechaza valores diferentes', () => {
    const form = crear();
    form.controls.clave.setValue('Clave de prueba');
    expect(form.invalid).toBe(true);
    form.controls.repetirClave.setValue('Otra clave');
    expect(form.hasError('clavesDistintas')).toBe(true);
    form.controls.repetirClave.setValue('Clave de prueba');
    expect(form.valid).toBe(true);
    form.controls.clave.setValue('Clave cambiada');
    expect(form.hasError('clavesDistintas')).toBe(true);
  });
  it('no recorta espacios ni cambia mayúsculas', () => {
    const form = crear();
    form.setValue({ clave: 'Clave de prueba', repetirClave: 'Clave de prueba ' });
    expect(form.invalid).toBe(true);
    form.setValue({ clave: 'Clave de prueba', repetirClave: 'clave de prueba' });
    expect(form.invalid).toBe(true);
    form.reset();
    expect(form.getRawValue()).toEqual({ clave: '', repetirClave: '' });
  });
});
