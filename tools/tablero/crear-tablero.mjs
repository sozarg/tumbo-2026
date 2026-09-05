#!/usr/bin/env node
/**
 * Crea el tablero del TFI en GitHub a partir de `tarjetas.json`.
 *
 * QUÉ HACE
 *   1. Crea las etiquetas que usan las tarjetas.
 *   2. Crea un issue por tarjeta (título y cuerpo del JSON).
 *   3. Crea el proyecto (GitHub Projects) si no existe.
 *   4. Mete cada issue en el proyecto.
 *   5. Le pone a cada uno su estado: Por hacer / En curso / Hecho.
 *
 * POR QUÉ EN NODE Y NO EN UN .BAT
 * Los cuerpos de las tarjetas tienen acentos, comillas, tildes y saltos
 * de línea. El CMD de Windows los rompe. Acá cada cuerpo se escribe a un
 * archivo temporal en UTF-8 y se pasa con `--body-file`, así que llega
 * intacto. Además los argumentos van en un arreglo, sin pasar por el
 * intérprete de comandos, que es la otra fuente de sustos.
 *
 * ANTES DE CORRERLO
 *   1. Limpiá el proxy del banco en esta consola:
 *        set http_proxy=
 *        set https_proxy=
 *        set HTTP_PROXY=
 *        set HTTPS_PROXY=
 *   2. Instalá GitHub CLI si no lo tenés:  https://cli.github.com
 *   3. gh auth login
 *   4. gh auth refresh -s project,read:project
 *      (los permisos de Projects NO vienen con el login normal)
 *
 * USO
 *   node crear-tablero.mjs                 → muestra el plan y pregunta
 *   node crear-tablero.mjs --si            → sin preguntar
 *   node crear-tablero.mjs --solo-plan     → solo muestra, no toca nada
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createInterface } from 'node:readline/promises';
import path from 'node:path';

const REPO = 'sozarg/tumbo-2026';

const SIN_PREGUNTAR = process.argv.includes('--si');
const SOLO_PLAN = process.argv.includes('--solo-plan');

/**
 * De quién es el TABLERO. No tiene por qué ser el dueño del repositorio.
 *
 * `sozarg` es la cuenta que creó el repositorio; los demás somos
 * colaboradores. Podemos crear issues ahí, pero un Project de una cuenta
 * ajena solo lo puede crear su dueño: GitHub responde «does not have
 * permission to create projects on ownerId U_...».
 *
 * Así que por defecto el tablero se crea bajo la cuenta con la que
 * estás logueado, y después se comparte con el resto. Si el dueño del
 * repositorio prefiere tenerlo él, que lo corra él, o pasale:
 *
 *     node crear-tablero.mjs --duenio sozarg
 */
function argumento(nombre) {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : null;
}

/**
 * Nombres que puede tener cada columna. GitHub crea los proyectos con
 * las opciones en inglés (Todo / In Progress / Done), pero si alguien
 * las renombró en español esto las encuentra igual.
 */
const SINONIMOS = {
  'Por hacer': ['por hacer', 'todo', 'backlog', 'pendiente'],
  'En curso': ['en curso', 'in progress', 'doing'],
  Hecho: ['hecho', 'done', 'terminado'],
};

/** Color de cada etiqueta, para que el tablero se lea de un vistazo. */
const COLORES = {
  'punto-funcional': '0e8a16',
  habilitador: 'b60205',
  bloqueante: 'd93f0b',
  excluyente: '5319e7',
  'deuda-tecnica': 'fbca04',
  alta: '1d76db',
  qr: '006b75',
  push: '0052cc',
  correo: 'bfd4f2',
  juegos: 'c2e0c6',
  encuestas: 'c5def5',
  graficos: 'c5def5',
  pedido: 'd4c5f9',
  sectores: 'f9d0c4',
  cuenta: 'e99695',
  chat: 'bfdadc',
  'dispositivo-1': 'ededed',
  'dispositivo-2': 'ededed',
  'dispositivo-3': 'ededed',
  'dispositivo-4': 'ededed',
};

/**
 * Dónde está `gh`. Se resuelve una sola vez, en la primera llamada.
 *
 * OJO CON `shell: true`
 * La tentación en Windows es pasar `shell: true` para que encuentre el
 * ejecutable. NO SE PUEDE: con `shell` activado Node pega todos los
 * argumentos en una sola línea de comando **sin comillas**, y cualquier
 * título con espacios se parte en pedazos. Nos pasó: `Punto 1 · Agregar
 * un empleado` llegó como cinco argumentos sueltos.
 *
 * Sin `shell`, cada argumento viaja entero, que es lo que necesitamos.
 * A cambio hay que encontrar el ejecutable a mano, que es esto.
 */
let rutaGh = null;

function resolverGh() {
  if (rutaGh) return rutaGh;

  const candidatos =
    process.platform === 'win32'
      ? ['gh.exe', 'C:\\Program Files\\GitHub CLI\\gh.exe', 'C:\\Program Files (x86)\\GitHub CLI\\gh.exe']
      : ['gh'];

  for (const c of candidatos) {
    const r = spawnSync(c, ['--version'], { encoding: 'utf8' });
    if (!r.error) return (rutaGh = c);
  }

  console.error(
    '\n[X] No encontré `gh`.\n' +
      '    Instalalo con:  winget install --id GitHub.cli -e\n' +
      '    y después CERRÁ Y ABRÍ la consola (el PATH no se actualiza solo).\n',
  );
  process.exit(1);
}

function gh(args, { permitirFallo = false } = {}) {
  const r = spawnSync(resolverGh(), args, { encoding: 'utf8' });

  if (r.error?.code === 'ENOENT') {
    console.error('\n[X] No encontré `gh`. Instalá GitHub CLI: https://cli.github.com\n');
    process.exit(1);
  }
  if (r.status !== 0 && !permitirFallo) {
    console.error(`\n[X] Falló: gh ${args.join(' ')}\n${r.stderr || r.stdout}`);
    process.exit(1);
  }
  return { ok: r.status === 0, salida: (r.stdout || '').trim(), error: (r.stderr || '').trim() };
}

/** Escribe el cuerpo en un archivo UTF-8 y devuelve la ruta. */
function archivoTemporal(carpeta, nombre, contenido) {
  const ruta = path.join(carpeta, nombre);
  writeFileSync(ruta, contenido, 'utf8');
  return ruta;
}

const datos = JSON.parse(await readFile(new URL('./tarjetas.json', import.meta.url), 'utf8'));
const tarjetas = datos.tarjetas;

// ── El plan, antes de tocar nada ────────────────────────────────────
const porEstado = {};
for (const t of tarjetas) (porEstado[t.estado] ??= []).push(t.id);

console.log(`\nRepositorio: ${REPO}`);
console.log(`Proyecto:    ${datos.proyecto}\n`);
console.log(`Se van a crear ${tarjetas.length} issues:\n`);
for (const [estado, ids] of Object.entries(porEstado)) {
  console.log(`  ${estado.padEnd(10)} ${ids.length.toString().padStart(2)}  ${ids.join(' ')}`);
}
const etiquetas = [...new Set(tarjetas.flatMap((t) => t.etiquetas))].sort();
console.log(`\nEtiquetas: ${etiquetas.join(', ')}\n`);

if (SOLO_PLAN) {
  console.log('(--solo-plan: no se tocó nada)\n');
  process.exit(0);
}

if (!SIN_PREGUNTAR) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const r = (await rl.question('Esto CREA cosas en el repositorio. ¿Sigo? (si/no) ')).trim().toLowerCase();
  rl.close();
  if (r !== 'si' && r !== 'sí' && r !== 's') {
    console.log('Cancelado. No se tocó nada.\n');
    process.exit(0);
  }
}

// ── Verificar la sesión ─────────────────────────────────────────────
const sesion = gh(['auth', 'status'], { permitirFallo: true });
if (!sesion.ok) {
  console.error('\n[X] No hay sesión de gh. Corré: gh auth login\n');
  process.exit(1);
}

const yo = gh(['api', 'user', '--jq', '.login'], { permitirFallo: true }).salida;
const DUENIO = argumento('--duenio') ?? yo;
if (!DUENIO) {
  console.error('\n[X] No pude averiguar tu usuario. Pasalo a mano: --duenio TU-USUARIO\n');
  process.exit(1);
}
console.log(`\nEl tablero se va a crear bajo: ${DUENIO}${DUENIO === yo ? ' (vos)' : ''}`);

const carpetaTmp = mkdtempSync(path.join(tmpdir(), 'tumbo-tablero-'));

try {
  // ── 1. Etiquetas ──────────────────────────────────────────────────
  console.log('\n── Etiquetas ──');
  for (const nombre of etiquetas) {
    const r = gh(
      ['label', 'create', nombre, '--repo', REPO, '--color', COLORES[nombre] ?? 'ededed', '--force'],
      { permitirFallo: true },
    );
    console.log(`  ${r.ok ? '✓' : '·'} ${nombre}`);
  }

  // ── 2. Issues ─────────────────────────────────────────────────────
  //
  // Antes de crear nada, miramos qué issues ya existen. Si una corrida
  // anterior se cortó por la mitad —nos pasó— volver a correr esto sin
  // mirar dejaría el repositorio con tarjetas duplicadas. Se comparan
  // por título, que es lo único estable entre corridas.
  console.log('\n── Issues ──');

  const existentes = new Map();
  const previos = gh(
    ['issue', 'list', '--repo', REPO, '--state', 'all', '--limit', '300', '--json', 'title,url'],
    { permitirFallo: true },
  );
  if (previos.ok && previos.salida) {
    for (const i of JSON.parse(previos.salida)) existentes.set(i.title, i.url);
  }
  if (existentes.size > 0) {
    console.log(`  (el repositorio ya tiene ${existentes.size} issues; los repetidos se saltean)`);
  }

  const creados = [];
  for (const t of tarjetas) {
    const yaEsta = existentes.get(t.titulo);
    if (yaEsta) {
      creados.push({ ...t, url: yaEsta });
      console.log(`  · ${t.id}  ya existía`);
      continue;
    }
    const cuerpo = `${t.cuerpo}\n\n---\n_Tarjeta ${t.id} · generada desde el enunciado del TFI._`;
    const ruta = archivoTemporal(carpetaTmp, `${t.id}.md`, cuerpo);

    const args = ['issue', 'create', '--repo', REPO, '--title', t.titulo, '--body-file', ruta];
    for (const e of t.etiquetas) args.push('--label', e);

    const r = gh(args);
    const url = r.salida.split('\n').filter(Boolean).pop();
    creados.push({ ...t, url });
    console.log(`  ✓ ${t.id}  ${url}`);
  }

  // ── 3. Proyecto ───────────────────────────────────────────────────
  console.log('\n── Proyecto ──');
  const lista = gh(['project', 'list', '--owner', DUENIO, '--format', 'json'], {
    permitirFallo: true,
  });

  if (!lista.ok) {
    console.error(
      '\n[X] No pude listar los proyectos. Casi seguro faltan permisos.\n' +
        '    Corré esto y volvé a intentar:\n\n' +
        '      gh auth refresh -s project,read:project\n\n' +
        `    Los ${creados.length} issues YA quedaron creados, así que la próxima corrida\n` +
        '    los duplicaría. Si llegaste hasta acá: creá el proyecto a mano en GitHub\n' +
        '    y arrastrá los issues, o borralos y volvé a correr todo.\n',
    );
    process.exit(1);
  }

  let proyecto = (JSON.parse(lista.salida).projects ?? []).find((p) => p.title === datos.proyecto);

  if (!proyecto) {
    const r = gh(
      ['project', 'create', '--owner', DUENIO, '--title', datos.proyecto, '--format', 'json'],
      { permitirFallo: true },
    );
    if (!r.ok) {
      console.error(
        `\n[X] No pude crear el tablero bajo "${DUENIO}".\n${r.error}\n\n` +
          '    Si dice "does not have permission", esa cuenta no es la tuya.\n' +
          `    Probá sin el --duenio (se crea bajo ${yo}), o que lo corra el dueño.\n\n` +
          '    Los issues ya están creados: volver a correr esto NO los duplica.\n',
      );
      process.exit(1);
    }
    proyecto = JSON.parse(r.salida);
    console.log(`  ✓ creado: ${datos.proyecto} (#${proyecto.number})`);
  } else {
    console.log(`  · ya existía: ${datos.proyecto} (#${proyecto.number})`);
  }

  const numero = String(proyecto.number);
  const vista = JSON.parse(
    gh(['project', 'view', numero, '--owner', DUENIO, '--format', 'json']).salida,
  );
  const proyectoId = vista.id;

  // ── 4. Campo de estado ────────────────────────────────────────────
  const campos = JSON.parse(
    gh(['project', 'field-list', numero, '--owner', DUENIO, '--format', 'json']).salida,
  ).fields;

  const campoEstado = campos.find(
    (c) => c.options && ['status', 'estado'].includes((c.name ?? '').toLowerCase()),
  );

  const opcionPara = (estado) => {
    if (!campoEstado) return null;
    const busco = SINONIMOS[estado] ?? [estado.toLowerCase()];
    return campoEstado.options.find((o) => busco.includes(o.name.trim().toLowerCase())) ?? null;
  };

  if (!campoEstado) {
    console.log('\n  ! No encontré un campo "Status". Los issues entran sin estado.');
  }

  // ── 5. Meter los issues y ponerles estado ─────────────────────────
  console.log('\n── Cargando el tablero ──');
  let sinEstado = 0;
  for (const t of creados) {
    const alta = gh(
      ['project', 'item-add', numero, '--owner', DUENIO, '--url', t.url, '--format', 'json'],
      { permitirFallo: true },
    );
    if (!alta.ok) {
      console.log(`  ! ${t.id} no se pudo agregar al tablero: ${alta.error.split('\n')[0]}`);
      continue;
    }
    const item = JSON.parse(alta.salida);

    const opcion = opcionPara(t.estado);
    if (opcion) {
      gh([
        'project', 'item-edit',
        '--id', item.id,
        '--project-id', proyectoId,
        '--field-id', campoEstado.id,
        '--single-select-option-id', opcion.id,
      ]);
      console.log(`  ✓ ${t.id} → ${opcion.name}`);
    } else {
      sinEstado += 1;
      console.log(`  ✓ ${t.id} (sin estado)`);
    }
  }

  console.log(`\nListo. ${creados.length} tarjetas en el tablero.`);
  if (sinEstado > 0) {
    console.log(`${sinEstado} quedaron sin estado: movelas a mano una vez.`);
  }
  console.log(`\n  https://github.com/users/${DUENIO}/projects/${numero}\n`);
  console.log('  Acordate de darle acceso a los otros tres: Settings → Manage access.\n');
} finally {
  rmSync(carpetaTmp, { recursive: true, force: true });
}
