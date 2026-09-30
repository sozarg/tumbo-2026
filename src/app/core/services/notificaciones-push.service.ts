import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
} from '@capacitor/push-notifications';
import { supabaseClient } from './supabase.client';
import { almacenamientoSesion } from './almacenamiento-sesion';

const CLAVE_TOKEN_PUSH = 'tumbo.token-push';
type FilaPush = { usuario_id: string; token: string; plataforma: 'ios' | 'android' | 'web' };

/** Registra el dispositivo y muestra las notificaciones recibidas por FCM. */
@Injectable({ providedIn: 'root' })
export class NotificacionesPushService {
  private token: string | null = null;
  private listenersRegistrados = false;
  private tokenListo: Promise<string> | null = null;
  private resolverToken: ((token: string) => void) | null = null;

  async registrarParaUsuario(usuarioId: string): Promise<void> {
    try {
      await this.registrarParaUsuarioInterno(usuarioId);
    } catch {
      // Un permiso denegado o un dispositivo sin Google Play no debe impedir el ingreso.
    }
  }

  private async registrarParaUsuarioInterno(usuarioId: string): Promise<void> {
    if (!supabaseClient || !Capacitor.isNativePlatform()) return;

    await this.registrarListeners();
    const permiso = await PushNotifications.checkPermissions();
    const estado = permiso.receive === 'granted'
      ? permiso
      : await PushNotifications.requestPermissions();
    if (estado.receive !== 'granted') return;

    await PushNotifications.register();
    const token = this.token ?? (this.tokenListo ? await this.tokenListo : null);
    if (!token) return;

    const plataforma = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
    const fila: FilaPush = {
      usuario_id: usuarioId,
      token,
      plataforma,
    };
    const cliente = supabaseClient as unknown as SupabaseClient;
    const { error } = await cliente.from('dispositivos_push').upsert(
      fila,
      { onConflict: 'token' },
    );
    if (!error) await almacenamientoSesion.setItem(CLAVE_TOKEN_PUSH, token);
  }

  private async registrarListeners(): Promise<void> {
    if (this.listenersRegistrados) return;
    this.listenersRegistrados = true;
    this.tokenListo = new Promise<string>((resolve) => {
      this.resolverToken = resolve;
    });

    await PushNotifications.addListener('registration', (token: Token) => {
      this.token = token.value;
      this.resolverToken?.(token.value);
      this.resolverToken = null;
    });
    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notificacion: PushNotificationSchema) => {
        window.dispatchEvent(new CustomEvent('tumbo:push-recibida', { detail: notificacion }));
      },
    );
  }
}
