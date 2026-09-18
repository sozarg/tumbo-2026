# Revisión de composición de Operación

## Diagnóstico y alcance

La home anterior aplicaba `align-content: start` a un `nav` que no crecía dentro del
host flexible. Categorías y botones tenían alturas de contenido: entraban, pero
dejaban el resto del viewport sin componer. También había reglas duplicadas y
selectores de implementaciones anteriores que el template ya no utilizaba.

Se conserva `MenuOperacion`, el header de Ionic, el shell de las vistas internas,
los permisos de `secciones.ts`, todos los eventos y los textos existentes. No hay
cambios en TypeScript, servicios, contratos, rutas o lógica del pedido.

## Composición

- El menú ocupa el alto restante. Grid reparte sus filas con `minmax(0, 1fr)`.
- Las columnas de accesos usan el número real de elementos del grupo. No quedan
  columnas vacías cuando un grupo contiene dos opciones.
- Las densidades derivan del número de grupos, no del nombre del rol. Con dos
  categorías aparecen filas con las descripciones que ya tenía el componente;
  con tres, las acciones tienen más presencia; con cinco, son más compactas.
- En el breakpoint existente de 768 px hay dos columnas de categorías. Cuando
  el número de categorías es impar, la primera ocupa ambas columnas.
- Los botones tienen mínimos táctiles de 44 px y alturas limitadas por `clamp()`
  **y por el espacio real de su fila**, evitando solapamientos al aparecer actividad.
- Se conserva el umbral de altura de 650 px. No se agregan breakpoints.
- Categorías sin borde, acciones de superficie azul brillante y sombra discreta,
  iconos azules o cálidos según su categoría. Se eliminó CSS duplicado y selectores
  sin uso del menú.
- Las descripciones de categoría conservan su presencia original; no se reserva
  una línea vacía donde no existen. Las descripciones de accesos reutilizan
  `descripcion()` únicamente para las composiciones con pocas opciones.
- Cocina y Barra conservan accesos, pedidos y estado. Su actividad ahora queda
  fuera del panel de estado, en dos columnas, para coexistir con alturas cortas.
- Hover solo para punteros que lo admiten; pressed, focus-visible, disabled y
  reduced motion comparten reglas en todos los accesos.

## Esquinas de la captura

No se encontró una implementación de papel doblado en HEAD. Se inspeccionaron
SCSS global, componentes, pseudoelementos, máscaras, recortes, imágenes de borde
y el CSS de normalización de Ionic. El render anterior al cambio en Chromium
tampoco mostraba las esquinas cuadradas de la captura suministrada.

Los valores computados originales del botón eran `appearance: button`,
`border-image: none`, `clip-path: none`, `mask: none`, `corner-shape: round` y
`content: none` para ambos pseudoelementos. La apariencia nativa provenía de
`@ionic/angular/css/normalize.css`.

Ahora el menú define `appearance: none` y no utiliza bordes ornamentales. La misma
apariencia explícita se aplica a los botones nativos de las quince vistas internas
desde `operacion-visual.scss`. Las capturas verificadas muestran límites limpios.
Esto elimina la dependencia del dibujo nativo de esos controles, pero **no prueba
que fuera la causa del artefacto de la captura**. Su origen exacto sigue sin
reproducirse; no se presenta como una decoración encontrada y eliminada del código.

## Permisos verificados

| Rol                | Distribución visible                                                          | Accesos |
| ------------------ | ----------------------------------------------------------------------------- | ------: |
| Dueño              | Gestión, Operación, Servicio, Experiencia del cliente, Seguimiento: 3/3/3/3/3 |      15 |
| Supervisor         | Gestión, Operación, Seguimiento: 3/3/2                                        |       8 |
| Maitre             | Recepción, Operación: 1/2                                                     |       3 |
| Mozo               | Atención de mesas, Servicio: 1/3                                              |       4 |
| Cocinero           | Cocina, Administración (Platos), estado del sector                            |       2 |
| Cantinero          | Barra, Administración (Bebidas), estado del sector                            |       2 |
| Cliente registrado | Tu visita, Atención, Experiencia: 3/2/3                                       |       8 |
| Cliente anónimo    | Tu visita, Atención, Experiencia: 3/2/2                                       |       7 |

Son siete distribuciones de contenido para ocho roles; Cocina y Barra comparten
composición. Los grupos sin accesos siguen desapareciendo por el filtro existente.

## Validación

- `npm test -- --watch=false`: 170 pruebas, 18 archivos, sin fallos.
- `npm run build`: correcto, dentro de los presupuestos configurados.
- Prettier de los archivos modificados y `git diff --check`: correctos.
- `tools/verificar-layout.cjs`: 120 casos (home, quince pantallas, cuatro
  formularios, seis viewports), sin overflow, scroll global/doble ni errores AXE.
- `tools/verificar-composicion.cjs`: 108 casos de los ocho roles; estado normal,
  cuatro notificaciones con nombre largo y sectores sin pedidos. Comprueba
  permisos y cantidades reales, geometría, solapamientos, mínimo táctil, ausencia
  de scroll, AXE, foco visible, navegación por teclado a todos los accesos y logout.
- Casos de prueba: 320×568, 360×640, 390×844, 768×650, 1024×768 y 768×360.
  El audit anterior conserva su caso 390×780. Estas dimensiones no generan CSS.
- Se repitió el stress QA anterior: 32 registros de listas largas/vacías, nombres
  y correos extensos, precios, imágenes, confirmación, gráficos, cuenta y pedidos
  de cliente; sin overflow horizontal ni violaciones AXE registradas.
- Inspección visual de los ocho roles, vertical y horizontal, más las quince
  pantallas internas y escenarios con actividad/estado vacío. Se corrigieron
  durante la revisión el desborde de notificaciones sectoriales y el solapamiento
  de accesos del Mozo con actividad.

Los scripts de navegador requieren Playwright y axe-core resolubles por Node
(puede usarse `NODE_PATH` con dependencias de QA externas). Con `npm start`
ejecutándose en modo demo:

```powershell
node tools/verificar-layout.cjs
node tools/verificar-composicion.cjs
```

`TUMBO_QA_URL` permite otro servidor y `TUMBO_QA_OUTPUT` otra carpeta de resultados.
Por defecto guardan JSON y capturas en el directorio temporal, fuera del repo.
Los datos de prueba se inyectan exclusivamente en el mock del navegador local.

Incidencias: no se reprodujo el artefacto exacto de las esquinas. El runner
unitario emite avisos del parser CSS de jsdom y de un sourcemap de native-audio;
las 170 pruebas pasan. El servidor de desarrollo también registra avisos de
NgOptimizedImage sobre prioridad LCP, dimensiones del logo y proporción de imágenes
recortadas del catálogo. No se modificaron los assets en esta pasada. No hay un
script de lint configurado en package.json.

## Refinamiento final sobre la base aprobada

- Se retiró el fondo azul y el icono sólido asignados por posición a la primera
  categoría. Gestión, Operación y navegación comparten ahora el mismo nivel.
- El azul intenso queda reservado al acceso operativo principal único (Espera,
  Pedidos o el sector); servicio y experiencia conservan sus acentos cálidos.
- Con pocos accesos, las categorías forman un conjunto centrado y acotado, con
  separación fluida corta. El espacio libre queda equilibrado en los extremos,
  evitando dispersar las tarjetas. La regla depende de la densidad existente.
- El acceso principal único comparte radio de 18 px con el acceso de sector.
- Se conservaron header, textos, descripciones, grillas de clientes y dashboards
  de Cocina/Barra. La última fila del anónimo sigue usando dos columnas completas.
- Cambios de esta pasada: menu-operacion.component.scss, este informe y la
  comprobación visual de verificar-composicion.cjs. Esta última verifica el
  centrado y separación del conjunto escaso en lugar de exigir que su última
  tarjeta toque el final del viewport. Los tests funcionales no cambiaron.
- Nuevas capturas de los ocho roles comparadas juntas en 390×844, además de los
  casos angostos, horizontales, con actividad y sin pedidos. QA: 108 escenarios
  aprobados; tests: 170/170; build correcto. Persisten los avisos no bloqueantes
  del runner documentados arriba.
- Artefactos de esta ejecución: carpeta `polish-final` dentro del directorio de
  visualizaciones de la tarea; `roles-contacto.png` compara los ocho roles y
  `index.html` enlaza las ocho capturas individuales.

## Ajuste vigente: categorías que componen el viewport

Esta revisión sustituye el centrado global de la etapa anterior únicamente para
la baja densidad. Se conservan los permisos, los eventos, las rutas, los textos,
el fondo, el shell interno y los dashboards de Cocina/Barra.

- **Una categoría:** la única fila flexible ocupa el alto disponible y su
  superficie neutra organiza ese espacio. El acceso horizontal tiene altura
  acotada. No existe hoy un rol real con esta distribución: se probó mediante
  una fixture de presentación en seis viewports, restaurada antes de navegar.
- **Dos categorías:** en vertical ambas filas flexibles cubren el área disponible.
  Cada categoría conserva título arriba y un grupo de acciones de altura máxima
  limitada, centrado dentro del espacio restante. Se eliminó el centrado del
  conjunto de categorías y se recuperó la superficie neutra de Supervisor.
  En el breakpoint existente de 768 px aparecen dos columnas a todo el alto.
- **Tres categorías:** se conserva la distribución existente en tres franjas;
  en ancho amplio, la primera ocupa una fila y las otras dos comparten la siguiente.
- **Cinco categorías:** se conserva la densidad de Dueño, con cinco franjas en
  vertical y, en ancho amplio, la primera fila completa seguida de dos pares.
- **Dos accesos en grilla:** el conjunto ocupa dos anchos equivalentes a las
  columnas de la grilla de tres, se centra y tiene un máximo de 20 rem. No hay
  tercera celda vacía. Los accesos horizontales con descripción de baja densidad
  conservan su composición en filas.

Archivos de esta pasada: `menu-operacion.component.html` (clase por conteo de
accesos), `menu-operacion.component.scss`, `tools/verificar-composicion.cjs` y este
informe. No se modificaron TypeScript ni pruebas funcionales.

Validación: 114 escenarios de composición (108 de roles reales y 6 de categoría
única), 120 de layout, 170 pruebas unitarias, build, Prettier y diff-check correctos.
Las comprobaciones visuales ahora verifican que las categorías cubran el alto y
que los pares no excedan el ancho de las columnas de tres, además de los controles
anteriores de accesibilidad, foco, navegación, scroll y solapamientos.

Se inspeccionó nuevamente el montaje de los ocho roles, las vistas de poca altura
con actividad, la distribución horizontal y la fixture de una sola categoría.
Los artefactos están en `categorias-viewport`: `roles-contacto.png`, `index.html`,
las capturas individuales y los resultados JSON de composición y layout.
