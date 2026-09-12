### Por qué era una tarjeta aparte

Cinco puntos distintos piden sacar fotos con la cámara, y cuando se armó el tablero **no había una sola referencia a cámara en todo el proyecto**. Buscando `Camera`, `getUserMedia`, `@capacitor/camera`: cero resultados.

Si no lo tomaba alguien como tarea propia, cada punto iba a decir «falta la foto» y nadie lo iba a hacer.

### Qué había que resolver
- [x] Instalar y configurar `@capacitor/camera`
- [x] Permisos de cámara en `AndroidManifest.xml`
- [x] Un servicio único que devuelva la foto lista para subir
- [x] Distinguir **cámara obligatoria** (puntos 1, 4, 5) de **cámara o galería** (puntos 2, 3)
- [x] Subir las fotos a Supabase Storage y guardar la URL
- [x] Que funcione en el APK, no solo en el navegador

---

### Cómo quedó

`src/app/core/dispositivo/camara.service.ts`, sobre `@capacitor/camera@8.2.4`. Dos métodos públicos sobre un mismo privado:

```ts
sacarFoto()     → CameraSource.Camera   // empleado, mesa, cliente: se TOMA
elegirImagen()  → CameraSource.Prompt   // plato, bebida: cámara O galería
```

**La distinción no es cosmética.** `Prompt` es el valor por defecto de Capacitor y ofrece la galería. Si el punto 1 lo usara, la pantalla se vería exactamente igual y el requisito no se cumpliría — que es la peor combinación posible, porque nadie lo nota hasta la revisión.

El resultado es un tipo único, `ResultadoDeFoto`, con tres casos: `tomada`, `cancelado` y `error`. Salir con el botón de atrás es **cancelado y no error**: el plugin tira excepción y sin distinguirlas la aplicación mostraba un cartel rojo por haber cambiado de idea.

La foto vuelve como `{ file, previewUrl, simulada }`. Los nombres son los mismos que los de `ImagenProducto` a propósito, para que el servicio de alta la trate igual venga de donde venga.

**Antes de subir se comprime**: se escala al lado mayor de 1400 px y se pasa a WebP con calidad 0,82, en un canvas. Una foto de celular pesa varios MB y son tres por producto.

**En el navegador** se cae a un selector de archivo y el resultado queda marcado como `simulada: true`, con el aviso en pantalla. En el APK es la cámara de verdad. El mismo criterio que el lector de DNI: en el teléfono es real, en la web alcanza para probar el resto del formulario.

**Storage:** buckets `fotos-usuarios` y `fotos-productos`, con sus políticas. La baja de empleado borra sus fotos antes de borrar la cuenta, para no dejar archivos públicos sin dueño en un bucket de lectura abierta.

### Usado hoy por

- **P01** — foto del empleado, obligatoria, solo cámara
- **P02** — las tres fotos del plato, cámara o galería

### Lo que destrabó, y lo que todavía no

Esta tarjeta ya no bloquea a nadie: el servicio existe, está probado en el APK y se usa desde dos puntos. Lo que falta en P04, P05, P09 y P11 es **llamarlo**, no construirlo — cada punto lo resuelve con el servicio que ya está.

### Nota para el resto

Al usarlo apareció una trampa que conviene saber antes de escribir el tercer formulario con foto: **la pantalla puede quedar una foto atrasada**. Angular marca para revisar la vista que *atiende* un evento, y la foto no llega en el clic sino cuando se resuelve la promesa de la cámara, que ya no es un evento. Si la plantilla lee el valor del `FormControl`, no se redibuja hasta el clic siguiente.

La solución en P01 y P02 fue que **la plantilla lea una señal** y que un solo método escriba la señal y el control juntos. Está comentado largo en `operacion.component.ts` (`fotosDelProducto`). Copiar ese patrón y no el de leer el control.
