export class EntradaInvalida extends Error {}
export function objeto(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor))
    throw new EntradaInvalida('Datos inválidos.');
  return valor as Record<string, unknown>;
}
export function texto(d: Record<string, unknown>, campo: string, min: number, max: number): string {
  const v = d[campo];
  if (typeof v !== 'string' || v.trim().length < min || v.trim().length > max) {
    throw new EntradaInvalida(`${campo}: debe tener entre ${min} y ${max} caracteres.`);
  }
  return v.trim();
}
export function numero(
  d: Record<string, unknown>,
  campo: string,
  min: number,
  max: number,
  entero = true,
): number {
  const n = d[campo];
  if (
    typeof n !== 'number' ||
    !Number.isFinite(n) ||
    n < min ||
    n > max ||
    (entero ? !Number.isInteger(n) : !/^\d+(\.\d{1,2})?$/.test(String(n)))
  ) {
    throw new EntradaInvalida(
      `${campo}: número ${entero ? 'entero ' : ''}válido entre ${min} y ${max}.`,
    );
  }
  return n;
}
export function opcion(
  d: Record<string, unknown>,
  campo: string,
  valores: readonly string[],
): string {
  const v = texto(d, campo, 1, 40);
  if (!valores.includes(v)) throw new EntradaInvalida(`${campo}: opción no admitida.`);
  return v;
}
export function cuilCorrecto(cuil: string, dni: string): boolean {
  if (!/^\d{2}-?\d{8}-?\d$/.test(cuil)) return false;
  const n = cuil.replace(/-/g, '');
  const suma = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2].reduce((s, p, i) => s + p * Number(n[i]), 0);
  return n.slice(2, 10) === dni.padStart(8, '0') && (11 - (suma % 11)) % 11 === Number(n[10]);
}
export function validarEmpleado(valor: unknown) {
  const d = objeto(valor);
  const nombres = texto(d, 'nombres', 2, 50),
    apellidos = texto(d, 'apellidos', 2, 50);
  if (![nombres, apellidos].every((v) => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ '\-]+$/.test(v)))
    throw new EntradaInvalida('Nombres y apellidos: solo letras, espacios, apóstrofos y guiones.');
  const dni = texto(d, 'dni', 7, 14).replace(/[.\s]/g, '');
  const cuil = texto(d, 'cuil', 11, 13);
  if (!/^\d{7,8}$/.test(dni)) throw new EntradaInvalida('DNI: deben ser 7 u 8 dígitos.');
  if (!cuilCorrecto(cuil, dni))
    throw new EntradaInvalida('CUIL: verificá el dígito y su coincidencia con el DNI.');
  const correo = texto(d, 'correo', 5, 80).toLowerCase();
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(correo))
    throw new EntradaInvalida('Correo electrónico inválido.');
  const clave = d.clave;
  if (
    typeof clave !== 'string' ||
    !clave.trim() ||
    clave.length < 6 ||
    clave.length > 72 ||
    new TextEncoder().encode(clave).length > 72
  )
    throw new EntradaInvalida(
      'Contraseña: entre 6 y 72 caracteres y hasta 72 bytes, no solo espacios.',
    );
  const perfil = opcion(d, 'perfil', ['metre', 'mozo', 'cocinero', 'cantinero']);
  return { nombres, apellidos, dni, cuil, correo, clave, perfil };
}
export function validarProducto(valor: unknown) {
  const d = objeto(valor);
  return {
    nombre: texto(d, 'nombre', 2, 60).replace(/\s+/g, ' '),
    descripcion: texto(d, 'descripcion', 10, 300),
    tipo: opcion(d, 'tipo', ['plato', 'postre', 'bebida']),
    minutos: numero(d, 'minutos', 1, 600),
    precio: numero(d, 'precio', 1, 99999999.99, false),
  };
}
export function validarMesa(valor: unknown) {
  const d = objeto(valor);
  return {
    numero: numero(d, 'numero', 1, 999),
    comensales: numero(d, 'comensales', 1, 20),
    tipo: opcion(d, 'tipo', ['estandar', 'vip', 'movilidad_reducida']),
  };
}
export function puedeGestionarProducto(perfil: string, tipo: string): boolean {
  return (
    ['dueno', 'supervisor'].includes(perfil) ||
    (perfil === 'cocinero' && ['plato', 'postre'].includes(tipo)) ||
    (perfil === 'cantinero' && tipo === 'bebida')
  );
}
