import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Tablas, Vistas } from '../models/base-de-datos';
import { AccesoRapido, Usuario, etiquetaDePerfil } from '../models/usuario';
import { AutenticacionPort, ModoAutenticacion, ResultadoAutenticacion } from './autenticacion.port';
import { SesionService } from './sesion.service';
import { almacenamientoSesion } from './almacenamiento-sesion';
import { exigirCliente, supabaseClient } from './supabase.client';

type FilaUsuario = Tablas<'usuarios'>;

/** Dónde se guarda el token de notificaciones de este dispositivo. */
const CLAVE_TOKEN_PUSH = 'tumbo.token-push';

/**
 * Fila de la vista accesos_rapidos.
 *
 * PostgreSQL no garantiza que las columnas de una vista sean no nulas,
 * así que los tipos generados las marcan todas como opcionales. Por eso
 * más abajo se descartan explícitamente las filas incompletas en lugar
 * de asumir que vienen llenas.
 */
type FilaAccesoRapido = Vistas<'accesos_rapidos'>;

@Injectable({ providedIn: 'root' })
export class AutenticacionSupabaseService implements AutenticacionPort {
  private readonly sesion = inject(SesionService);

  readonly modo: ModoAutenticacion = 'supabase';
  readonly claveDemostracion = environment.claveDemostracion;

  private readonly accesos = signal<readonly AccesoRapido[]>([]);
  readonly accesosRapidos = this.accesos.asReadonly();

  readonly listo: Promise<void>;

  constructor() {
    this.listo = this.arrancar();
  }

  // ─────────────────────────────────────────────────────────────────
  // Arranque
  // ─────────────────────────────────────────────────────────────────

  /**
   * Restaura la sesión guardada y carga los accesos rápidos.
   *
   * Nunca lanza: si algo falla al arrancar, la aplicación tiene que
   * abrir igual en la pantalla de ingreso y explicar el problema ahí,
   * no quedarse en blanco.
   */
  private async arrancar(): Promise<void> {
    if (!supabaseClient) {
      return;
    }

    supabaseClient.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') {
        this.sesion.cerrar();
      }
    });

    await Promise.all([this.restaurarSesion(), this.cargarAccesosRapidos()]);
  }

  private async restaurarSesion(): Promise<void> {
    const cliente = supabaseClient;
    if (!cliente) {
      return;
    }

    try {
      const { data } = await cliente.auth.getSession();
      const identidad = data.session?.user;
      if (!identidad) {
        return;
      }

      const fila = await this.buscarPerfil(identidad.id);
      // Una cuenta que quedó abierta y mientras tanto fue rechazada no
      // debe seguir operando: se la cierra al arrancar.
      if (!fila || fila.estado !== 'aprobado') {
        await cliente.auth.signOut();
        this.sesion.cerrar();
        return;
      }

      this.sesion.iniciar(this.aUsuario(fila));
    } catch {
      this.sesion.cerrar();
    }
  }

  /** Requisito excluyente R12: los accesos rápidos salen de la base. */
  async cargarAccesosRapidos(): Promise<void> {
    const cliente = supabaseClient;
    if (!cliente) {
      return;
    }

    try {
      const { data, error } = await cliente.from('accesos_rapidos').select('*');

      if (error || !data) {
        this.accesos.set([]);
        return;
      }

      this.accesos.set(
        data
          .map((fila) => this.aAccesoRapido(fila))
          .filter((acceso): acceso is AccesoRapido => acceso !== null),
      );
    } catch {
      this.accesos.set([]);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Ingreso
  // ─────────────────────────────────────────────────────────────────

  async ingresar(correo: string, clave: string): Promise<ResultadoAutenticacion> {
    const cliente = exigirCliente();

    const { data, error } = await cliente.auth.signInWithPassword({
      email: correo.trim().toLowerCase(),
      password: clave,
    });

    if (error || !data.user) {
      throw new Error(this.mensajeDeError(error?.message));
    }

    const fila = await this.buscarPerfil(data.user.id);

    if (!fila) {
      await cliente.auth.signOut();
      throw new Error(
        'La cuenta existe pero no tiene un perfil cargado. Avisale al dueño o al supervisor.',
      );
    }

    // Puntos 5, 7 y 8: el cliente que no fue aceptado no puede ingresar.
    // Se comprueba contra la tabla usuarios, nunca contra user_metadata,
    // porque el metadata lo puede escribir la propia persona.
    if (fila.estado !== 'aprobado') {
      await cliente.auth.signOut();
      throw new Error(this.mensajeSegunEstado(fila));
    }

    const usuario = this.aUsuario(fila);
    this.sesion.iniciar(usuario);
    return { usuario };
  }

  /**
   * Ingreso rápido: toma el correo del acceso elegido y entra con la
   * clave común de demostración. No es un atajo que saltee la
   * autenticación: pasa por Supabase Auth igual que el formulario, y
   * por lo tanto también respeta el estado de la cuenta.
   */
  async ingresarRapido(id: string): Promise<ResultadoAutenticacion> {
    const acceso = this.accesos().find((candidato) => candidato.id === id);

    if (!acceso) {
      throw new Error('Ese acceso rápido ya no está disponible. Actualizá la pantalla.');
    }

    if (!this.claveDemostracion) {
      throw new Error(
        'Los accesos rápidos necesitan la clave común de demostración. ' +
          'Completá claveDemostracion en environment.local.ts.',
      );
    }

    return this.ingresar(acceso.correo, this.claveDemostracion);
  }

  /**
   * Cierre de sesión completo (requisito excluyente R13).
   *
   * El enunciado pide poder VERIFICAR que las credenciales se borren, no
   * solo que el usuario vuelva al ingreso. Por eso son cuatro pasos y en
   * este orden:
   *
   *   1. Borrar el token de este dispositivo de `dispositivos_push`,
   *      mientras todavía hay sesión: después del signOut, RLS ya no
   *      deja tocar esa fila. Si no se hace, el celular sigue recibiendo
   *      notificaciones de una cuenta que cerró sesión.
   *   2. `signOut`, esperado. Si se navega sin esperar, el token puede
   *      seguir unos milisegundos en el almacenamiento.
   *   3. Limpiar el almacenamiento a mano, por si quedó una clave de una
   *      versión anterior de supabase-js con otro prefijo.
   *   4. Limpiar el estado en memoria.
   *
   * Ninguno de los tres primeros puede voltear el cuarto: si algo falla
   * —sin red, por ejemplo— igual se cierra la sesión del lado del
   * usuario. Quedarse adentro por un error de red sería peor.
   */
  async cerrarSesion(): Promise<void> {
    try {
      await this.olvidarDispositivo();
    } catch {
      // Sin red o sin permiso: se sigue. La fila queda huérfana y se
      // limpia en el próximo ingreso desde este mismo dispositivo.
    }

    try {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
    } catch {
      // Aunque el servidor no conteste, la sesión local se cierra igual.
    }

    try {
      await almacenamientoSesion.limpiar();
    } catch {
      // Nada que hacer: el estado en memoria se limpia igual.
    }

    this.sesion.cerrar();
  }

  /**
   * Borra el token push de ESTE dispositivo, no los de los otros: el
   * enunciado se demuestra con cuatro celulares en simultáneo y cerrar
   * sesión en uno no puede dejar mudos a los demás.
   *
   * Hoy todavía no hay nada que escriba en `dispositivos_push` —falta el
   * alta con Firebase—, así que esto no borra nada. Se deja escrito
   * ahora para que el día que se registre el token, el cierre de sesión
   * ya lo contemple y nadie se olvide.
   */
  private async olvidarDispositivo(): Promise<void> {
    const token = await almacenamientoSesion.getItem(CLAVE_TOKEN_PUSH);
    if (!token || !supabaseClient) {
      return;
    }

    await supabaseClient.from('dispositivos_push').delete().eq('token', token);
    await almacenamientoSesion.removeItem(CLAVE_TOKEN_PUSH);
  }

  // ─────────────────────────────────────────────────────────────────
  // Auxiliares
  // ─────────────────────────────────────────────────────────────────

  /** Descarta las filas incompletas en lugar de forzar los tipos. */
  private aAccesoRapido(fila: FilaAccesoRapido): AccesoRapido | null {
    const { id, nombres, correo, perfil } = fila;

    if (id === null || nombres === null || correo === null || perfil === null) {
      return null;
    }

    return {
      id,
      nombres,
      apellidos: fila.apellidos ?? '',
      correo,
      perfil,
      etiquetaPerfil: etiquetaDePerfil(perfil),
      fotoUrl: fila.foto_url,
    };
  }

  private async buscarPerfil(id: string): Promise<FilaUsuario | null> {
    const cliente = exigirCliente();
    const { data, error } = await cliente.from('usuarios').select('*').eq('id', id).maybeSingle();

    return error ? null : data;
  }

  private aUsuario(fila: FilaUsuario): Usuario {
    return {
      id: fila.id,
      nombres: fila.nombres,
      apellidos: fila.apellidos ?? '',
      correo: fila.correo ?? '',
      perfil: fila.perfil,
      etiquetaPerfil: etiquetaDePerfil(fila.perfil),
      estado: fila.estado,
      fotoUrl: fila.foto_url,
    };
  }

  private mensajeSegunEstado(fila: FilaUsuario): string {
    if (fila.estado === 'rechazado') {
      return fila.motivo_rechazo
        ? `Tu registro fue rechazado. Motivo: ${fila.motivo_rechazo}`
        : 'Tu registro fue rechazado. Comunicate con el restaurante si creés que es un error.';
    }
    return (
      'Tu cuenta todavía está pendiente de aprobación. ' +
      'Un dueño o un supervisor tiene que aceptarla antes de que puedas ingresar.'
    );
  }

  /** Traduce los mensajes de Supabase, que llegan en inglés. */
  private mensajeDeError(mensaje: string | undefined): string {
    if (!mensaje) {
      return 'No se pudo iniciar sesión. Probá de nuevo en un momento.';
    }
    const normalizado = mensaje.toLowerCase();

    if (normalizado.includes('invalid login credentials')) {
      return 'El correo o la clave no coinciden con ninguna cuenta.';
    }
    if (normalizado.includes('email not confirmed')) {
      return 'La cuenta existe pero todavía no confirmó su correo electrónico.';
    }
    if (normalizado.includes('too many requests') || normalizado.includes('rate limit')) {
      return 'Hubo demasiados intentos seguidos. Esperá un momento y volvé a probar.';
    }
    if (normalizado.includes('failed to fetch') || normalizado.includes('network')) {
      return 'No se pudo contactar al servidor. Revisá tu conexión a internet.';
    }
    return 'No se pudo iniciar sesión. Probá de nuevo en un momento.';
  }
}
