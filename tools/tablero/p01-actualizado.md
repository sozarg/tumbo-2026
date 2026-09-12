**Perfiles habilitados:** dueño o supervisor. Dispositivo 1.

### Lo que pide el enunciado
- [x] Campos: nombres, apellidos, DNI, CUIL, correo, **contraseña** y perfil cocinero
- [x] Foto personal **tomada con la cámara** (no elegida de la galería)
- [x] Lector del código del DNI que complete los campos solos
- [x] Validar TODOS los campos: formatos, vacíos, tipos de dato
- [x] Verificar la lectura del código del DNI

---

### Hecho

**El alta funciona de verdad.** Antes `registrarEmpleado()` era un mock explícito: no escribía nada. No podía: crear una cuenta en `auth.users` con su contraseña necesita la clave `service_role`, y esa clave no puede viajar dentro del APK.

Se resolvió con la Edge Function `supabase/functions/crear-empleado`, que corre del lado del servidor y cuida tres cosas:

1. **Quién llama** — solo `dueno` o `supervisor` aprobados, leyendo el perfil de `public.usuarios` y no del token.
2. **Qué perfil se puede crear** — solo los cuatro de empleado. Un supervisor no puede fabricarse un `dueno`.
3. **Los errores** — traduce los CHECK de PostgreSQL a castellano, y chequea el duplicado ANTES de llamar a `createUser`. GoTrue envuelve las fallas de trigger en un opaco *"Database error creating new user"*; ahora un DNI o un correo repetido dicen cuál de los dos es.

**Los campos que faltaban.** Se agregó la contraseña y la opción *metre*, que no estaba entre los perfiles.

**Las validaciones, espejando la base.** Antes eran de mentira: `Validators.minLength(7)` para el DNI dejaba pasar `abcdefg`. Ahora cada validador se corresponde con un CHECK de `public.usuarios`, y hay una prueba que compara los dos lados con los mismos casos.

Sobre el CUIL:
- Formato (11 dígitos, guiones opcionales)
- **Dígito verificador** — algoritmo módulo 11, así que un CUIL inventado se detecta
- **Coherencia con el DNI** — los ocho dígitos del medio del CUIL son el DNI

El DNI y el CUIL además **filtran lo que se tipea**: no dejan escribir una letra.

**Los mensajes de error se ven.** Antes el error y el éxito compartían el mismo cartel verde con un tilde, así que un fallo se mostraba con cara de "listo". Ahora son dos controles distintos: el éxito es un toast que se va solo, el error es un cartel rojo con `role="alert"`, que vibra y al que la pantalla se desplaza sola.

---

### La foto, con la cámara

`core/dispositivo/camara.service.ts`, sobre `@capacitor/camera`. Va con `CameraSource.Camera` y **no** con `Prompt`, que es el valor por defecto y ofrece la galería: el enunciado dice que la foto del empleado **se toma**, no se elige. Con `Prompt` la pantalla se vería igual y el requisito no se cumpliría, que es la peor combinación posible.

- Pide permiso y explica dónde habilitarlo si se denegó.
- Sale con el botón de atrás → *cancelado*, no *error*.
- La imagen se comprime a WebP antes de subirse a Storage (`fotos-usuarios`).
- En el navegador se cae a un selector de archivo y el resultado queda marcado como **simulado**, con el aviso en pantalla. En el APK es la cámara de verdad.
- **La foto es obligatoria**: está como control del formulario con el validador `fotoRequerida`, no como un `signal` suelto al costado. Sin eso se podía dar de alta un empleado sin foto.

Ver también E1.

---

### La lectura del código del DNI

`core/dispositivo/lector-de-dni.service.ts` + `core/dni/codigo-de-dni.ts`, sobre `@capacitor-mlkit/barcode-scanning`.

**El DNI argentino trae un PDF417, no un QR.** El lector busca los dos formatos (`BarcodeFormat.Pdf417` y `BarcodeFormat.QrCode`), así que sirve tanto para un documento real como para los códigos de prueba.

El parser **se ancla en el campo de sexo** y no en posiciones fijas: hay dos variantes del formato dando vueltas (la vieja arranca con el trámite, la nueva mete un campo de más) y contar posiciones desde el principio falla con una de las dos. Devuelve nombres, apellidos, DNI, sexo, CUIL y correo, y si el código no trae el CUIL lo deriva del DNI con el módulo 11.

**Los códigos de prueba.** `npm run qr:dni` genera 12 QR con **personas inventadas** en el formato real del documento, en `docs/qr-dni-de-prueba/` (con su `hoja.html` para imprimir). Son DNIs del rango 95.000.000–99.999.999, que no está asignado.

Se hizo así para no gastar los cuatro DNI reales del grupo en las demostraciones. Lo importante: **la aplicación no puede distinguirlos de uno real**, porque están en el mismo formato y no hay ninguna rama "si es de prueba". O sea que probar con estos ejercita el camino de lectura de verdad, de punta a punta.

**Pruebas:** `codigo-de-dni.spec.ts` cubre las dos variantes del formato, el CUIL con dígito mal y el correo escapado como `%40` (la arroba es EL separador del formato, así que un correo sin escapar partía el campo en dos). `qr-de-prueba.spec.ts` importa el generador para que las dos copias del módulo 11 no se puedan separar en silencio.

---

### De yapa: la baja de empleado

**No la pide el enunciado en este punto**, pero estaba en la pantalla y no funcionaba, así que se arregló acá.

Lo que había era esto:

```ts
await this.cliente.from('usuarios').delete().eq('id', id);
```

y la aplicación avisaba «empleado eliminado». **No eliminaba nada.** En todo el esquema no hay una sola política `for delete`: con RLS activo y sin política, PostgreSQL deniega el borrado, pero PostgREST no devuelve error — devuelve éxito con cero filas. El código solo miraba `resultado.error`, así que «no borré nada» y «borré» eran indistinguibles. La persona desaparecía de la pantalla hasta que alguien recargaba, y volvía.

Se podía agregar una política de borrado y listo. No alcanzaba: borrar solo `public.usuarios` deja la cuenta de `auth.users` huérfana, con el correo y el DNI ocupados para siempre, así que volver a dar de alta a la misma persona falla por duplicado sin que se vea por qué.

Ahora es la Edge Function `eliminar-empleado`, que borra la cuenta de Auth (el legajo se va solo por el `on delete cascade`) y las fotos del bucket. Cuida tres cosas: quién llama, que el objetivo sea uno de los cuatro perfiles de empleado, y que nadie se dé de baja a sí mismo.

En pantalla la baja muestra el spinner con el logo mientras procesa, que antes parecía que la página se había colgado.

---

### También

**El cartel de confirmación se rediseñó.** Era un `ion-header` / `ion-toolbar` / `ion-title` metido adentro de un modal: el título se truncaba y se veía como una barra de navegación suelta. Ahora es una tarjeta. Además `confirmar()` chequea que el diálogo siga abierto, que evitaba el doble envío, y `puedeConfirmar` no deja abrirlo si el formulario no da.

**Los toasts quedaban tapados.** Se reprodujo en Playwright y se midió la cadena de contextos de apilamiento: `div.operation-layout { z-index: 1 }` atrapaba a un hijo con `z-index: 60007`. Se movieron los toasts fuera de `<ion-content>`.

**El metre era invisible.** La lista de personal filtraba con una lista escrita a mano que no lo incluía: se podía dar de alta un metre —el formulario lo ofrece— y después no aparecía. La cuenta existía y no se veía.

**La foto iba una interacción atrasada.** Salió al hacer el punto 2 y es el mismo mecanismo: Angular marca para revisar la vista que *atiende* un evento, y la foto no llega en el clic sino después, cuando se resuelve la promesa de la cámara. Acá no se llegaba a ver porque es una sola foto y el primer cambio siempre se dibuja, pero la trampa quedaba armada para cuando alguien tocara «Repetir». La plantilla ahora lee una señal.

### Falta

Nada del enunciado. Queda probar el flujo completo en los cuatro dispositivos antes de la revisión.
