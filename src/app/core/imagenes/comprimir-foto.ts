/**
 * Achica y reencoda una foto antes de subirla.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ VIVE ACÁ Y NO ADENTRO DE UN SERVICIO
 *
 * La usan el alta de empleado, la de producto, la de mesa y la de
 * cliente. Estuvo un tiempo como método privado de `OperacionService`,
 * y cuando apareció una cuarta alta —la del cliente, que ni siquiera
 * pasa por ese servicio— la alternativa era copiarla.
 *
 * Copiarla es exactamente cómo aparecen los errores caros de este tipo.
 * Ya pasó una vez en este proyecto: el cliente comprimía a WebP y el
 * validador del servidor solo aceptaba JPEG o PNG, así que ninguna alta
 * con foto podía funcionar. Con una sola copia, el formato es una
 * decisión que se toma en un lugar.
 *
 * ───────────────────────────────────────────────────────────────────
 * POR QUÉ JPEG Y POR QUÉ 1400
 *
 * JPEG porque es lo que acepta `imagenSegura` en el servidor —JPEG o
 * PNG, hasta 4096 px y 16 megapíxeles— y porque las políticas de
 * Storage limitan los tipos permitidos.
 *
 * 1400 px de lado mayor es de sobra para una foto de legajo o de
 * producto, y deja el archivo bien abajo del tope de 5 MB. La cámara de
 * un teléfono moderno saca fotos de 4000 px y 4 MB: subirlas tal cual
 * es tiempo de espera que no compra nada.
 */
const LADO_MAXIMO = 1400;
const CALIDAD = 0.82;

export async function comprimirFoto(archivo: File): Promise<Blob> {
  if (!archivo.size || archivo.size > 5 * 1024 * 1024) {
    throw new Error('Foto: máximo 5 MB.');
  }

  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.max(1, Math.round(bitmap.width * escala));
  lienzo.height = Math.max(1, Math.round(bitmap.height * escala));
  lienzo.getContext('2d')?.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);

  // Sin esto el bitmap decodificado queda en memoria hasta que el
  // recolector se acuerde: son varios megabytes por foto.
  bitmap.close();

  return new Promise((resolver, rechazar) =>
    lienzo.toBlob(
      (salida) => (salida ? resolver(salida) : rechazar(new Error('compresión fallida'))),
      'image/jpeg',
      CALIDAD,
    ),
  );
}
