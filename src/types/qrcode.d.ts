/**
 * Los tipos de `qrcode`, acotados a lo que la aplicación usa.
 *
 * POR QUÉ ACÁ Y NO `@types/qrcode`
 * El paquete de tipos son 40 líneas de las que usamos una función, y
 * traerlo obliga a un `npm install` más en cada máquina del grupo. La
 * biblioteca ya está instalada; lo único que faltaba era decirle a
 * TypeScript qué forma tiene `toDataURL`.
 *
 * Si algún día se usa otra parte de la biblioteca —`toCanvas`,
 * `toString`— se agrega la firma acá abajo, o se cambia por el paquete
 * oficial. Lo que NO hay que hacer es poner `any`: el objetivo de este
 * archivo es que el compilador revise las opciones que le pasamos.
 */
declare module 'qrcode' {
  export interface OpcionesDeQr {
    /** Ancho del PNG en píxeles. */
    width?: number;
    /** Módulos de silencio alrededor del dibujo. */
    margin?: number;
    /** Cuánto daño tolera el código antes de dejar de leerse. */
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    color?: {
      /** Color de los módulos, en #rrggbbaa. */
      dark?: string;
      /** Color del fondo, en #rrggbbaa. */
      light?: string;
    };
  }

  /** Dibuja el código y lo devuelve como `data:image/png;base64,...`. */
  export function toDataURL(contenido: string, opciones?: OpcionesDeQr): Promise<string>;

  /**
   * El mismo módulo, colgado de `default`.
   *
   * `qrcode` es CommonJS, y cómo se ve desde un `import()` depende de
   * quién lo empaquete: el servidor de desarrollo deja las funciones
   * como exports nombrados, y el paquete optimizado —el que va adentro
   * del APK— las deja acá abajo. Declarar las dos formas es lo que
   * permite que `comoPng` se sirva de cualquiera sin castear a `any`.
   */
  const qrcode: { readonly toDataURL: typeof toDataURL };
  export default qrcode;
}
