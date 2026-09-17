#!/usr/bin/env node
/**
 * Genera códigos QR con documentos de prueba, para el alta de empleados.
 *
 * EL PROBLEMA QUE RESUELVE
 * El DNI es único en `public.usuarios`. Cada documento real que se
 * escanea en una demostración se gasta PARA SIEMPRE: la segunda vez que
 * se escanea el mismo, el alta falla por duplicado. Entre los cuatro del
 * grupo hay cuatro documentos, así que después de dos pruebas no queda
 * con qué seguir.
 *
 * QUÉ GENERA
 * Códigos QR cuyo contenido es una carga EN EL FORMATO REAL DEL DNI: los
 * mismos campos separados por arroba que trae el PDF417 del documento,
 * con datos de personas que no existen.
 *
 * POR QUÉ ASÍ Y NO CON UN QR "MÁGICO"
 * La alternativa era un QR con una marca tipo `tumbo://dni-demo` que le
 * dijera a la aplicación "inventá una persona". Eso obliga a meter una
 * rama de demostración adentro del código de producción, y deja sin
 * probar justo el camino que importa. Acá la aplicación NO SABE que el
 * documento es inventado: lee, parsea, deriva el CUIL y valida igual que
 * con un documento real. El código de la aplicación no tiene una sola
 * línea dedicada a esto.
 *
 * LOS NÚMEROS DE DNI
 * Salen del rango 95.000.000 en adelante, que no está asignado a
 * personas nacidas en el país. Un número inventado dentro del rango
 * normal podría ser el de alguien de verdad; este no.
 *
 * USO
 *     node tools/generar-qr-dni.mjs                  # 12 documentos
 *     node tools/generar-qr-dni.mjs --cantidad 30
 *     node tools/generar-qr-dni.mjs --semilla 7      # otra tanda, repetible
 *
 * Deja una hoja para imprimir en docs/qr-dni-de-prueba/hoja.html y un
 * PNG por documento al lado.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, 'docs', 'qr-dni-de-prueba');

/** Rango no asignado a nacidos en el país: nadie tiene estos números. */
const DNI_MINIMO = 95_000_000;
const DNI_MAXIMO = 99_999_999;

const NOMBRES_DE_MUJER = [
  'Abril', 'Bianca', 'Catalina', 'Emilia', 'Guadalupe', 'Ivana', 'Jazmin',
  'Ludmila', 'Milagros', 'Nadia', 'Priscila', 'Rocio', 'Selena', 'Tamara',
];
const NOMBRES_DE_VARON = [
  'Adrian', 'Bruno', 'Ciro', 'Dante', 'Ezequiel', 'Franco', 'Gaston',
  'Hernan', 'Ivo', 'Joaquin', 'Lisandro', 'Nicanor', 'Ramiro', 'Thiago',
];
const APELLIDOS = [
  'Acuña', 'Bordon', 'Cardozo', 'Duarte', 'Escalante', 'Ferreyra', 'Gauna',
  'Ibarra', 'Juarez', 'Leguizamon', 'Maidana', 'Ojeda', 'Peralta', 'Quiroga',
  'Rolon', 'Sandoval', 'Tolosa', 'Villalba', 'Zalazar',
];

/** Los pesos del módulo 11 del CUIL. Los mismos que `core/validacion/cuil.ts`. */
const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/**
 * Un generador de números repetible.
 *
 * Con `Math.random()` cada corrida daría personas distintas, y la hoja
 * impresa dejaría de coincidir con lo que uno espera. Con una semilla,
 * la misma semilla siempre da la misma tanda: se puede reimprimir una
 * hoja perdida sin que cambien los documentos.
 */
function generadorConSemilla(semilla) {
  let estado = semilla >>> 0 || 1;
  return () => {
    estado ^= estado << 13;
    estado ^= estado >>> 17;
    estado ^= estado << 5;
    // Se divide por 2^32 y no por un millón: con menos resolución los
    // DNI caían siempre en múltiplos de 5 y la tanda se veía armada.
    return (estado >>> 0) / 4_294_967_296;
  };
}

function digitoDe(diezDigitos) {
  const suma = PESOS.reduce((total, peso, i) => total + peso * Number(diezDigitos[i]), 0);
  const resto = suma % 11;
  if (resto === 0) return 0;
  if (resto === 1) return null;
  return 11 - resto;
}

/** El prefijo y el dígito del CUIL, como los guarda el documento: `274`. */
function cuilDelDocumento(dni, sexo) {
  const numero = String(dni).padStart(8, '0');
  const prefijo = sexo === 'F' ? '27' : '20';
  const digito = digitoDe(prefijo + numero);

  if (digito !== null) return `${prefijo}${digito}`;

  // El caso raro del módulo 11: el prefijo pasa a 23 para los dos sexos.
  return `23${digitoDe('23' + numero)}`;
}

function dosDigitos(n) {
  return String(n).padStart(2, '0');
}

/** Un nombre de archivo sin tildes ni eñes, que viaja bien entre sistemas. */
function paraArchivo(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

/**
 * Un documento inventado, en el formato real.
 *
 * Alterna entre las dos variantes que existen en la calle —la vieja
 * arranca con el trámite, la nueva mete un campo más— para que la hoja
 * impresa pruebe las dos.
 */
export function inventarDocumento(azar, indice = 0) {
  const elegir = (lista) => lista[Math.floor(azar() * lista.length)];

  const sexo = azar() < 0.5 ? 'F' : 'M';
  const nombres = elegir(sexo === 'F' ? NOMBRES_DE_MUJER : NOMBRES_DE_VARON);
  const apellidos = elegir(APELLIDOS);
  const dni = String(DNI_MINIMO + Math.floor(azar() * (DNI_MAXIMO - DNI_MINIMO)));

  const nacimiento = `${dosDigitos(1 + Math.floor(azar() * 28))}/${dosDigitos(1 + Math.floor(azar() * 12))}/${1970 + Math.floor(azar() * 35)}`;
  const emision = `${dosDigitos(1 + Math.floor(azar() * 28))}/${dosDigitos(1 + Math.floor(azar() * 12))}/20${dosDigitos(15 + Math.floor(azar() * 10))}`;
  const tramite = String(Math.floor(azar() * 90_000_000_000)).padStart(11, '0');

  // El correo va AL FINAL y es un agregado nuestro: el DNI real no trae
  // ninguno. Se pone para que en la demostración no haya que tipear una
  // dirección entera en el teléfono.
  //
  // LA ARROBA VA ESCAPADA COMO %40, y no es un capricho: la arroba es EL
  // SEPARADOR de este formato. Escrita tal cual, `ana.perez@tumbo.demo`
  // se parte en dos campos —`ana.perez` y `tumbo.demo`— y no queda
  // ningún correo que leer. El parser la desescapa.
  const correo = `${paraArchivo(nombres)}.${paraArchivo(apellidos)}.${dni.slice(-4)}@tumbo.demo`;
  const correoEnElCodigo = correo.replace('@', '%40');

  const comunes = [
    apellidos.toUpperCase(),
    nombres.toUpperCase(),
    sexo,
    dni,
    'A',
    nacimiento,
    emision,
    cuilDelDocumento(dni, sexo),
    correoEnElCodigo,
  ];

  const nueva = indice % 2 === 1;
  const campos = nueva ? [tramite, 'A', ...comunes] : [tramite, ...comunes];

  return {
    carga: campos.join('@'),
    variante: nueva ? 'nueva' : 'vieja',
    nombres,
    apellidos,
    dni,
    sexo,
    correo,
  };
}

/**
 * Una tanda entera, sin DNI ni nombre repetido.
 *
 * Los DNI no se pueden repetir porque la base los rechaza. Los nombres
 * tampoco, aunque la base los aceptaría: dos «Juarez, Milagros» en la
 * misma hoja impresa obligan a mirar el número chiquito para saber cuál
 * es cuál, justo en el momento en que uno está mostrando la aplicación.
 */
export function inventarTanda(cantidad, semilla) {
  const azar = generadorConSemilla(semilla);
  const documentos = [];
  const dniUsados = new Set();
  const nombresUsados = new Set();

  while (documentos.length < cantidad) {
    const documento = inventarDocumento(azar, documentos.length);
    const nombre = `${documento.apellidos} ${documento.nombres}`;

    if (dniUsados.has(documento.dni) || nombresUsados.has(nombre)) continue;

    dniUsados.add(documento.dni);
    nombresUsados.add(nombre);
    documentos.push(documento);
  }

  return documentos;
}

function hoja(documentos, semilla) {
  const tarjetas = documentos
    .map(
      (d, i) => `      <article class="doc">
        <img src="${dosDigitos(i + 1)}-${paraArchivo(d.apellidos)}.png" alt="QR del documento de ${d.nombres} ${d.apellidos}" />
        <p class="nombre">${d.apellidos}, ${d.nombres}</p>
        <p class="dato">DNI ${d.dni} · ${d.sexo} · variante ${d.variante}</p>
        <p class="correo">${d.correo}</p>
      </article>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Documentos de prueba · Tumbito</title>
<style>
  body { margin: 0; padding: 24px; background: #fbf1d5; color: #003592;
         font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .aviso { max-width: 60ch; font-size: 13px; line-height: 1.5; margin: 0 0 20px; }
  .grilla { display: grid; gap: 16px;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
  .doc { background: #f8fbfd; border: 1px solid #bac5d3; border-radius: 12px;
         padding: 12px; text-align: center; break-inside: avoid; }
  .doc img { width: 100%; max-width: 150px; height: auto; }
  .nombre { margin: 6px 0 2px; font-weight: 600; font-size: 14px; }
  .dato { margin: 0; font-size: 11px; opacity: .75; }
  /* El correo es largo y no puede salirse de la tarjeta ni quedar cortado. */
  .correo { margin: 4px 0 0; font-size: 10px; opacity: .7;
            overflow-wrap: anywhere; line-height: 1.3; }
  @media print { body { background: #fff; } .aviso { display: none; } }
</style>
</head>
<body>
  <h1>Documentos de prueba · Tumbito</h1>
  <p class="aviso">
    Cada código trae adentro los datos de una persona inventada, con el mismo
    formato que el código real del DNI argentino, más un correo al final que
    el documento no tiene y que se agrega para no tener que tipearlo. La aplicación no distingue
    estos de un documento de verdad: los lee por el mismo camino. Los números
    salen del rango 95.000.000 en adelante, que no está asignado, así que no
    son el DNI de nadie. Tanda generada con la semilla <strong>${semilla}</strong>:
    volver a correr el script con esa semilla reimprime exactamente esta hoja.
  </p>
  <div class="grilla">
${tarjetas}
  </div>
</body>
</html>
`;
}

function leerArgumento(nombre, porDefecto) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? porDefecto : Number(process.argv[i + 1]);
}

async function principal() {
  const cantidad = leerArgumento('cantidad', 12);
  const semilla = leerArgumento('semilla', 2026);
  const documentos = inventarTanda(cantidad, semilla);

  await mkdir(SALIDA, { recursive: true });

  for (const [i, documento] of documentos.entries()) {
    const archivo = `${dosDigitos(i + 1)}-${paraArchivo(documento.apellidos)}.png`;
    await QRCode.toFile(join(SALIDA, archivo), documento.carga, {
      width: 400,
      margin: 2,
      // Corrección de errores alta: un papel doblado o una pantalla con
      // reflejo siguen siendo legibles.
      errorCorrectionLevel: 'H',
      color: { dark: '#003592ff', light: '#ffffffff' },
    });
    console.log(`  ${archivo}  ${documento.apellidos}, ${documento.nombres} · DNI ${documento.dni}`);
  }

  await writeFile(join(SALIDA, 'hoja.html'), hoja(documentos, semilla), 'utf8');
  console.log(`\n${documentos.length} documentos en docs/qr-dni-de-prueba/`);
  console.log('Abrí hoja.html para imprimirla o mostrarla en pantalla.');
}

// Solo corre cuando se lo invoca directo: las pruebas importan las
// funciones de arriba sin que se genere ningún archivo.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  principal().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
