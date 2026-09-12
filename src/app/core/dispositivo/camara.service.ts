import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

/**
 * Saca la foto de una persona con la cámara del teléfono (punto 1).
 *
 * POR QUÉ CÁMARA Y NO GALERÍA
 * El enunciado es explícito: la foto del empleado se TOMA, no se elige.
 * Por eso va `CameraSource.Camera` y no `Prompt`, que es el valor por
 * defecto y le ofrece a la persona elegir de la galería. Con `Prompt`
 * la pantalla se vería igual y el requisito no se cumpliría, que es la
 * peor combinación posible.
 *
 * Para productos sí vale la galería, y ahí se usa el `<input type=file>`
 * que ya existe. Son requisitos distintos del mismo enunciado.
 *
 * QUÉ PASA EN EL NAVEGADOR
 * `Camera.getPhoto` con `CameraSource.Camera` no funciona en la web sin
 * los componentes de Ionic PWA. En vez de sumar esa dependencia solo
 * para la demostración, en el navegador se abre un selector de archivo y
 * el resultado viene marcado como `simulada`. La pantalla lo aclara, con
 * el mismo criterio que el lector de DNI: en el APK es de verdad, en la
 * web alcanza para probar el resto del alta.
 */

/**
 * La foto y de dónde salió.
 *
 * `file` y `previewUrl` se llaman igual que en `ImagenProducto` para que
 * el servicio de alta las trate igual, vengan de la cámara o del
 * selector de archivo de productos.
 */
export interface FotoTomada {
  /** Lista para subir. Siempre una imagen. */
  readonly file: File;
  /** URL local para mostrarla antes de subirla. Hay que revocarla al descartar. */
  readonly previewUrl: string;
  /** `false` solo en el APK, con la cámara de verdad. */
  readonly simulada: boolean;
}

export type ResultadoDeFoto =
  | { readonly estado: 'tomada'; readonly foto: FotoTomada }
  /** Cerró la cámara sin sacar nada. No es un error. */
  | { readonly estado: 'cancelado' }
  | { readonly estado: 'error'; readonly mensaje: string };

/** Suficiente para una foto de legajo, y no tanto como para tardar en subir. */
const LADO_MAXIMO = 1024;
const CALIDAD = 80;

@Injectable({ providedIn: 'root' })
export class Camara {
  /** `true` cuando la foto se saca de verdad; `false` cuando se va a elegir un archivo. */
  readonly esReal = Capacitor.isNativePlatform();

  async sacarFoto(): Promise<ResultadoDeFoto> {
    if (!this.esReal) {
      return this.elegirArchivo();
    }

    try {
      const permiso = await Camera.requestPermissions({ permissions: ['camera'] });
      if (permiso.camera !== 'granted' && permiso.camera !== 'limited') {
        return {
          estado: 'error',
          mensaje:
            'Para sacar la foto hace falta permiso de cámara. ' +
            'Se habilita en Ajustes › Aplicaciones › Tumbito › Permisos.',
        };
      }

      const foto = await Camera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        // No se guarda en el carrete: es la foto de un legajo, no del
        // teléfono de quien la saca.
        saveToGallery: false,
        allowEditing: false,
        width: LADO_MAXIMO,
        quality: CALIDAD,
      });

      if (!foto.webPath) {
        return { estado: 'error', mensaje: 'La cámara no devolvió ninguna imagen.' };
      }

      const datos = await fetch(foto.webPath).then((r) => r.blob());
      const extension = foto.format || 'jpeg';

      return {
        estado: 'tomada',
        foto: {
          file: new File([datos], `foto.${extension}`, {
            type: datos.type || `image/${extension}`,
          }),
          previewUrl: foto.webPath,
          simulada: false,
        },
      };
    } catch (error) {
      // El plugin tira una excepción cuando la persona sale con el botón
      // de atrás. Eso no es una falla, así que no se muestra como tal.
      return this.cancelo(error)
        ? { estado: 'cancelado' }
        : { estado: 'error', mensaje: 'No se pudo sacar la foto.' };
    }
  }

  /** ¿La excepción del plugin fue "salí sin sacar nada"? */
  private cancelo(error: unknown): boolean {
    const mensaje =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return (
      mensaje.includes('cancel') || mensaje.includes('cancelled') || mensaje.includes('canceled')
    );
  }

  /**
   * El reemplazo del navegador: un selector de archivo.
   *
   * `capture="user"` hace que en un celular con navegador se abra
   * directamente la cámara frontal; en una computadora el atributo se
   * ignora y se abre el explorador de archivos. En los dos casos el
   * resultado queda marcado como simulado.
   */
  private elegirArchivo(): Promise<ResultadoDeFoto> {
    return new Promise((resolver) => {
      const entrada = document.createElement('input');
      entrada.type = 'file';
      entrada.accept = 'image/jpeg,image/png,image/webp';
      entrada.capture = 'user';

      // Si la persona cierra el diálogo sin elegir nada, `change` no se
      // dispara nunca. `cancel` sí, y si el navegador no lo soporta la
      // promesa simplemente queda esperando sin romper nada.
      entrada.addEventListener('cancel', () => resolver({ estado: 'cancelado' }));

      entrada.addEventListener('change', () => {
        const archivo = entrada.files?.[0];
        if (!archivo) {
          resolver({ estado: 'cancelado' });
          return;
        }

        resolver({
          estado: 'tomada',
          foto: {
            file: archivo,
            previewUrl: URL.createObjectURL(archivo),
            simulada: true,
          },
        });
      });

      entrada.click();
    });
  }
}
