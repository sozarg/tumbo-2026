import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SeccionPedida } from '../navegacion/seccion-pedida';
import { esSeccion } from '../navegacion/secciones';
import { CLAVE_TOKEN_PUSH, almacenamientoSesion } from '../services/almacenamiento-sesion';
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
  private readonly router = inject(Router);
  private readonly seccionPedida = inject(SeccionPedida);

  /** `false` en el navegador: no hay push sin aplicación nativa. */
  readonly esReal = Capacitor.isNativePlatform();

  /*
   * El cliente genérico y no el tipado con `Database`: los tipos
   * generados todavía no conocen `registrar_dispositivo`, y mientras no
   * se regeneren la llamada no compila.
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

        /*
         * El aviso que llega con la aplicación ABIERTA.
         *
         * Android no lo dibuja: cuando la aplicación está en primer
         * plano, Firebase se lo entrega al código en vez de ponerlo en
         * la barra, y si nadie lo escucha se pierde sin dejar rastro.
         * Eso es lo que hacía que las notificaciones «no llegaran»
         * mientras la aplicación estaba en uso, aunque sí llegaran con
         * ella cerrada. El enunciado pide las dos: «con la aplicación
         * abierta o cerrada».
         */
        await PushNotifications.addListener('pushNotificationReceived', (aviso) => {
          void this.mostrarEnLaBarra(aviso.title, aviso.body, aviso.data);
        });

        // Tocar el aviso de la barra con la aplicación cerrada o atrás.
        await PushNotifications.addListener('pushNotificationActionPerformed', (accion) => {
          this.irALoAvisado(accion.notification?.data);
        });

        const { LocalNotifications } = await import('@capacitor/local-notifications');

        // Y tocar el que dibujamos nosotros, con la aplicación abierta.
        await LocalNotifications.addListener('localNotificationActionPerformed', (accion) => {
          this.irALoAvisado(accion.notification?.extra);
        });

        /*
         * En Android los dos permisos son el mismo —POST_NOTIFICATIONS—
         * así que, habiendo concedido el de arriba, esto no vuelve a
         * preguntar. Se consulta igual para no depender de ese detalle.
         */
        const permisoDeLaBarra = await LocalNotifications.checkPermissions();
        if (permisoDeLaBarra.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
      }

      await PushNotifications.register();
    } catch (falla) {
      console.error('[TUMBO] No se pudo registrar el dispositivo para notificaciones', falla);
    }
  }

  /**
   * Registra este teléfono contra el usuario que tiene la sesión abierta.
   *
   * Llama a `registrar_dispositivo` y no escribe la tabla directamente,
   * y la razón es la que hizo que durante días las notificaciones le
   * llegaran siempre a la misma persona: EL TOKEN IDENTIFICA AL
   * TELÉFONO, NO A LA PERSONA.
   *
   * La política de la tabla deja que cada uno toque solo sus propias
   * filas, que para los datos de alguien es lo correcto. Pero el token
   * no es de nadie: es del aparato. Cuando el dueño cerraba sesión y
   * entraba el metre, la fila seguía existiendo a nombre del dueño, y
   * el intento del metre de tomarla chocaba contra esa misma política.
   * El primero que entraba en un teléfono se lo quedaba para siempre.
   *
   * La función de base corre con permisos propios y hace lo único que
   * tiene sentido: suelta el token de quien lo tuviera y se lo da a
   * quien está entrando ahora.
   *
   * El token también queda guardado en el teléfono. Eso es lo que le
   * permite al cierre de sesión soltarlo, en `olvidarDispositivo()`,
   * mientras la sesión todavía vale.
   */
  private async guardar(token: string): Promise<void> {
    const usuarioId = this.sesion.usuario()?.id;
    if (!this.cliente || !usuarioId) return;

    const { error } = await this.cliente.rpc('registrar_dispositivo', {
      p_token: token,
      p_plataforma: 'android',
    });

    if (error) {
      console.error('[TUMBO] No se pudo registrar el teléfono para notificaciones', error);
      return;
    }

    try {
      await almacenamientoSesion.setItem(CLAVE_TOKEN_PUSH, token);
    } catch {
      // Sin almacenamiento el registro igual sirve; lo que se pierde es
      // poder soltar el token al cerrar sesión. El próximo ingreso en
      // este mismo teléfono lo reasigna de todos modos.
    }
  }

  /**
   * Dibuja en la barra el aviso que llegó con la aplicación abierta.
   *
   * Es una notificación del sistema, no un cartel adentro de la
   * pantalla, y la razón es que tiene que verse igual que la que manda
   * Firebase cuando la aplicación está cerrada: mismo lugar, mismo
   * sonido, misma forma de tocarla. Si fuera un cartel propio, el
   * comportamiento cambiaría según si la aplicación está abierta, que
   * es justamente lo que el enunciado no quiere.
   *
   * No tira nunca: un aviso que no se pudo dibujar no puede cortar lo
   * que la persona está haciendo.
   */
  private async mostrarEnLaBarra(
    titulo: string | undefined,
    cuerpo: string | undefined,
    datos: unknown,
  ): Promise<void> {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [
          {
            /*
             * Un identificador distinto por aviso: con uno fijo, cada
             * notificación reemplazaría a la anterior y el mozo vería
             * solo la última de la tanda. El resto por 2³¹ porque
             * Android lo quiere entero de 32 bits con signo.
             */
            id: Date.now() % 2147483647,
            title: titulo?.trim() || 'TUMBO',
            body: cuerpo?.trim() || '',
            extra: datos ?? {},
          },
        ],
      });
    } catch (falla) {
      console.error('[TUMBO] No se pudo mostrar el aviso con la aplicación abierta', falla);
    }
  }

  /**
   * Abre la sección de la que hablaba el aviso.
   *
   * Cada aviso viaja con el nombre de una sección —`pedidos`, `espera`,
   * `cuenta`— que pone la función `avisar-push`. Se valida contra la
   * lista real de secciones antes de usarlo: el dato viene de afuera de
   * la aplicación y no hay motivo para confiarle el estado de la
   * pantalla.
   */
  private irALoAvisado(datos: unknown): void {
    const seccion = (datos as { seccion?: unknown } | null | undefined)?.seccion;
    if (!esSeccion(seccion)) return;

    this.seccionPedida.pedir(seccion);
    void this.router.navigate(['/operacion']);
  }

  /**
   * Borra el token al cerrar sesión.
   *
   * Es lo que impide que el teléfono siga recibiendo las notificaciones
   * del turno anterior: en el restaurante el mismo aparato lo usa el
   * mozo de la mañana y el de la tarde.
   *
   * Es la segunda línea de defensa, no la primera. Este efecto se
   * dispara cuando la sesión en memoria pasa a `null`, que ocurre
   * DESPUÉS del `signOut()`, y para entonces la política de la tabla ya
   * no deja borrar. El borrado que de verdad funciona es el de
   * `cerrarSesion()`, que corre antes. Esto queda igual por si alguien
   * cierra la sesión por otro camino, y porque no cuesta nada.
   */
  private async olvidar(): Promise<void> {
    this.usuarioDelToken = null;
    const token = this.token();
    if (!this.cliente || !token) return;

    this.token.set(null);
    const { error } = await this.cliente.from('dispositivos_push').delete().eq('token', token);
    if (error) console.error('[TUMBO] No se pudo borrar el token del dispositivo', error);

    try {
      await almacenamientoSesion.removeItem(CLAVE_TOKEN_PUSH);
    } catch {
      // Da igual: lo guardado solo sirve para soltar el token, y si el
      // borrado de arriba funcionó ya no hay nada que soltar.
    }
  }
}
