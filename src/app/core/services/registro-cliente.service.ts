import { Injectable, inject } from '@angular/core';
import { AltaClienteDemo, FotoDePersona } from '../models/demo-restaurante';
import { comprimirFoto } from '../imagenes/comprimir-foto';
import { SupabaseClient } from '@supabase/supabase-js';
import { clienteAislado, supabaseConfigurado } from './supabase.client';
import { DemoRestauranteService } from './demo-restaurante.service';

export interface ResultadoDeRegistro {
  readonly ok: boolean;
  /** Qué salió mal, ya en español y listo para mostrar. */
  readonly error?: string;
  /** La cuenta se creó, pero algo quedó a medias. Ver `guardarFoto`. */
  readonly aviso?: string;
}

/**
 * El registro de un cliente por su cuenta (punto 5).
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ `signUp` Y NO UNA EDGE FUNCTION
 *
 * El enunciado dice «Crear un cliente registrado (dispositivo 2)», y el
 * dispositivo 2 es el teléfono del cliente. Pero también dice «Perfiles:
 * cliente o metre», y el metre da de alta desde SU teléfono, con su
 * sesión abierta.
 *
 * `signUp` deja logueado al usuario recién creado, así que hecho con el
 * cliente de siempre le robaría la sesión al metre. Por eso se usa
 * `clienteAislado()`: un cliente que no persiste nada, cuya sesión vive
 * en memoria y se va con la función. Así el mismo servicio sirve para
 * los dos recorridos —el cliente solo en `/registro` y el metre desde
 * adentro— sin que ninguno pise al otro.
 *
 * El alta del EMPLEADO, en cambio, sigue necesitando una Edge Function:
 * ahí hay que fijar el perfil en `app_metadata`, y eso solo lo puede
 * hacer `service_role`, que nunca baja al navegador.
 *
 * ───────────────────────────────────────────────────────────────────
 * DE DÓNDE SALE EL PERFIL
 *
 * De ningún lado de acá: lo pone la base. El trigger
 * `trg_auth_usuario_nuevo` lee `app_metadata` —que solo puede escribir
 * `service_role`— y, al no encontrar nada, cae en `cliente_registrado`
 * con estado `pendiente`. Es lo que pide el punto 5 y, sobre todo, es
 * lo que impide que alguien se registre mandando `perfil: 'dueno'`.
 *
 * Por eso este servicio NO manda el perfil ni el estado. Los datos
 * personales sí van en `user_metadata`, que es del propio usuario y no
 * otorga privilegios.
 */
@Injectable({ providedIn: 'root' })
export class RegistroClienteService {
  private readonly mock = inject(DemoRestauranteService);

  async registrar(datos: AltaClienteDemo): Promise<ResultadoDeRegistro> {
    if (!supabaseConfigurado) {
      this.mock.registrarCliente(datos);
      return { ok: true };
    }

    /*
     * Uno nuevo en cada alta, y a propósito: así la sesión del cliente
     * recién creado no sobrevive ni siquiera a la llamada. Va tipado
     * como el cliente genérico porque los tipos generados hacen que el
     * `update` de `usuarios` resuelva a `never`, igual que en
     * `OperacionService`.
     */
    const cliente = clienteAislado() as unknown as SupabaseClient;

    const correo = datos.correo.trim().toLowerCase();
    // La base exige `formato_dni`: siete u ocho dígitos y nada más. El
    // formulario deja escribirlo con puntos, así que se limpian acá.
    const dni = datos.dni.replace(/\D/g, '');

    const { data, error } = await cliente.auth.signUp({
      email: correo,
      password: datos.clave,
      options: {
        data: {
          nombres: datos.nombres.trim(),
          apellidos: datos.apellidos.trim(),
          dni,
        },
      },
    });

    if (error) return { ok: false, error: this.traducir(error.message) };
    if (!data.user) return { ok: false, error: 'No se pudo crear la cuenta. Reintentá.' };

    /*
     * SUPABASE NO DICE «ESE CORREO YA EXISTE».
     *
     * A propósito: si lo dijera, cualquiera podría averiguar quién está
     * registrado probando direcciones. En vez de un error devuelve un
     * usuario SIN identidades, y hay que reconocerlo por ahí.
     *
     * Para el cliente que se está registrando el mensaje es el mismo de
     * siempre, y no filtra nada que no sepa: es su propio correo.
     */
    if (data.user.identities?.length === 0) {
      return { ok: false, error: 'Ese correo ya tiene una cuenta. Probá ingresar.' };
    }

    /*
     * SIN SESIÓN NO SE PUEDE SUBIR LA FOTO.
     *
     * Pasa cuando en Supabase está activada la confirmación por correo:
     * `signUp` crea la cuenta pero no devuelve sesión, y la política
     * `cliente_sube_foto_propia` exige `auth.uid()` para escribir en la
     * carpeta del usuario.
     *
     * La cuenta quedó creada igual, así que decir «falló» sería mentir
     * —y peor: invitaría a reintentar contra un correo ya tomado—. Se
     * avisa y listo.
     */
    if (!data.session) {
      return {
        ok: true,
        aviso: 'Tu cuenta se creó. Confirmá tu correo y después cargá tu foto desde tu perfil.',
      };
    }

    const aviso = await this.guardarFoto(cliente, data.user.id, datos.foto);

    /*
     * NO HACE FALTA CERRAR NINGUNA SESIÓN.
     *
     * El punto 5 es terminante —«El cliente NO podrá ingresar a la
     * aplicación si no es aceptado previamente»— y antes acá había un
     * `signOut()` para cumplirlo. Ya no hace falta: la sesión que
     * devolvió `signUp` nunca se guardó en ningún lado, vive dentro de
     * `cliente` y desaparece con él. Y el `signOut()` era justamente lo
     * que dejaba afuera al metre que daba el alta desde su propio
     * teléfono.
     *
     * Quien intente entrar con esa cuenta va a pasar por el ingreso
     * normal, que verifica el estado contra la base.
     */
    return aviso ? { ok: true, aviso } : { ok: true };
  }

  /**
   * Sube la foto y la asocia al perfil recién creado.
   *
   * Devuelve un AVISO y no un error, por lo mismo que la foto de la
   * mesa: la cuenta ya existe, y contestar que falló mandaría a la
   * persona a registrarse de nuevo con un correo que ya está tomado.
   */
  private async guardarFoto(
    cliente: SupabaseClient,
    id: string,
    foto?: FotoDePersona,
  ): Promise<string | undefined> {
    if (!foto) {
      return 'Tu cuenta se creó, pero quedó sin foto.';
    }

    try {
      const archivo = await comprimirFoto(foto.file);
      // La carpeta TIENE que ser el id: la política de Storage compara
      // el primer tramo de la ruta contra `auth.uid()`.
      const ruta = `${id}/${crypto.randomUUID()}.jpg`;

      const subida = await cliente.storage.from('fotos-usuarios').upload(ruta, archivo, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      });

      if (subida.error) return 'Tu cuenta se creó, pero la foto no se pudo subir.';

      const url = cliente.storage.from('fotos-usuarios').getPublicUrl(ruta).data.publicUrl;

      // `select('id')` para saber si escribió de verdad: un update que
      // RLS deniega vuelve como éxito con cero filas.
      const { data, error } = await cliente
        .from('usuarios')
        .update({ foto_url: url })
        .eq('id', id)
        .select('id');

      if (error || !data?.length) {
        return 'Tu cuenta se creó, pero la foto no se pudo asociar a tu perfil.';
      }

      return undefined;
    } catch {
      return 'Tu cuenta se creó, pero no se pudo procesar la foto.';
    }
  }

  /**
   * Los errores de Supabase Auth, en castellano.
   *
   * Llegan en inglés y algunos son crudos —el del DNI repetido es la
   * violación del índice único, tal cual la escupe PostgreSQL—. Sin
   * esto, el cliente lee «duplicate key value violates unique
   * constraint usuarios_dni_key» y no entiende nada.
   */
  private traducir(mensaje: string): string {
    const texto = mensaje.toLowerCase();

    if (texto.includes('usuarios_dni_key') || texto.includes('dni')) {
      return 'Ese DNI ya está registrado.';
    }
    if (texto.includes('already registered') || texto.includes('usuarios_correo_key')) {
      return 'Ese correo ya tiene una cuenta. Probá ingresar.';
    }
    if (texto.includes('password')) {
      return 'La contraseña no cumple con lo que pide el servidor. Probá con una más larga.';
    }
    if (texto.includes('email')) {
      return 'Revisá la dirección de correo.';
    }
    if (texto.includes('rate limit') || texto.includes('too many')) {
      return 'Hubo demasiados intentos seguidos. Esperá un momento y reintentá.';
    }

    return 'No se pudo crear la cuenta. Revisá los datos y la conexión.';
  }
}
