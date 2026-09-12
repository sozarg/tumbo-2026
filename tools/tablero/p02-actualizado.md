**Perfil:** cocinero. Dispositivo 2.

### Lo que pide el enunciado
- [x] Campos: nombre, descripción, tiempo de elaboración en minutos, precio
- [x] **Tres (3) fotos** tomadas del dispositivo (acá sí se admite la galería)
- [x] Las fotos en contenedores individuales, con buen tamaño, centradas, sin mostrar partes de otras, con posibilidad de elegir otra
- [x] Validar TODOS los campos
- [x] Verificar que el plato aparece en la carta

---

### Lo que había

El formulario tenía nombre, descripción, minutos, precio y tipo, **todos con `Validators.required` a secas** (más un `min(1)` en minutos y precio) y un único mensaje genérico: *"Completá los datos: nombre, descripción, tiempo y precio válidos."*

De fotos había **una sola y opcional**, elegida con un `<input type="file">` —solo archivos, sin cámara— y se subía a `producto_fotos` con `orden: 1`. Los lugares 2 y 3 no se llenaban nunca.

De la existencia en la carta **no se verificaba nada**: un nombre repetido chocaba contra el `unique (tipo, nombre)` de la base y volvía como *"No se pudo guardar datos"*.

---

### Hecho

**Las validaciones, una por campo.** `enteroValido` en minutos (un plato no tarda 12,5 minutos), `precioValido` con como mucho dos decimales y tope, espejando el `numeric(10,2)` de la columna, y largos mínimos y máximos de `core/validacion`. Cada error sale **debajo de su campo**, y el cartel de confirmación no se abre si el formulario no da.

**Las tres fotos.** Son tres lugares fijos y no una lista que crece, porque `producto_fotos` ya venía con `orden smallint check (orden between 1 and 3)` y único por (producto, orden): **la tabla estaba diseñada para exactamente tres desde el día uno**, solo que el código usaba una. La posición en el arreglo ES el `orden` en la base, así que cambiar una sola foto reemplaza esa y no corre las demás.

Se suben las tres en paralelo —el alta tarda lo que la más lenta y no la suma— y se asocian en un solo `upsert`.

**De dónde salen.** `CameraSource.Prompt`: el teléfono pregunta cámara o galería. El enunciado los distingue a propósito — para el empleado dice que la foto «se tomará desde el dispositivo (no se tiene que elegir desde la galería)» y para el producto dice «tres fotos tomadas del dispositivo (se podrá optar por la elección de imágenes de la galería)». Son dos métodos distintos del mismo servicio: `sacarFoto()` y `elegirImagen()`.

**Cómo se ven.** Cada frase del enunciado es una decisión:

- *contenedores individuales* → un contenedor por lugar, con su propio borde
- *buen tamaño* → **una abajo de la otra en el teléfono** (362×272 px medidos), tres en fila recién a partir de 620 px. Tres en fila sobre 360 px de ancho dan 100 px por foto: la comida no se ve.
- *sin que se muestren partes de otras* → `overflow: hidden`; sin eso el `border-radius` deja que la imagen se derrame y toque a la vecina
- *centradas* → `object-fit: cover` con `object-position: center`. Una foto de celular es vertical y el contenedor apaisado: `cover` recorta en vez de deformar, y recorta desde el centro, que es donde está el plato.
- *posibilidad de elegir otra* → el contenedor lleno ES un botón: se toca la foto y se vuelve a abrir la cámara o la galería. El tacho la deja vacía.

Está en su propia hoja, `operacion-fotos.component.scss`: `operacion.component.scss` ya está en 24,4 kB contra un presupuesto de 30 y es el archivo que más manos toca. El presupuesto de Angular se mide por hoja, así que un segundo archivo da aire de verdad y evita un conflicto seguro en el próximo merge.

**Se verifica la existencia en la carta.** Antes de insertar se busca por (tipo, nombre), **sin distinguir mayúsculas ni espacios de más**, y el nombre se guarda ya normalizado para que el único de la base signifique lo que uno cree que significa: `Milanesa napolitana` y `Milanesa napolitana ` —con un espacio al final, invisible— son dos platos distintos para PostgreSQL. La edición hace el mismo control excluyéndose a sí misma.

El nombre solo choca dentro de su propio tipo, porque la base tiene `unique (tipo, nombre)` y no `unique (nombre)`: una *Limonada* plato y una *Limonada* bebida son dos cosas distintas de la carta.

**El plato dado de baja ya no bloquea el nombre.** `eliminarProducto` no borra: apaga `activo`, y `cargar()` solo trae los activos. Pero el único de la base no sabe de eso y sigue ocupando el nombre. Sin control, volver a cargar un plato que alguien sacó de la carta pasaba la pantalla, llegaba al `insert` y volvía como *"No se pudo guardar datos"*: el nombre tomado por algo que no se ve en ningún lado, sin salida. Ahora la consulta incluye los inactivos y, si el plato estaba dado de baja, **vuelve a la carta con los datos nuevos** y te avisa.

---

### De paso: la pantalla iba una foto atrasada

Medido en un navegador de verdad, cargando las tres seguidas:

```
elegir foto 1 → valor [F,_,_]   pantalla [llena, vacía, vacía] ✓
elegir foto 2 → valor [F,F,_]   pantalla [llena, VACÍA, vacía] ✗
elegir foto 3 → valor [F,F,F]   pantalla [llena, llena, VACÍA] ✗
```

El valor del control siempre estuvo bien: lo que no se ejecutaba era la detección de cambios. Angular marca para revisar la vista que **atiende** un evento; el clic en el botón la marca, pero la foto no llega en el clic —llega cuando se resuelve la promesa del selector— y ahí ya no hay evento. Recién el clic siguiente dibujaba lo elegido la vez anterior. Para quien carga el producto eso se ve como que el segundo intento no anduvo.

La plantilla ahora lee una señal. El control sigue siendo el que valida; lo único que cambió es quién le cuenta a la pantalla. **La foto del empleado tenía el mismo problema** y no se notaba porque es una sola — ver P01.

---

### Detalle

Las tres fotos son obligatorias **en el alta** y no en la edición: ahí los lugares vacíos significan «esta no la cambié» y `guardarFotosDelProducto` los saltea. Sin eso, cambiarle el precio a un plato obligaba a volver a sacar las tres fotos.

### Probado

Con Playwright contra la aplicación corriendo: validaciones campo por campo, carga y reemplazo de las tres fotos, alta repetida rechazada con el nombre escrito distinto, alta nueva con el nombre normalizado, y edición sin volver a pedir las fotos. 12 pruebas nuevas en `operacion.service.spec.ts`.

### Falta

Nada del enunciado. Queda la corrida en el APK para ver el menú de cámara/galería del sistema.
