**Perfil:** dueño o supervisor. Dispositivo 4.

### Lo que pide el enunciado
- [x] Campos: número, cantidad de comensales, tipo (VIP, estándar, movilidad reducida)
- [x] Disponibilidad: la mesa nace **vacía**, sin que haya que elegirlo
- [x] **Foto tomada desde el dispositivo** (cámara, no galería)
- [x] La foto en contenedor individual, con buen tamaño y centrada
- [x] Validar TODOS los campos
- [x] Se verifica la existencia de la nueva mesa (listado)
- [x] **Generar el código QR correspondiente de forma automática**
- [x] Gestión de mesas con posibilidad de modificar la disponibilidad

---

### El código QR

El `qr_token` lo genera PostgreSQL al insertar la fila, con su propio `default`. Lo que faltaba era **poder verlo**: el alta avisaba que el QR estaba listo y después no aparecía en ninguna pantalla.

Antes había una rama que armaba `imagenes/qr-mesa-${numero}.png`. Fallaba de dos maneras y las dos importaban: la mesa nueva pedía un archivo que no existe, y el contenido de esos cinco PNG hechos a mano es el token del modo demostración, que contra la base de verdad no encuentra ninguna mesa. Esa rama se borró.

Ahora `CodigoQrService` lo dibuja a partir del `qr_token` de la fila, con el formato `TUMBO://mesa/<token>` —el mismo que esperaba el lector—. Se ve en un cartel con el número, el tipo y la cantidad de comensales, y se puede bajar como PNG de 512 px para imprimirlo y pegarlo en la mesa.

La descarga es un `<a download>`: anda en la web, que es desde donde se imprime. **En el APK el botón directamente no aparece**, en vez de aparecer y no hacer nada. Bajarlo desde el teléfono necesitaría `@capacitor/filesystem` más `@capacitor/share`, dos plugins nativos que el proyecto hoy no tiene y que no hacen falta para el uso real.

---

### El bug que solo se veía en el APK

El QR se dibujaba en el navegador y fallaba en el teléfono con *«No se pudo dibujar el código»*.

`qrcode` es CommonJS, y cómo llega desde un `import()` depende de quién lo empaquete: el servidor de desarrollo lo entrega con las funciones como exports nombrados, y el paquete **optimizado** —el que va adentro del APK— las deja colgando de `default`. Así que `toDataURL` era `undefined`.

Es el peor tipo de error: no aparece en la pantalla donde se desarrolla y sí en la que se entrega. Se había verificado en `ng serve` dando por sentado que el APK se comportaba igual. Ahora el servicio se sirve de cualquiera de las dos formas, y el `.d.ts` declara las dos para no castear a `any`.

El `catch` que lo envolvía era mudo: la pantalla decía «no se pudo dibujar» y nada más, y encontrar la causa costó agregar un log a mano y recompilar. Quedó un `console.error` con prefijo `[TUMBO]`, el mismo criterio que `registrarError`.

---

### Extras que no pide el enunciado

**Modificar y sacar mesas del salón.** El enunciado solo pide modificar la disponibilidad. Sin esto no hay forma de probar el alta sin dejar el salón lleno de mesas de prueba, ni de reconfigurar el salón partiendo una mesa grande en dos chicas.

El borrado es seguro por construcción: `sesiones_mesa.mesa_id` y `lista_espera.mesa_id` apuntan a `mesas` **sin** `on delete cascade`, así que PostgreSQL se niega a borrar una mesa con historial. Lo peor que puede pasar es que el borrado se rechace, y eso se traduce a un mensaje entendible en vez de un `23503` crudo.

---

### Probado

**Automático:** 187 pruebas en verde.

**En el navegador:**

- [x] Número en 0 y en 1000 → rechazados, nombrando el límite
- [x] Comensales en 0 y en 25 → rechazados (el tope de 20 es de la base)
- [x] Número repetido → «Ya existe la mesa N», sin llegar al insert
- [x] Sin foto → no deja confirmar
- [x] Ocupar y liberar
- [x] El QR se lee y su contenido coincide con el `qr_token` de la fila

**En el APK (dispositivo 4):**

- [x] Alta con la foto tomada con la **cámara de verdad**
- [x] La foto en su contenedor, centrada
- [x] El QR se dibuja; el cartel muestra solo «Cerrar», sin «Descargar»
- [x] El listado no corta tarjetas y se recalcula al girar el teléfono

---

### El listado

Mostraba **una mesa por pantalla** y dejaba el resto vacío. El enunciado tiene dos figuras en contra: *«Creación de listados»* admite «n elementos pero sin cortar, según la complejidad de los elementos», y *«Distribución de elementos»* marca como mala la pantalla que deja espacio vacío abajo.

Con un número fijo no se puede cumplir con las dos a la vez: 3 fijo no corta nada pero deja media pantalla vacía en un teléfono grande, y 5 fijo la llena y corta la última en el chico. Ahora se mide el alto disponible y el de una tarjeta ya dibujada, y se deriva cuántas entran, contando las columnas de la grilla. Medido: **2** en 360×640, **3** en 412×915 y **5** en 900×900 con dos columnas, cero cortadas.

La foto va **al costado** y no arriba: puesta arriba y a lo ancho, la tarjeta con foto medía 238 px contra 158 las que no tenían, la grilla quedaba despareja y dejaban de entrar sin cortarse.

---

### Falta

- [ ] **El formulario propone el número 1**, que siempre existe, así que el primer «Crear mesa» responde «Ya existe la mesa 1». La causa está en el `effect` del constructor, que resetea `mesaForm` con `numero: 1` fijo; `proximoNumeroDeMesa()` existe pero ese camino la saltea.
- [ ] **Modificar una mesa sin foto previa** lo rechaza el servidor con «La mesa necesita una foto para guardar los cambios». Afecta a las mesas anteriores a que existiera la foto.
