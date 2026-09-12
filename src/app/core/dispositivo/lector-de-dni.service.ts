import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { DatosDeDni, leerCodigoDeDni } from '../dni/codigo-de-dni';
import { inventarPersona } from '../demo/generador-de-personas';
import { cuilDeDni } from '../validacion/cuil';

/**
 * Lee el documento de una persona con la cámara (punto 1 y punto 5).
 *
 * QUÉ FORMATOS BUSCA
 * PDF417, que es el que trae de verdad el DNI argentino, y QR, porque el
 * enunciado lo nombra así y porque cuesta cero pedirle los dos al lector.
 * Cualquier otro código de barras se ignora: no queremos que el lector
 * "encuentre" el código de una gaseosa que quedó atrás en la mesa.
 *
 * QUÉ PASA EN EL NAVEGADOR
 * ML Kit es nativo: en el navegador no existe. En vez de romper o de
 * esconder el botón, se simula la lectura con una persona inventada,
 * igual que venía haciendo el botón "Simular lector de DNI". Eso importa
 * más de lo que parece: sin simulación el alta no se puede probar en
 * `ng serve` ni en Vercel, y no todos en el equipo tienen el APK a mano.
 *
 * El resultado dice `simulado: true` en ese caso, y la pantalla lo
 * aclara. Nunca se hace pasar una simulación por una lectura real.
 */

/** Qué salió de intentar leer un documento. */
export type ResultadoDeLectura =
  /** Se leyó un DNI y se entendió. `simulado` distingue APK de navegador. */
  | { readonly estado: 'leido'; readonly datos: DatosDeDni; readonly simulado: boolean }
  /** La persona cerró el lector sin apuntar a nada. No es un error. */
  | { readonly estado: 'cancelado' }
  /** Se leyó un código, pero no era un DNI: un QR de mesa, de propina, otra cosa. */
  | { readonly estado: 'otro-codigo' }
  /** No se pudo ni empezar: sin permiso, sin cámara, sin el módulo de Google. */
  | { readonly estado: 'error'; readonly mensaje: string };

const FORMATOS = [BarcodeFormat.Pdf417, BarcodeFormat.QrCode];

@Injectable({ providedIn: 'root' })
export class LectorDeDni {
  /** `true` cuando la lectura es de verdad; `false` cuando se va a simular. */
  readonly esReal = Capacitor.isNativePlatform();

  async leer(): Promise<ResultadoDeLectura> {
    if (!this.esReal) {
      return { estado: 'leido', datos: this.inventarLectura(), simulado: true };
    }

    const listo = await this.prepararse();
    if (listo.estado === 'error') {
      return listo;
    }

    try {
      const { barcodes } = await BarcodeScanner.scan({ formats: FORMATOS });

      // El lector devuelve la lista vacía cuando la persona sale con el
      // botón de atrás. Es salida normal, no falla.
      if (barcodes.length === 0) {
        return { estado: 'cancelado' };
      }

      for (const codigo of barcodes) {
        const datos = leerCodigoDeDni(codigo.rawValue ?? '');
        if (datos) {
          return { estado: 'leido', datos, simulado: false };
        }
      }

      return { estado: 'otro-codigo' };
    } catch {
      return {
        estado: 'error',
        mensaje: 'No se pudo leer el documento. Probá de nuevo con mejor luz.',
      };
    }
  }

  /**
   * Cámara, permiso y módulo, en ese orden.
   *
   * EL MÓDULO DE GOOGLE
   * En Android el lector no viene adentro de la aplicación: lo aporta
   * Google Play Services y se baja la primera vez. Si no está, `scan()`
   * falla con un error que no le dice nada a nadie. Por eso se pide la
   * instalación acá y se avisa que hay que esperar: es una sola vez por
   * teléfono, pero la primera vez confunde a cualquiera.
   */
  private async prepararse(): Promise<ResultadoDeLectura | { estado: 'listo' }> {
    const { supported } = await BarcodeScanner.isSupported();
    if (!supported) {
      return { estado: 'error', mensaje: 'Este teléfono no puede leer códigos.' };
    }

    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== 'granted' && camera !== 'limited') {
      return {
        estado: 'error',
        mensaje:
          'Para leer el DNI hace falta permiso de cámara. ' +
          'Se habilita en Ajustes › Aplicaciones › Tumbito › Permisos.',
      };
    }

    if (Capacitor.getPlatform() === 'android') {
      const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!available) {
        await BarcodeScanner.installGoogleBarcodeScannerModule();
        return {
          estado: 'error',
          mensaje:
            'Se está bajando el lector de códigos de Google. ' +
            'Esperá unos segundos y volvé a tocar el botón.',
        };
      }
    }

    return { estado: 'listo' };
  }

  /**
   * Una lectura de mentira, con la misma forma que una de verdad.
   *
   * El sexo no se inventa aparte: se deduce del CUIL que ya trae la
   * persona generada, para que el CUIL y el sexo no se contradigan.
   *
   * Y no se deduce mirando si empieza con 27, que es lo que sale primero
   * y está mal: cuando el resto del módulo 11 da 1 el prefijo pasa a ser
   * 23 para los dos sexos, así que una mujer quedaría marcada como
   * varón. Se compara contra el CUIL que le correspondería a una mujer,
   * que es exacto en los tres prefijos.
   */
  private inventarLectura(): DatosDeDni {
    const persona = inventarPersona();
    const sexo = cuilDeDni(persona.dni, 'F') === persona.cuil ? 'F' : 'M';

    return {
      nombres: persona.nombres,
      apellidos: persona.apellidos,
      dni: persona.dni,
      sexo,
      cuil: persona.cuil || cuilDeDni(persona.dni, sexo),
      // La persona inventada ya trae un correo único, igual que lo traen
      // los códigos de prueba: así la simulación del navegador y la
      // lectura del APK completan el formulario de la misma manera.
      correo: persona.correo,
    };
  }
}
