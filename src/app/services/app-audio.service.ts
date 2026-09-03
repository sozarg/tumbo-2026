import { Injectable } from '@angular/core';
import { NativeAudio } from '@capacitor-community/native-audio';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class AppAudio {
  private isInitialized = false;
  private hasPlayedOpening = false; // Bandera para que suene por única vez

  constructor() {
    if (Capacitor.isNativePlatform()) {
      this.listenToAppState();
    }
  }

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.isInitialized) return;

    try {
      await NativeAudio.preload({
        assetId: 'audio_open',
        assetPath: 'public/assets/sounds/inicio_app_audio.mp3',
        audioChannelNum: 1,
        isUrl: false
      });

      await NativeAudio.preload({
        assetId: 'audio_close',
        assetPath: 'public/assets/sounds/cerrando_app_sonido.mp3',
        audioChannelNum: 1,
        isUrl: false
      });

      this.isInitialized = true;
      console.log('[AppAudio] Audios nativos precargados');
      
      // Reproducir apertura por única vez al iniciar
      await this.playOpenOnce();
    } catch (error) {
      console.error('[AppAudio Error init]:', error);
    }
  }

  // Reproduce únicamente si no se reprodujo antes en esta sesión
  async playOpenOnce(): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.isInitialized || this.hasPlayedOpening) return;
    
    try {
      this.hasPlayedOpening = true;
      await NativeAudio.play({ assetId: 'audio_open' });
      console.log('[AppAudio] Sonido de apertura reproducido por única vez');
    } catch (e) {
      console.warn('[AppAudio] Error al reproducir apertura:', e);
    }
  }

  // Reproduce el sonido de cierre
  async playClose(): Promise<void> {
    if (!Capacitor.isNativePlatform() || !this.isInitialized) return;
    
    try {
      await NativeAudio.play({ assetId: 'audio_close' });
      console.log('[AppAudio] Sonido de cierre reproducido');
    } catch (e) {
      console.warn('[AppAudio] Error al reproducir cierre:', e);
    }
  }

  private listenToAppState(): void {
    App.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) {
        // Se ejecuta cuando la app se minimiza o pasa a segundo plano (cierre/salida)
        await this.playClose();
      }
    });
  }
}