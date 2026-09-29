import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SesionService } from '../services/sesion.service';
import { supabaseClient } from '../services/supabase.client';

/**
 * El registro del teléfono para recibir notificaciones automáticas.
 *
 * ───────────────────────────────────────────────────────────────────
 * QUÉ PIDE EL ENUNCIADO Y POR QUÉ HACE FALTA FIREBASE
 *
 * Entre los requisitos generales: «Utilización de notificaciones
 * automáticas (push notification) con la aplicación abierta o cerrada».
 *
 * Esa última palabra decide la arquitectura. Con la aplicación cerrada
 * no hay código nuestro corriendo, así que el aviso no lo puede mostrar
 * la aplicación: tiene que despertarla el sistema operativo. En Android
 * ese servicio es Firebase Cloud Messaging, y no hay alternativa —
 * Realtime de Supabase es un WebSocket y muere cuando la app se cierra.
 *
 * ───────────────────────────────────────────────────────────────────
 * QUÉ HACE ESTE SERVICIO Y QUÉ NO
 *
 * Solo consigue el token que identifica a ESTE teléfono y lo guarda en
 * `dispositivos_push`. Mandar las notificaciones es del servidor: la
 * Edge Function `avisar-push` lee esa tabla y llama a Firebase.
 *
 * La separación importa. El token es lo único que la aplicación puede
 * averiguar, y la credencial para enviar —que es una clave privada—
 * nunca baja al teléfono.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ SE REGISTRA AL INICIAR SESIÓN Y NO AL ARRANCAR
 *
 * Un token sin dueño no sirve: para avisarle al dueño que hay un
 * cliente pendiente hay que saber cuál de los teléfonos es el suyo. Por
 * eso el registro cuelga de la sesión, y al cerrarla el token se borra:
 * si no, el teléfono seguiría recibiendo los avisos del turno anterior.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesPush {
  private readonly sesion = inject(SesionService);
  private readonly destroyRef = inject(DestroyRef);

  /** `false` en el navegador: no hay push sin aplicación nativa. */
  readonly esReal = Capacitor.isNativePlatform();

  /*
   * El cliente genérico y no el tipado con `Database`, por lo mismo que
   * en `OperacionService`: los tipos generados hacen que el `upsert` de
   * `dispositivos_push` resuelva a `never`.
   */
  private readonly cliente = supabaseClient as unknown as SupabaseClient | null;

  /** El último token conocido, para poder borrarlo al cerrar sesión. */
  private readonly token = signal<string | null>(null);
  private escuchando = false;
  private usuarioDelToken: string | null = null;

  constructor() {
    /*
     * Un efecto y no una llamada desde el ingreso: así también cubre la
     * sesión restaurada al abrir la aplicación, que no pasa por la
     * pantalla de ingreso.
     */
    effect(() => {
      const usuario = this.sesion.usuario();
      if (usuario) void this.registrar(usuario.id);
      else void this.olvidar();
    });

    this.destroyRef.onDestroy(() => void this.olvidar());
  }

  /**
   * Pide permiso, obtiene el token y lo guarda.
   *
   * No tira nunca: que un teléfono no quiera notificaciones no puede
   * impedir que la persona use la aplicación. Los problemas quedan en
   * la consola, que es donde se los busca cuando el push no llega.
   */
  private async registrar(usuarioId: string): Promise<void> {
    if (!this.esReal || this.usuarioDelToken === usuarioId) return;
    this.usuarioDelToken = usuarioId;

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      /*
       * Desde Android 13 el permiso de notificaciones se pide como
       * cualquier otro. `checkPermissions` primero para no volver a
       * molestar a quien ya lo concedió.
       */
      let permiso = await PushNotifications.checkPermissions();
      if (permiso.receive === 'prompt' || permiso.receive === 'prompt-with-rationale') {
        permiso = await PushNotifications.requestPermissions();
      }
      if (permiso.receive !== 'granted') {
        console.warn('[TUMBO] Sin permiso de notificaciones: este teléfono no va a recibir avisos.');
        return;
      }

      // Una sola vez por vida de la aplicación: `addListener` acumula, y
      // registrarse de nuevo con los oyentes duplicados guarda el token
      // tantas veces como sesiones se hayan abierto.
      if (!this.escuchando) {
        this.escuchando = true;

        await PushNotifications.addListener('registration', (dato: { value: string }) => {
          this.token.set(dato.value);
          void this.guardar(dato.value);
        });

        await PushNotifications.addListener('registrationError', (falla: unknown) => {
          console.error('[TUMBO] Firebase no entregó el token del dispositivo', falla);
        });
      }

      await PushNotifications.register();
    } catch (falla) {
      console.error('[TUMBO] No se pudo registrar el dispositivo para notificaciones', falla);
    }
  }

  /**
   * Guarda el token contra el usuario que tiene la sesión abierta.
   *
   * `upsert` sobre `token` y no un `insert`: el mismo teléfono devuelve
   * el mismo token siempre, y Firebase puede rotarlo cuando quiera. Sin
   * el upsert, reinstalar la aplicación o cambiar de usuario llenaría
   * la tabla de filas muertas que harían llegar avisos duplicados.
   */
  private async guardar(token: string): Promise<void> {
    const usuarioId = this.sesion.usuario()?.id;
    if (!this.cliente || !usuarioId) return;

    const { error } = await this.cliente
      .from('dispositivos_push')
      .upsert(
        { usuario_id: usuarioId, token, plataforma: 'android', actualizado_en: new Date().toISOString() },
        { onConflict: 'token' },
      );

    if (error) console.error('[TUMBO] No se pudo guardar el token del dispositivo', error);
  }

  /**
   * Borra el token al cerrar sesión.
   *
   * Es lo que impide que el teléfono siga recibiendo las notificaciones
   * del turno anterior: en el restaurante el mismo aparato lo usa el
   * mozo de la mañana y el de la tarde.
   */
  private async olvidar(): Promise<void> {
    this.usuarioDelToken = null;
    const token = this.token();
    if (!this.cliente || !token) return;

    this.token.set(null);
    const { error } = await this.cliente.from('dispositivos_push').delete().eq('token', token);
    if (error) console.error('[TUMBO] No se pudo borrar el token del dispositivo', error);
  }
}
