import { Injectable } from '@angular/core';

/**
 * Sonidos de apertura y de cierre (requisito excluyente R11).
 *
 * Dos archivos DISTINTOS: uno al abrir la aplicación y otro al cerrarla.
 *
 * FALTAN LOS ARCHIVOS. Hay que dejar dos `.mp3` cortos en
 * `public/sonidos/` con estos nombres exactos:
 *
 *   public/sonidos/apertura.mp3
 *   public/sonidos/cierre.mp3
 *
 * El de cierre tiene que durar **menos de 400 milisegundos**. Cuando
 * Android suspende la aplicación puede matar el proceso antes de que
 * termine de sonar; un audio corto es lo único que garantiza que se
 * escuche. Mientras los archivos no estén, este servicio no hace nada y
 * no rompe: por eso cada reproducción va dentro de un try.
 *
 * POR QUÉ NO SE USA UN PLUGIN NATIVO
 * `@capacitor-community/native-audio` es más confiable para el sonido de
 * cierre, pero agrega una dependencia nativa. Con `Audio` del navegador
 * anda igual dentro de la webview y también en el sitio de Vercel, que
 * es donde el equipo prueba a diario. Si el sonido de cierre se corta en
 * el celular, ese es el momento de cambiar al plugin.
 */
@Injectable({ providedIn: 'root' })
export class SonidosService {
  private apertura?: HTMLAudioElement;
  private cierre?: HTMLAudioElement;
  private yaSono = false;

  /**
   * Se llama una sola vez, al arrancar. Precarga los dos audios para que
   * el de cierre no tenga que descargarse justo cuando la aplicación se
   * está yendo a segundo plano.
   */
  preparar(): void {
    this.apertura = this.cargar('sonidos/apertura.mp3');
    this.cierre = this.cargar('sonidos/cierre.mp3');
  }

  /**
   * El navegador bloquea el audio hasta que la persona toca la pantalla,
   * así que esto se dispara al terminar la presentación animada, que es
   * el primer momento en que hubo interacción.
   */
  sonarApertura(): void {
    if (this.yaSono) {
      return;
    }
    this.yaSono = true;
    this.reproducir(this.apertura);
  }

  sonarCierre(): void {
    this.reproducir(this.cierre);
  }

  private cargar(ruta: string): HTMLAudioElement | undefined {
    try {
      const audio = new Audio(ruta);
      audio.preload = 'auto';
      audio.load();
      return audio;
    } catch {
      return undefined;
    }
  }

  /**
   * Si el archivo no existe, si el navegador bloqueó la reproducción
   * automática o si el dispositivo está en silencio, no pasa nada. Un
   * sonido que no suena no puede tumbar la aplicación.
   */
  private reproducir(audio?: HTMLAudioElement): void {
    if (!audio) {
      return;
    }
    try {
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    } catch {
      // Sin sonido; la aplicación sigue igual.
    }
  }
}
