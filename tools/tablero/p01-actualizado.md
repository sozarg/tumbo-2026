**Perfiles habilitados:** dueño o supervisor. Dispositivo 1.

### Lo que pide el enunciado
- [x] Campos: nombres, apellidos, DNI, CUIL, correo, **contraseña** y perfil cocinero
- [ ] Foto personal **tomada con la cámara** (no elegida de la galería)
- [ ] Lector de QR del DNI que complete los campos solos
- [x] Validar TODOS los campos: formatos, vacíos, tipos de dato
- [ ] Verificar la lectura del QR del DNI

---

### Hecho

**El alta funciona de verdad.** Antes `registrarEmpleado()` era un mock explícito: no escribía nada. No podía: crear una cuenta en `auth.users` con su contraseña necesita la clave `service_role`, y esa clave no puede viajar dentro del APK.

Se resolvió con la Edge Function `supabase/functions/crear-empleado`, que corre del lado del servidor y cuida tres cosas:

1. **Quién llama** — solo `dueno` o `supervisor` aprobados, leyendo el perfil de `public.usuarios` y no del token.
2. **Qué perfil se puede crear** — solo los cuatro de empleado. Un supervisor no puede fabricarse un `dueno`.
3. **Los errores** — traduce los CHECK de PostgreSQL a castellano.

**Los campos que faltaban.** Se agregó la contraseña y la opción *metre*, que no estaba entre los perfiles.

**Las validaciones, espejando la base.** Antes eran de mentira: `Validators.minLength(7)` para el DNI dejaba pasar `abcdefg`. Ahora cada validador se corresponde con un CHECK de `public.usuarios`, y hay una prueba que compara los dos lados con los mismos casos.

Además, sobre el CUIL:
- Formato (11 dígitos, guiones opcionales)
- **Dígito verificador** — se comprueba con el algoritmo módulo 11, así que un CUIL inventado se detecta
- **Coherencia con el DNI** — los ocho dígitos del medio del CUIL son el DNI

El DNI y el CUIL además **filtran lo que se tipea**: no dejan escribir una letra.

**Los mensajes de error se ven.** Antes el error y el éxito compartían el mismo cartel verde con un tilde, así que un fallo se mostraba con cara de "listo". Ahora son dos controles distintos: el éxito es un toast que se va solo, el error es un cartel rojo con `role="alert"`, que vibra y al que la pantalla se desplaza sola.

**El simulador del DNI dejaba datos inválidos.** Traía siempre la misma persona, con el DNI escrito con puntos —que la base rechaza— y un CUIL falso. Ahora genera una persona distinta en cada lectura, con el CUIL derivado del DNI.

### Falta

Las tres cosas que quedan son la misma: **el dispositivo**.

- **La foto con la cámara** → depende de E1
- **El lector de QR del DNI** → depende de E2
- **Verificar la lectura del QR** → depende de E2

El bucket `fotos-usuarios` y sus políticas ya existen desde la migración `20260901000500_storage.sql`, así que la parte de servidor de la foto está lista: falta sacarla.

### Depende de
E1 (cámara) y E2 (lector de QR)

---
_Tarjeta P01 · generada desde el enunciado del TFI._
