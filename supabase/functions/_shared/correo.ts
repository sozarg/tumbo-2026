/**
 * Los correos que TUMBO manda solo, sin que nadie los escriba.
 *
 * ───────────────────────────────────────────────────────────────────
 * QUÉ PIDE EL ENUNCIADO
 *
 * El punto 5 dice: «Se enviará, automáticamente, un correo electrónico
 * al cliente informando la situación del estado de su registro». Los
 * puntos 7 y 8 lo detallan: «Los mensajes deben tener el logo de la
 * empresa, mensajes personalizados, fuentes distintas, colores y
 * tamaños diferentes a los que vienen por defecto. Todos estos cambios
 * también deben ser respecto al correo de confirmación».
 *
 * Esa última frase es la que suele pasarse por alto: no alcanza con
 * adornar el de rechazo, los DOS tienen que estar trabajados.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ EL HTML ESTÁ ESCRITO ASÍ
 *
 * Un correo no es una página. Gmail y Outlook recortan la hoja de
 * estilos, ignoran `flex` y `grid`, y Outlook de escritorio dibuja con
 * el motor de Word. Por eso todo va en tablas, con los estilos puestos
 * en cada etiqueta y anchos en píxeles. Es feo de leer y es la única
 * forma de que se vea igual en todos lados.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ ESTAS TIPOGRAFÍAS Y NO LAS DE LA MARCA
 *
 * Las fuentes web casi no cargan en los clientes de correo: Gmail las
 * descarta y Outlook también. Poner la del proyecto sería adornar un
 * archivo que nadie va a ver así. Se usan dos familias que están
 * instaladas en cualquier equipo y que se distinguen de verdad entre
 * sí y del Arial por defecto: una serif para los títulos y una sans
 * para el texto. El requisito de «fuentes distintas» se cumple con algo
 * que realmente se ve distinto, no con una declaración que se ignora.
 */

/** Los dos desenlaces que el dueño o el supervisor pueden dictar. */
export type EstadoResuelto = 'aprobado' | 'rechazado';

export interface AvisoDeRegistro {
  readonly nombres: string;
  readonly apellidos: string;
  readonly estado: EstadoResuelto;
  /** Solo en el rechazo, y es lo que el punto 7 quiere que se explique. */
  readonly motivo?: string | null;
}

export interface CorreoArmado {
  readonly asunto: string;
  readonly html: string;
  readonly texto: string;
}

/** La paleta del proyecto, la misma de `AGENTS.md`. */
const AMARILLO = '#fbb103';
const CREMA_FONDO = '#fbf1d5';
const CREMA_BRILLANTE = '#fcedbb';
const NARANJA = '#dc5b02';
const AZUL_ACENTO = '#006ae7';
const AZUL_SOMBRA = '#003592';
const AZUL_BRILLANTE = '#f8fbfd';

const TITULOS = "Georgia, 'Times New Roman', serif";
const TEXTO = "'Trebuchet MS', Verdana, sans-serif";

/**
 * El logo del encabezado.
 *
 * Se puede cambiar sin tocar el código con la variable `LOGO_URL`. El
 * valor de acá es el respaldo: la versión liviana del lockup (66 KB),
 * publicada con la aplicación en Vercel. No depende del repositorio, que
 * es privado, así el correo nunca sale sin marca aunque nadie haya
 * configurado nada.
 */
const LOGO_POR_DEFECTO = 'https://tumbito.vercel.app/imagenes/logo-correo.png';

/**
 * Escapa lo que escribió una persona antes de meterlo en el HTML.
 *
 * El motivo del rechazo lo tipea el dueño y termina dentro del cuerpo
 * del correo. Sin esto, un motivo con `<` o `&` rompe el mensaje, y uno
 * escrito con mala intención podría meter etiquetas en el mail que le
 * llega al cliente.
 */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** El nombre de pila, para tutear sin quedar solemne. */
function tratamiento(nombres: string): string {
  const primero = nombres.trim().split(/\s+/)[0] ?? '';
  return primero || 'Hola';
}

export function armarCorreo(aviso: AvisoDeRegistro, logo = LOGO_POR_DEFECTO): CorreoArmado {
  return aviso.estado === 'aprobado' ? correoDeBienvenida(aviso, logo) : correoDeRechazo(aviso, logo);
}

/** La cáscara común: el fondo, el logo y el pie. Lo de adentro cambia. */
function envolver(logo: string, acento: string, cuerpo: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tumbito</title>
</head>
<body style="margin:0;padding:0;background-color:${CREMA_FONDO};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREMA_FONDO};padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${AZUL_BRILLANTE};border-radius:18px;overflow:hidden;border:1px solid ${CREMA_BRILLANTE};">
    <tr><td style="height:8px;background-color:${acento};font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td align="center" style="background-color:${CREMA_FONDO};padding:22px 24px 16px 24px;">
      <img src="${logo}" width="240" alt="Tumbito" style="display:block;width:240px;max-width:80%;height:auto;border:0;">
    </td></tr>
    ${cuerpo}
    <tr><td style="background-color:${CREMA_BRILLANTE};padding:18px 24px;">
      <p style="margin:0;font-family:${TEXTO};font-size:12px;line-height:1.5;color:${AZUL_SOMBRA};text-align:center;">
        Este mensaje se generó automáticamente. No hace falta que lo respondas.
      </p>
      <p style="margin:6px 0 0 0;font-family:${TITULOS};font-size:13px;color:${NARANJA};text-align:center;letter-spacing:1px;">
        TUMBITO
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function correoDeBienvenida(aviso: AvisoDeRegistro, logo: string): CorreoArmado {
  const nombre = escapar(tratamiento(aviso.nombres));

  const cuerpo = `
    <tr><td style="padding:26px 28px 8px 28px;">
      <h1 style="margin:0 0 4px 0;font-family:${TITULOS};font-size:28px;line-height:1.2;color:${AZUL_SOMBRA};">
        ¡${nombre}, ya sos parte!
      </h1>
      <p style="margin:0;font-family:${TITULOS};font-size:17px;color:${AMARILLO};font-style:italic;">
        Tu registro fue aprobado.
      </p>
    </td></tr>
    <tr><td style="padding:14px 28px 4px 28px;">
      <p style="margin:0 0 14px 0;font-family:${TEXTO};font-size:16px;line-height:1.6;color:${AZUL_SOMBRA};">
        El dueño revisó tus datos y te dio el visto bueno. Ya podés entrar a la aplicación
        con el correo y la contraseña que elegiste al registrarte.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREMA_FONDO};border-radius:12px;">
        <tr><td style="padding:16px 18px;">
          <p style="margin:0 0 8px 0;font-family:${TITULOS};font-size:15px;color:${AZUL_ACENTO};">
            Lo que sigue
          </p>
          <p style="margin:0;font-family:${TEXTO};font-size:15px;line-height:1.6;color:${AZUL_SOMBRA};">
            Cuando llegues al restaurante, escaneá el código QR de la entrada para anotarte
            en la lista de espera. El metre te va a asignar una mesa y ahí vas a poder ver
            el menú y hacer tu pedido desde el teléfono.
          </p>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:20px 28px 26px 28px;">
      <p style="margin:0;font-family:${TEXTO};font-size:15px;line-height:1.6;color:${AZUL_SOMBRA};">
        Te esperamos.
      </p>
    </td></tr>`;

  const texto = `${tratamiento(aviso.nombres)}, ya sos parte.

Tu registro en Tumbito fue aprobado. Ya podés entrar a la aplicación con el correo y la contraseña que elegiste al registrarte.

Cuando llegues al restaurante, escaneá el código QR de la entrada para anotarte en la lista de espera. El metre te va a asignar una mesa y ahí vas a poder ver el menú y hacer tu pedido.

Te esperamos.

Este mensaje se generó automáticamente. No hace falta que lo respondas.
TUMBITO`;

  return {
    asunto: `${tratamiento(aviso.nombres)}, tu registro en Tumbito fue aprobado`,
    html: envolver(logo, AMARILLO, cuerpo),
    texto,
  };
}

function correoDeRechazo(aviso: AvisoDeRegistro, logo: string): CorreoArmado {
  const nombre = escapar(tratamiento(aviso.nombres));
  const motivo = aviso.motivo?.trim();

  /*
   * El bloque del motivo aparece solo si hay motivo. Dejar el recuadro
   * vacío sería peor que no ponerlo: parece que falta algo.
   */
  const bloqueMotivo = motivo
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREMA_FONDO};border-left:4px solid ${NARANJA};border-radius:10px;">
        <tr><td style="padding:16px 18px;">
          <p style="margin:0 0 6px 0;font-family:${TITULOS};font-size:14px;color:${NARANJA};text-transform:uppercase;letter-spacing:1px;">
            Motivo
          </p>
          <p style="margin:0;font-family:${TEXTO};font-size:16px;line-height:1.6;color:${AZUL_SOMBRA};">
            ${escapar(motivo)}
          </p>
        </td></tr>
      </table>`
    : '';

  const cuerpo = `
    <tr><td style="padding:26px 28px 8px 28px;">
      <h1 style="margin:0 0 4px 0;font-family:${TITULOS};font-size:26px;line-height:1.25;color:${AZUL_SOMBRA};">
        ${nombre}, no pudimos aprobar tu registro
      </h1>
      <p style="margin:0;font-family:${TITULOS};font-size:16px;color:${NARANJA};font-style:italic;">
        Te contamos por qué.
      </p>
    </td></tr>
    <tr><td style="padding:14px 28px 4px 28px;">
      <p style="margin:0 0 14px 0;font-family:${TEXTO};font-size:16px;line-height:1.6;color:${AZUL_SOMBRA};">
        Revisamos los datos que cargaste y, por ahora, tu cuenta no quedó habilitada
        para ingresar a la aplicación.
      </p>
      ${bloqueMotivo}
    </td></tr>
    <tr><td style="padding:18px 28px 26px 28px;">
      <p style="margin:0;font-family:${TEXTO};font-size:15px;line-height:1.6;color:${AZUL_SOMBRA};">
        Si creés que se trata de un error, acercate al restaurante y lo resolvemos ahí mismo.
      </p>
    </td></tr>`;

  const texto = `${tratamiento(aviso.nombres)}, no pudimos aprobar tu registro.

Revisamos los datos que cargaste y, por ahora, tu cuenta no quedó habilitada para ingresar a la aplicación.
${motivo ? `\nMotivo: ${motivo}\n` : ''}
Si creés que se trata de un error, acercate al restaurante y lo resolvemos ahí mismo.

Este mensaje se generó automáticamente. No hace falta que lo respondas.
TUMBITO`;

  return {
    asunto: `${tratamiento(aviso.nombres)}, novedades sobre tu registro en Tumbito`,
    html: envolver(logo, NARANJA, cuerpo),
    texto,
  };
}

export interface DestinoDelCorreo {
  readonly correo: string;
  readonly nombre: string;
}

/**
 * Entrega el correo con la API de Brevo.
 *
 * Es una sola llamada HTTPS, que es justamente por qué se eligió Brevo
 * y no SMTP: Deno Deploy —donde corren las Edge Functions— bloquea los
 * puertos de correo habituales.
 *
 * Devuelve el error en texto en vez de tirar, porque quien llama tiene
 * que poder distinguir «el mail no salió» de «la función se cayó»: el
 * cliente ya quedó aprobado en la base y eso no se deshace.
 */
export async function entregarConBrevo(
  correo: CorreoArmado,
  destino: DestinoDelCorreo,
  remitente: DestinoDelCorreo,
  clave: string,
): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  let respuesta: Response;
  try {
    respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': clave,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: remitente.correo, name: remitente.nombre },
        to: [{ email: destino.correo, name: destino.nombre }],
        subject: correo.asunto,
        htmlContent: correo.html,
        textContent: correo.texto,
      }),
    });
  } catch (falla) {
    return { ok: false, error: `No se pudo contactar a Brevo: ${String(falla)}` };
  }

  if (!respuesta.ok) {
    // El cuerpo de Brevo explica el motivo real (clave mal, remitente
    // sin verificar, cuota agotada). Sin él, el registro queda inútil.
    const detalle = await respuesta.text().catch(() => '');
    return { ok: false, error: `Brevo respondió ${respuesta.status}: ${detalle.slice(0, 400)}` };
  }

  const datos = (await respuesta.json().catch(() => ({}))) as { messageId?: string };
  return { ok: true, id: datos.messageId };
}
