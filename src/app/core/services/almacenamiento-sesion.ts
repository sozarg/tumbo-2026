/**
 * Dónde guarda Supabase el token de la sesión.
 *
 * Por qué existe este archivo en lugar de dejar el valor por defecto:
 * supabase-js usa `localStorage` directamente, y eso rompe en dos
 * situaciones que sí nos tocan. Una, si el navegador tiene el
 * almacenamiento bloqueado, el acceso tira excepción y la aplicación no
 * arranca. Dos, dentro de la webview de Capacitor el sistema puede
 * limpiar `localStorage` y la persona aparece deslogueada sin motivo,
 * habitualmente en el peor momento.
 *
 * Envolverlo detrás de esta interfaz nos deja cambiar el soporte sin
 * tocar nada más.
 *
 * En Android usa `@capacitor/preferences`, que guarda en el
 * almacenamiento del sistema y no lo limpia la webview. En el navegador
 * sigue usando `localStorage`. La decisión se toma una sola vez, al
 * arrancar, mirando si hay plataforma nativa.
 *
 * `limpiar()` existe para el requisito excluyente R13: al cerrar sesión
 * hay que poder verificar que no quedó ninguna credencial guardada. Sin
 * esta función habría que conocer las claves de supabase-js desde
 * afuera, que es justo lo que este archivo evita.
 */
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
export interface AlmacenamientoSesion {
  getItem(clave: string): Promise<string | null>;
  setItem(clave: string, valor: string): Promise<void>;
  removeItem(clave: string): Promise<void>;
  /** Borra TODO lo que se guardó desde acá. Se usa al cerrar sesión. */
  limpiar(): Promise<void>;
}

/** Dentro del APK; en el navegador da false. */
const enAndroid = Capacitor.isNativePlatform();

/**
 * Las claves que se escribieron en esta ejecución. Se lleva la cuenta
 * para poder borrarlas todas sin adivinar cómo las nombra supabase-js,
 * que cambia el prefijo entre versiones.
 */
const clavesEscritas = new Set<string>();

function disponible(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    // Algunos navegadores exponen el objeto pero fallan al escribir
    // (modo privado, cookies bloqueadas). Se comprueba de verdad.
    const sonda = '__tumbo__';
    window.localStorage.setItem(sonda, '1');
    window.localStorage.removeItem(sonda);
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Reemplazo en memoria: la sesión dura lo que dura la pestaña. */
const enMemoria = new Map<string, string>();

export const almacenamientoSesion: AlmacenamientoSesion = {
  async getItem(clave: string): Promise<string | null> {
    if (enAndroid) {
      try {
        const { value } = await Preferences.get({ key: clave });
        return value ?? null;
      } catch {
        return enMemoria.get(clave) ?? null;
      }
    }

    const soporte = disponible();
    if (!soporte) {
      return enMemoria.get(clave) ?? null;
    }
    try {
      return soporte.getItem(clave);
    } catch {
      return enMemoria.get(clave) ?? null;
    }
  },

  async setItem(clave: string, valor: string): Promise<void> {
    enMemoria.set(clave, valor);
    clavesEscritas.add(clave);

    if (enAndroid) {
      try {
        await Preferences.set({ key: clave, value: valor });
      } catch {
        // Queda solo en memoria; la sesión sigue viva mientras la
        // aplicación esté abierta.
      }
      return;
    }

    const soporte = disponible();
    if (!soporte) {
      return;
    }
    try {
      soporte.setItem(clave, valor);
    } catch {
      // Queda solo en memoria; la sesión sigue viva en esta pestaña.
    }
  },

  async removeItem(clave: string): Promise<void> {
    enMemoria.delete(clave);
    clavesEscritas.delete(clave);

    if (enAndroid) {
      try {
        await Preferences.remove({ key: clave });
      } catch {
        // Nada que hacer: ya se borró la copia en memoria.
      }
      return;
    }

    const soporte = disponible();
    if (!soporte) {
      return;
    }
    try {
      soporte.removeItem(clave);
    } catch {
      // Nada que hacer: ya se borró la copia en memoria.
    }
  },

  /**
   * R13: no alcanza con que supabase-js borre su token. Se limpia todo
   * lo que pasó por acá, por si quedó una clave de una versión anterior
   * de la biblioteca con otro prefijo.
   */
  async limpiar(): Promise<void> {
    const claves = [...clavesEscritas];
    enMemoria.clear();
    clavesEscritas.clear();

    if (enAndroid) {
      try {
        await Preferences.clear();
      } catch {
        // Se intenta igual clave por clave más abajo.
      }
    }

    const soporte = disponible();
    for (const clave of claves) {
      try {
        soporte?.removeItem(clave);
      } catch {
        // Sin soporte de almacenamiento no hay nada que borrar.
      }
    }

    // Barrido final: cualquier clave de supabase-js que haya quedado de
    // una sesión anterior a esta ejecución.
    if (soporte) {
      try {
        for (const clave of Object.keys(soporte)) {
          if (clave.startsWith('sb-') || clave.startsWith('tumbo.')) {
            soporte.removeItem(clave);
          }
        }
      } catch {
        // Nada que hacer.
      }
    }
  },
};
