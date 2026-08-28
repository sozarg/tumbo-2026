#!/usr/bin/env node
/**
 * Crea las cuentas de demostración en Supabase Auth.
 *
 * ¿Por qué un script y no el seed.sql?
 * Las cuentas viven en el esquema `auth`, que es de Supabase y cambia
 * entre versiones. Insertar filas a mano en auth.users e auth.identities
 * funciona hasta que una actualización agrega una columna y rompe el
 * seed. La API de administración es la manera soportada y no se rompe.
 *
 * El perfil de cada cuenta va en app_metadata, no en user_metadata.
 * Eso es deliberado: user_metadata lo puede escribir cualquiera al
 * registrarse, y si el perfil se leyera de ahí, cualquier persona
 * podría darse de alta como dueño. app_metadata solo lo puede escribir
 * la clave service_role, que es la que usa este script.
 *
 * USO — desde la raíz del proyecto:
 *
 *   # Linux / macOS
 *   SUPABASE_URL="https://tu-proyecto.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="ey..." \
 *   node supabase/crear-usuarios.mjs
 *
 *   # Windows PowerShell
 *   $env:SUPABASE_URL="https://tu-proyecto.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="ey..."
 *   node supabase/crear-usuarios.mjs
 *
 * La clave service_role se saca de Project Settings › API.
 * NUNCA se guarda en un archivo del repositorio ni se pega en el chat:
 * salta todas las políticas de RLS y puede leer y borrar cualquier dato.
 */
import { createClient } from '@supabase/supabase-js';

/**
 * Limpia el valor de una variable de entorno.
 *
 * En CMD de Windows, `set X="abc"` guarda las comillas COMO PARTE del
 * valor, a diferencia de PowerShell. Es un error muy fácil de cometer y
 * el síntoma es un "invalid Bearer token" que no dice nada. Se limpian
 * comillas y espacios en lugar de hacer sufrir a quien lo corre.
 */
function limpiar(valor) {
  if (!valor) {
    return '';
  }
  return valor.trim().replace(/^["']|["']$/g, '').trim();
}

const URL = limpiar(process.env.SUPABASE_URL);
const SERVICE_ROLE = limpiar(process.env.SUPABASE_SERVICE_ROLE_KEY);
const CLAVE = limpiar(process.env.TUMBO_CLAVE_DEMO) || 'Tumbo2026';

if (!URL || !SERVICE_ROLE) {
  console.error(
    'Faltan variables de entorno.\n\n' +
      '  SUPABASE_URL               URL del proyecto\n' +
      '  SUPABASE_SERVICE_ROLE_KEY  clave service_role (Project Settings › API Keys)\n\n' +
      'Opcional:\n' +
      '  TUMBO_CLAVE_DEMO           clave común de las cuentas (por defecto Tumbo2026)\n',
  );
  process.exitCode = 1;
}

/**
 * Averigua qué clave le pasaron, sin mostrarla.
 *
 * Las claves clásicas de Supabase son JWT y llevan el rol adentro del
 * payload, en texto plano codificado en base64. Leerlo permite avisar
 * "esta es la anon, necesitás la service_role" en lugar de dejar que
 * falle con un error críptico del servidor.
 */
function describirClave(clave) {
  if (clave.startsWith('sb_secret_')) {
    return { rol: 'secret', formato: 'nuevo', sirve: true };
  }
  if (clave.startsWith('sb_publishable_')) {
    return { rol: 'publishable', formato: 'nuevo', sirve: false };
  }

  const partes = clave.split('.');
  if (partes.length === 3) {
    try {
      const carga = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
      const rol = typeof carga.role === 'string' ? carga.role : 'desconocido';
      return { rol, formato: 'jwt', sirve: rol === 'service_role' };
    } catch {
      return { rol: 'ilegible', formato: 'jwt roto', sirve: false };
    }
  }

  return { rol: 'desconocido', formato: 'no reconocido', sirve: false };
}

const CLAVE_INFO = describirClave(SERVICE_ROLE);

if (!CLAVE_INFO.sirve) {
  console.error(
    '\nLa clave que pasaste no sirve para este script.\n\n' +
      `  Largo: ${SERVICE_ROLE.length} caracteres\n` +
      `  Formato detectado: ${CLAVE_INFO.formato}\n` +
      `  Rol detectado: ${CLAVE_INFO.rol}\n\n` +
      'Este script necesita la clave con rol "service_role" (o el formato\n' +
      'nuevo "sb_secret_..."), porque crea cuentas y eso requiere permisos\n' +
      'de administración.\n\n' +
      (CLAVE_INFO.rol === 'anon' || CLAVE_INFO.rol === 'publishable'
        ? 'Pasaste la clave PÚBLICA. Esa es la que va en environment.local.ts,\n' +
          'no acá. Volvé al panel y buscá la otra, la que está tapada y hay\n' +
          'que revelar.\n\n'
        : '') +
      'Está en: Project Settings › API Keys › service_role (Reveal).\n\n' +
      'Ojo con CMD de Windows: `set VAR=valor` SIN comillas. Si ponés\n' +
      'comillas quedan guardadas dentro del valor y la clave se invalida.\n',
  );
  process.exitCode = 1;
}

const supabase = createClient(URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Un usuario de cada perfil, como exige la preparación inicial del TFI,
 * más un cliente que queda pendiente para poder demostrar los puntos 6,
 * 7 y 8 (listado de pendientes, rechazo y aprobación) sin tener que
 * registrar a alguien en el momento.
 */
const CUENTAS = [
  {
    correo: 'mateo@tumbo.demo',
    perfil: 'dueno',
    nombres: 'Mateo',
    apellidos: 'Terrile',
    dni: '38111222',
  },
  {
    correo: 'ramiro@tumbo.demo',
    perfil: 'supervisor',
    nombres: 'Ramiro',
    apellidos: 'Bianucci',
    dni: '38222333',
  },
  {
    correo: 'ignacio@tumbo.demo',
    perfil: 'metre',
    nombres: 'Ignacio Agustín',
    apellidos: 'Cruz',
    dni: '38333444',
    cuil: '20-38333444-5',
  },
  {
    correo: 'matias@tumbo.demo',
    perfil: 'mozo',
    nombres: 'Matías Gabriel',
    apellidos: 'Ferrari',
    dni: '38444555',
    cuil: '20-38444555-6',
  },
  {
    correo: 'alicia@tumbo.demo',
    perfil: 'cocinero',
    nombres: 'Alicia',
    apellidos: 'Gómez',
    dni: '38555666',
    cuil: '27-38555666-7',
  },
  {
    correo: 'bruno@tumbo.demo',
    perfil: 'cantinero',
    nombres: 'Bruno',
    apellidos: 'Sosa',
    dni: '38666777',
    cuil: '20-38666777-8',
  },
  {
    correo: 'camila@tumbo.demo',
    perfil: 'cliente_registrado',
    estado: 'aprobado',
    nombres: 'Camila',
    apellidos: 'Pérez',
    dni: '38777888',
  },
  {
    correo: 'pendiente@tumbo.demo',
    perfil: 'cliente_registrado',
    estado: 'pendiente',
    nombres: 'Lucía',
    apellidos: 'Ramírez',
    dni: '38888999',
  },
];

async function cuentasExistentes() {
  const correos = new Map();
  let pagina = 1;

  // listUsers pagina de a 50 por defecto; se recorre hasta el final
  // para que el script se pueda correr varias veces sin duplicar nada.
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) {
      throw new Error(`No se pudo listar las cuentas: ${error.message}`);
    }
    for (const usuario of data.users) {
      if (usuario.email) {
        correos.set(usuario.email.toLowerCase(), usuario.id);
      }
    }
    if (data.users.length < 200) {
      break;
    }
    pagina += 1;
  }

  return correos;
}

/** Estado que le corresponde a cada cuenta según su perfil. */
function estadoDe(cuenta) {
  if (cuenta.estado) {
    return cuenta.estado;
  }
  // Solo el cliente registrado nace pendiente de aprobación (punto 5).
  return cuenta.perfil === 'cliente_registrado' ? 'pendiente' : 'aprobado';
}

/**
 * Fija el perfil y el estado de una cuenta ya creada.
 *
 * POR QUÉ HACE FALTA ESTE PASO:
 * Supabase Auth escribe su propio `app_metadata` al crear la cuenta
 * (con el proveedor de login) y pisa el que se le manda, o lo aplica en
 * un segundo momento posterior al INSERT. En cualquiera de los dos
 * casos, el trigger `manejar_usuario_nuevo` lo lee antes de que el
 * perfil esté ahí y cae al valor por defecto: cliente_registrado /
 * pendiente. Por eso el perfil real se fija acá, explícitamente.
 *
 * Efecto secundario bueno: el trigger no puede otorgar un rol elevado
 * por sí solo bajo ninguna circunstancia. Los perfiles del personal
 * solo se asignan con la clave de administración, desde este script.
 */
async function fijarPerfil(id, cuenta) {
  const estado = estadoDe(cuenta);

  // Se deja también en app_metadata por coherencia: si alguien mira la
  // cuenta desde el panel, ve el mismo perfil que tiene en la tabla.
  const { error: errorAuth } = await supabase.auth.admin.updateUserById(id, {
    app_metadata: { perfil: cuenta.perfil, estado },
  });

  if (errorAuth) {
    throw new Error(`no se pudo actualizar la cuenta: ${errorAuth.message}`);
  }

  // Lo que realmente decide los permisos es la fila de public.usuarios:
  // es de donde la aplicación lee el perfil.
  const { error: errorPerfil } = await supabase
    .from('usuarios')
    .update({ perfil: cuenta.perfil, estado })
    .eq('id', id);

  if (errorPerfil) {
    throw new Error(`no se pudo actualizar el perfil: ${errorPerfil.message}`);
  }

  return estado;
}

async function principal() {
  console.log(`Proyecto: ${URL}`);
  console.log(`Clave de administración: rol "${CLAVE_INFO.rol}" · OK`);
  console.log(`Clave común de las cuentas: ${CLAVE}\n`);

  const existentes = await cuentasExistentes();
  let creadas = 0;
  let reparadas = 0;

  for (const cuenta of CUENTAS) {
    const { correo, perfil, estado, ...datos } = cuenta;
    let id = existentes.get(correo);
    let etiqueta;

    if (id) {
      etiqueta = 'ya existía';
      reparadas += 1;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: correo,
        password: CLAVE,
        // Se marca el correo como confirmado para no depender del envío
        // de mails, que en esta etapa todavía no está configurado.
        email_confirm: true,
        user_metadata: datos,
      });

      if (error || !data.user) {
        console.error(`  x  ERROR     ${correo.padEnd(24)} ${error?.message ?? 'sin id'}`);
        continue;
      }

      id = data.user.id;
      etiqueta = 'creada';
      creadas += 1;
    }

    try {
      const estadoFinal = await fijarPerfil(id, cuenta);
      console.log(
        `  ok  ${etiqueta.padEnd(12)} ${correo.padEnd(24)} ${perfil} (${estadoFinal})`,
      );
    } catch (error) {
      console.error(`  x   ERROR        ${correo.padEnd(24)} ${error.message}`);
    }
  }

  console.log(`\n${creadas} creadas, ${reparadas} ya existían y se les revisó el perfil.`);

  const { data, error } = await supabase.from('accesos_rapidos').select('*');
  if (error) {
    console.error(
      '\nNo se pudo leer la vista accesos_rapidos. ' +
        '¿Aplicaste las migraciones con "npx supabase db push"?',
    );
    process.exitCode = 1;
    return;
  }

  console.log(`La pantalla de ingreso va a mostrar ${data.length} accesos rápidos.`);

  if (data.length !== CUENTAS.length - 1) {
    console.error(
      `\nATENCION: se esperaban ${CUENTAS.length - 1}. ` +
        'Revisá perfil y estado con:\n' +
        '  select correo, perfil, estado from public.usuarios order by creado_en;',
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    'La cuenta pendiente@tumbo.demo queda a propósito sin aprobar, ' +
      'para poder demostrar los puntos 6, 7 y 8.',
  );
}

if (process.exitCode !== 1) {
  principal().catch((error) => {
    console.error(`\nFalló: ${error.message}`);
    if (/bearer token|not allowed|invalid|jwt/i.test(error.message)) {
      console.error(
        '\nEse error casi siempre es la clave equivocada. Revisá que sea la\n' +
          'service_role y que la hayas pegado sin comillas y completa.',
      );
    }
    // process.exitCode en lugar de process.exit(): con exit() Node 24 en
    // Windows puede cortar el proceso a mitad de un handle abierto y tirar
    // "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" encima del
    // mensaje de error, que confunde más de lo que ayuda.
    process.exitCode = 1;
  });
}
