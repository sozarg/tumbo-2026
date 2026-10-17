import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { RegistroClienteService } from './registro-cliente.service';

/**
 * Los mensajes del alta de cliente (punto 5).
 *
 * Auth crea la cuenta y el perfil en la misma transacción, así que
 * cuando el perfil choca —DNI repetido, correo repetido— no devuelve el
 * error de Postgres: contesta «Database error saving new user» y nada
 * más. Eso se mostraba como «revisá los datos y la conexión», que manda
 * a mirar el wifi cuando lo que pasa es que el documento ya está usado;
 * se podía probar con diez correos distintos y fallar siempre.
 */
describe('El alta de cliente nombra el dato repetido', () => {
  const servicio = () => TestBed.inject(RegistroClienteService);

  const traducir = (mensaje: string): string =>
    (servicio() as unknown as { traducir(m: string): string }).traducir(mensaje);

  const datoTomado = (respuesta: string | null, error: unknown = null) =>
    (
      servicio() as unknown as {
        datoTomado(c: SupabaseClient, correo: string, dni: string): Promise<string | undefined>;
      }
    ).datoTomado(
      { rpc: async () => ({ data: respuesta, error }) } as unknown as SupabaseClient,
      'alguien@tumbo.demo',
      '44642309',
    );

  it('el error ciego de Auth deja de mandar a mirar la conexión', () => {
    expect(traducir('Database error saving new user')).toContain('DNI y el correo');
    expect(traducir('unexpected_failure')).toContain('DNI y el correo');
  });

  it('los duplicados que sí se reconocen siguen con su mensaje', () => {
    expect(traducir('duplicate key value violates unique constraint "usuarios_dni_key"')).toBe(
      'Ese DNI ya está registrado.',
    );
    expect(traducir('User already registered')).toBe(
      'Ese correo ya tiene una cuenta. Probá ingresar.',
    );
  });

  it('la consulta previa dice cuál de los dos está tomado', async () => {
    await expect(datoTomado('dni')).resolves.toBe('Ese DNI ya está registrado.');
    await expect(datoTomado('correo')).resolves.toBe(
      'Ese correo ya tiene una cuenta. Probá ingresar.',
    );
    await expect(datoTomado('ok')).resolves.toBeUndefined();
  });

  /**
   * Si la migración todavía no se aplicó, la función no existe y la
   * consulta falla. El alta tiene que seguir funcionando igual: lo
   * único que se pierde es la precisión del mensaje.
   */
  it('si la función no está en la base, el alta sigue', async () => {
    const silencio = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(datoTomado(null, { message: 'function does not exist' })).resolves.toBeUndefined();

    silencio.mockRestore();
  });
});
