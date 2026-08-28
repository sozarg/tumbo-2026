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
 * PENDIENTE (cuando se agregue la plataforma Android con `npx cap add
 * android`): instalar `@capacitor/preferences` y reemplazar el cuerpo
 * de las tres funciones por `Preferences.get/set/remove`. La interfaz
 * ya es asíncrona justamente para que ese cambio no obligue a tocar
 * ningún otro archivo. Hoy no se instala porque todavía no hay
 * plataforma nativa y agregaría una dependencia sin uso real.
 */
export interface AlmacenamientoSesion {
  getItem(clave: string): Promise<string | null>;
  setItem(clave: string, valor: string): Promise<void>;
  removeItem(clave: string): Promise<void>;
}

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
};
