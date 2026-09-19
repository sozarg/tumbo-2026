import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { DatosDeDni, leerCodigoDeDni } from '../dni/codigo-de-dni';

/** Lectura óptica nativa de QR y PDF417; en web se informa la limitación sin inventar personas. */

/** Qué salió de intentar leer un documento. */
export type ResultadoDeLectura =
  /** Se leyó un DNI y se entendió. `simulado` distingue APK de navegador. */
  | {
      readonly estado: 'leido';
      readonly datos: DatosDeDni;
      readonly simulado: boolean;
      readonly formato?: 'QR' | 'PDF417';
    }
  /** La persona cerró el lector sin apuntar a nada. No es un error. */
  | { readonly estado: 'cancelado' }
  /** Se leyó un código, pero no era un DNI: un QR de mesa, de propina, otra cosa. */
  | { readonly estado: 'otro-codigo' }
  | { readonly estado: 'malformado' }
  /** No se pudo ni empezar: sin permiso, sin cámara, sin el módulo de Google. */
  | { readonly estado: 'error'; readonly mensaje: string };

const FORMATOS = [BarcodeFormat.Pdf417, BarcodeFormat.QrCode];

@Injectable({ providedIn: 'root' })
export class LectorDeDni {
  /** Indica si está disponible el recorrido óptico nativo. */
  readonly esReal = Capacitor.isNativePlatform();

  async leer(): Promise<ResultadoDeLectura> {
    if (!this.esReal) {
      return {
        estado: 'error',
        mensaje:
          'El lector óptico requiere la aplicación Android. Podés completar los datos manualmente.',
      };
    }

    try {
      const listo = await this.prepararse();
      if (listo.estado === 'error') return listo;
      const { barcodes } = await BarcodeScanner.scan({ formats: FORMATOS });

      // El lector devuelve la lista vacía cuando la persona sale con el
      // botón de atrás. Es salida normal, no falla.
      if (barcodes.length === 0) {
        return { estado: 'cancelado' };
      }

      for (const codigo of barcodes) {
        const datos = leerCodigoDeDni(codigo.rawValue ?? '');
        if (datos) {
          return {
            estado: 'leido',
            datos,
            simulado: false,
            formato: codigo.format === BarcodeFormat.QrCode ? 'QR' : 'PDF417',
          };
        }
      }

      return barcodes.some((c) => (c.rawValue ?? '').split('@').length >= 5)
        ? { estado: 'malformado' }
        : { estado: 'otro-codigo' };
    } catch (error) {
      if (/cancel/i.test(error instanceof Error ? error.message : String(error)))
        return { estado: 'cancelado' };
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
}
