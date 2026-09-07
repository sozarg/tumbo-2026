# Ingreso Tumbito

Objetivo: que el personal encuentre y complete el ingreso con claridad, conservando el carácter cálido de la marca.

Se eligió una columna de hasta 384 px con el logo centrado, título debajo, campos etiquetados y una acción azul de alto contraste. Se descartaron las ilustraciones de fondo y las tarjetas anidadas porque competían con el formulario. El selector conserva los perfiles existentes como «Acceso rápido», con una altura natural y controles táctiles de 44 px o más.

El contenido deja de estirarse para llenar el viewport. El desplazamiento vertical está desactivado y los espacios se compactan en pantallas de hasta 700 px de alto. El formulario completo y el pie entran en 320 × 568 px. Por pedido del usuario, el pie muestra «Tumbito · 2026» sin desplegable ni etiqueta de entorno. Cada campo reserva dos líneas para sus errores, evitando desplazar el formulario al validar.

Verificación: build aprobado; AXE sin infracciones a 320, 360, 390, 768 y 1440 px; validaciones de correo y clave vacíos e inválidos y acceso rápido comprobados en navegador. Se conserva la lógica de autenticación y de limpieza de sesión.

Se quitó el contador del selector. Verificado que todo el bloque entra en los cinco viewports y que los errores no modifican su posición ni altura.
