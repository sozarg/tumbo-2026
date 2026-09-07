# Splash Tumbito

La pantalla de arranque muestra únicamente el logo, TUMBITO y una barra animada sobre crema. El pedido de simplificar la marca reemplaza, para este splash, la composición anterior con integrantes, eslogan y órbitas.

Se eligió una entrada corta con rebote y una oscilación suave. Un zoom expansivo tapaba el contenido y magnificaba el raster; una animación de espaciado también recalculaba el layout. La nueva secuencia anima solo transformaciones y opacidad. Dura 3 segundos desde el inicio; con movimiento reducido, 600 ms sin animaciones.

La barra acompaña la bienvenida; no representa progreso de red ni muestra porcentajes ficticios. El splash permanece visible hasta terminar la navegación. El error de navegación permite reintentar; un fallo de imagen no bloquea el ingreso. La precarga general se libera después de navegar.

## Imágenes

- PNG maestro intacto: 1.286.413 bytes.
- WebP para el splash: 768 × 768, 71.632 bytes; reducción del 94,4 %.
- Regeneración: `node tools/generar-logo-splash.mjs`.
- Plantilla estática: `public/imagenes/splash-estatica.svg`.
- Recursos nativos: `node tools/generar-splash-nativo.mjs`; actualiza las dos fuentes de `public/assets` y los 26 splash existentes de Android conservando sus dimensiones. También se invoca desde el generador de íconos.
- Los PNG nativos mantienen sus colores sin cuantización; algunos aumentan de peso por el mayor tamaño del logo dentro de la composición. No se descargan para el splash animado.

## Verificación

- `npm run build`: aprobado.
- Seis pruebas del componente: aprobadas. Cubren imagen pendiente, movimiento reducido, sesión activa, fallo y reintento de navegación, navegación duplicada y destrucción.
- Chromium: 320 × 568, 360 × 800, 390 × 844, 768 × 1024 y 844 × 390; sin desbordamiento horizontal y con navegación al ingreso.
- AXE sobre el splash: cero infracciones en esos cinco tamaños.
- Imagen fallida y movimiento reducido: navegación verificada en navegador.
- CPU ×4, viewport 390 × 844 y DPR 3: 145 cuadros durante una muestra de 2,4 s, máximo de 17 ms y cero cuadros mayores de 50 ms. Es una muestra de navegador, no una medición en dispositivo Android.
- Recursos nativos revisados visualmente; pendiente validar el arranque en dispositivo/APK.
