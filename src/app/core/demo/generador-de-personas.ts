import { SexoDeCuil, cuilDeDni } from '../validacion/cuil';

/**
 * Datos de una persona inventada, para probar las altas.
 *
 * PARA QUÉ
 * Los botones "Simular lector de DNI" tenían una persona escrita a
 * mano: siempre Valentina Molina, siempre el mismo DNI. Eso alcanzaba
 * para ver el formulario relleno, pero no para probar el alta: el
 * segundo intento chocaba contra el DNI único y había que inventar
 * números a mano.
 *
 * Y el CUIL que traía —27-43210987-6— era falso. El dígito que le
 * correspondía era el 4. Nadie lo iba a notar porque nada lo comprobaba.
 *
 * Acá cada llamada devuelve una persona nueva con un CUIL que cierra de
 * verdad, calculado con el algoritmo de `validacion/cuil.ts`.
 *
 * SOBRE EL SEXO
 * No es un dato que TUMBO guarde ni pida. Está solo porque el prefijo
 * del CUIL depende de él, igual que en la vida real.
 */
export interface PersonaInventada {
  readonly nombres: string;
  readonly apellidos: string;
  readonly dni: string;
  readonly cuil: string;
  readonly correo: string;
}

const NOMBRES_DE_MUJER = [
  'Ana', 'Camila', 'Carla', 'Delfina', 'Elena', 'Florencia', 'Gabriela',
  'Inés', 'Julieta', 'Lucía', 'Malena', 'Mariana', 'Paula', 'Renata',
  'Rocío', 'Sofía', 'Valeria', 'Victoria',
];

const NOMBRES_DE_VARON = [
  'Agustín', 'Bruno', 'Diego', 'Emilio', 'Facundo', 'Gonzalo', 'Ignacio',
  'Joaquín', 'Julián', 'Lautaro', 'Lucas', 'Martín', 'Nicolás', 'Pablo',
  'Ramiro', 'Santiago', 'Tomás', 'Valentín',
];

const APELLIDOS = [
  'Acosta', 'Aguirre', 'Álvarez', 'Benítez', 'Cabrera', 'Domínguez',
  'Figueroa', 'Gómez', 'Herrera', 'Ibarra', 'Juárez', 'Ledesma',
  'Medina', 'Navarro', 'Ojeda', 'Peralta', 'Quiroga', 'Ramos',
  'Sosa', 'Torres', 'Vega', 'Villalba',
];

/** El DNI queda siempre de 8 dígitos, que es lo que se ve hoy en día. */
const DNI_MINIMO = 10_000_000;
const DNI_MAXIMO = 45_000_000;

function alAzar<T>(lista: readonly T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * Saca los acentos y la ñ para armar un correo.
 * 'Inés Ñandú' → 'ines.nandu'
 */
function paraCorreo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '-');
}

/**
 * Una persona nueva, distinta en cada llamada.
 *
 * El correo lleva los últimos cuatro dígitos del DNI para que dos
 * personas con el mismo nombre no choquen contra la unicidad de
 * `usuarios.correo`. El dominio es `tumbo.demo`, que no existe: nadie
 * va a recibir un correo por accidente.
 */
export function inventarPersona(): PersonaInventada {
  const sexo: SexoDeCuil = Math.random() < 0.5 ? 'F' : 'M';
  const nombres = alAzar(sexo === 'F' ? NOMBRES_DE_MUJER : NOMBRES_DE_VARON);
  const apellidos = alAzar(APELLIDOS);

  const dni = String(DNI_MINIMO + Math.floor(Math.random() * (DNI_MAXIMO - DNI_MINIMO)));
  // `cuilDeDni` solo devuelve null si el DNI no tiene 8 dígitos, y acá
  // siempre los tiene. El `?? ''` es para que TypeScript quede tranquilo.
  const cuil = cuilDeDni(dni, sexo) ?? '';

  return {
    nombres,
    apellidos,
    dni,
    cuil,
    correo: `${paraCorreo(nombres)}.${paraCorreo(apellidos)}.${dni.slice(-4)}@tumbo.demo`,
  };
}
