# Revisión localizada: header y Productos

## Causas y corrección

- El header ya compartía plantilla, pero los selectores de Home y detalle divergían en padding, mascota, tipografía y botones. Se consolidaron en `operacion-layout.component.scss`, eliminando duplicados. La variante interna agrega únicamente la columna de volver. La altura medida es 64 px sin safe area, con mascota de 40 px y acciones de 44 px. El saludo largo se trunca con su texto completo en `title`.
- Productos combinaba `flex-wrap`, una base mínima de texto y acciones horizontales: estas saltaban de fila. Ahora usa `64px minmax(0, 1fr) 44px`; imagen, texto flexible y acciones verticales comparten fila, sin altura fija de card. El indicador de baja reserva la misma columna.
- El modelo conserva `fotos[]`. El formulario expone solamente la primera posición, muestra la imagen existente al editar y reemplaza la selección. Editar sin selección envía `[]`, que el servicio existente interpreta como conservar las imágenes. Las fotos históricas adicionales no se borran ni migran.
- Para permitir el alta con una sola imagen se cambió exclusivamente la asociación del control de fotos: usa `Validators.required` sobre el array seleccionado, en lugar del validador de tres fotos. No se modificaron los validadores compartidos ni las otras reglas del formulario.
- En modo demo, la URL temporal de una imagen guardada pertenece al catálogo y no se revoca al cerrar el formulario. Las selecciones descartadas siguen liberándose. Servicios, contratos, confirmaciones y manejo de errores permanecen iguales.

## Archivos

- `src/app/features/operacion/operacion-layout.component.scss`: topbar compartida.
- `src/app/features/operacion/operacion.component.html`: header y selector único.
- `src/app/features/operacion/operacion.component.scss`: fila de producto.
- `src/app/features/operacion/operacion-fotos.component.scss`: preview único e indicador de baja.
- `src/app/features/operacion/operacion.component.ts`: adaptación de la selección y preview al contrato existente.
- `src/app/features/operacion/productos-imagen.component.spec.ts`: tres pruebas específicas.
- `tools/verificar-header-productos.cjs`: comparación de headers y flujo de archivo real en navegador.
- `tools/verificar-composicion.cjs`: reconoce truncamiento deliberado con ellipsis y título completo; sigue detectando desbordamiento real.

## Validación

- `npm run build`: correcto, sin advertencias de presupuesto.
- `npm test -- --watch=false`: 173 pruebas, 19 archivos, todas pasan. JSDOM conserva avisos de parsing CSS; no son fallos de pruebas.
- `node tools/verificar-layout.cjs`: 120 escenarios, cero fallos.
- `node tools/verificar-composicion.cjs`: 114 escenarios por roles, cero fallos y cero errores.
- `node tools/verificar-header-productos.cjs`: 90 comparaciones (Home contra 15 secciones en seis viewports), más alta, reemplazo, edición, cancelación de baja, baja confirmada, imagen decodificable después de guardar, listas vacías/largas y estado de baja.
- Inspección visual de Home, Personal, Productos angosto/amplio, textos/precios extremos, ausencia de imagen y previews de alta/edición. Se conservan el panel con scroll interno y la composición del Centro.

Los scripts requieren `ng serve` en modo demo y Playwright; los existentes también requieren axe-core. Admiten `NODE_PATH` y `TUMBO_QA_OUTPUT`. Los tamaños son casos de prueba, no breakpoints nuevos.

Artefactos de esta ejecución: `C:/Users/Administrator/.codex/visualizations/2026/09/18/01a0b543-25e5-7642-8bf7-7eeb368716da/header-productos` (capturas, `header-flujo.json`, subcarpetas `layout` y `roles`). Los flujos se comprobaron contra el mock; no se ejecutaron escrituras sobre el backend real ni cámara nativa.
