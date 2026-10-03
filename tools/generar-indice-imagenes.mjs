#!/usr/bin/env node
/**
 * Arma el índice de imágenes del README.
 *
 * El enunciado pide que el README tenga «un índice con todas las imágenes
 * del proyecto». Hecho a mano queda viejo apenas alguien agrega un
 * ícono, así que se genera: recorre el repositorio, agrupa por carpeta y
 * reescribe solo el bloque entre las dos marcas del README.
 *
 * Quedan afuera las dependencias y todo lo que se genera al compilar
 * (`node_modules`, `dist`, `www`, `.angular`, `android/app/build`): no
 * son imágenes del proyecto, son copias.
 *
 * USO
 *     npm run readme:imagenes
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname;
const README = join(RAIZ, 'README.md');
const INICIO = '<!-- indice-imagenes:inicio -->';
const FIN = '<!-- indice-imagenes:fin -->';

const EXTENSIONES = /\.(png|jpe?g|webp|svg|gif|ico)$/i;
const AFUERA = new Set(['node_modules', '.git', 'dist', 'www', '.angular', 'coverage']);
const AFUERA_RUTAS = ['android/app/build', 'android/build', 'ios/App/build'];

/** Grupos en el orden en que se muestran. El primero que coincide gana. */
const GRUPOS = [
  { titulo: 'Códigos QR', coincide: (r) => /^docs\/imagenes\/qr-/.test(r) },
  { titulo: 'Capturas de pantalla', coincide: (r) => r.startsWith('docs/imagenes/pantallas/') },
  { titulo: 'Marca y documentación', coincide: (r) => r.startsWith('docs/imagenes/') },
  { titulo: 'DNI de prueba', coincide: (r) => r.startsWith('docs/qr-dni-de-prueba/') },
  { titulo: 'Imágenes de la aplicación', coincide: (r) => r.startsWith('public/imagenes/') },
  { titulo: 'Juego «Recolección tumbito»', coincide: (r) => r.startsWith('public/assets/juego-') },
  { titulo: 'Ilustraciones de Tumbito', coincide: (r) => r.startsWith('public/assets/') },
  { titulo: 'Íconos web', coincide: (r) => r.startsWith('public/') },
  { titulo: 'Recursos de Android', coincide: (r) => r.startsWith('android/') },
  { titulo: 'Otras', coincide: () => true },
];

async function recorrer(carpeta) {
  const encontradas = [];
  for (const entrada of await readdir(carpeta, { withFileTypes: true })) {
    const ruta = join(carpeta, entrada.name);
    const relativa = relative(RAIZ, ruta);
    if (entrada.isDirectory()) {
      if (AFUERA.has(entrada.name) || AFUERA_RUTAS.includes(relativa)) continue;
      encontradas.push(...(await recorrer(ruta)));
    } else if (EXTENSIONES.test(entrada.name)) {
      encontradas.push(relativa);
    }
  }
  return encontradas;
}

/** Los espacios y paréntesis rompen los enlaces de Markdown. */
const enlace = (ruta) =>
  `[${ruta}](${ruta.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29')})`;

const imagenes = (await recorrer(RAIZ)).sort((a, b) => a.localeCompare(b, 'es'));
const porGrupo = new Map(GRUPOS.map((g) => [g.titulo, []]));
for (const ruta of imagenes) porGrupo.get(GRUPOS.find((g) => g.coincide(ruta)).titulo).push(ruta);

const bloques = [...porGrupo]
  .filter(([, rutas]) => rutas.length)
  .map(
    ([titulo, rutas]) =>
      `<details>\n<summary>${titulo} (${rutas.length})</summary>\n\n${rutas.map((r) => `- ${enlace(r)}`).join('\n')}\n\n</details>`,
  );

const indice = `${INICIO}\n\n${imagenes.length} imágenes. Generado con \`npm run readme:imagenes\`.\n\n${bloques.join('\n\n')}\n\n${FIN}`;

const readme = await readFile(README, 'utf8');
const desde = readme.indexOf(INICIO);
const hasta = readme.indexOf(FIN);
if (desde === -1 || hasta === -1) {
  console.error(`El README no tiene las marcas ${INICIO} y ${FIN}.`);
  process.exit(1);
}
await writeFile(README, readme.slice(0, desde) + indice + readme.slice(hasta + FIN.length));
console.log(`Índice actualizado: ${imagenes.length} imágenes en ${bloques.length} grupos.`);
