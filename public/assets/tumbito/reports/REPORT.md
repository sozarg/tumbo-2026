# Evaluación de assets gastronómicos TUMBO

Pipeline local: crop derivado con Pillow, vectorización colorida con VTracer,
optimización con SVGO 4 y WebP RGBA con Pillow/libwebp. Los masters no se
modifican.

## Recomendación

| Asset | Dimensiones master | Dimensiones derivadas | PNG master | SVG optimizado | WebP | Recomendación |
|---|---:|---:|---:|---:|---:|---|
| CARNE | 1536×1024 | 1353×948 | 2035.0 KB | 1174.9 KB / 5676 shapes | 234.1 KB | WEBP recomendado: conserva el brillo de la carne y pesa mucho menos que el SVG. |
| PIZZA | 1312×1199 | 1137×1076 | 1504.9 KB | 1035.9 KB / 4704 shapes | 220.4 KB | WEBP recomendado: mantiene los bordes suaves, el queso y los reflejos sin artefactos. |
| FIDEOS | 1305×1206 | 1119×1061 | 1480.5 KB | 1026.0 KB / 4138 shapes | 212.4 KB | WEBP recomendado: conserva la profundidad del caldo y la vajilla; el SVG agrega ruido. |
| CAFE | 1312×1199 | 1139×1113 | 895.1 KB | 443.6 KB / 1935 shapes | 129.5 KB | WEBP recomendado: preserva el vapor, la crema y los degradados del café. |
| SOPA | 1312×1199 | 1218×1158 | 1224.6 KB | 780.9 KB / 3201 shapes | 182.2 KB | WEBP recomendado: mantiene los detalles finos del bowl y los palillos sin posterizar. |
| ENSALADA | 1312×1199 | 1276×1183 | 1302.8 KB | 654.1 KB / 2629 shapes | 162.7 KB | WEBP recomendado: conserva la variación de hojas e ingredientes con menor peso. |
| CUBIERTOS | 1182×1330 | 1166×1321 | 661.6 KB | 721.0 KB / 2391 shapes | 148.3 KB | WEBP recomendado: conserva los reflejos metálicos y la diagonal sin paths innecesarios. |
| SALEROS | 1295×1214 | 1230×1214 | 1664.6 KB | 2083.5 KB / 9425 shapes | 322.2 KB | WEBP recomendado: mantiene el vidrio, metal y granos visibles sin posterizar. |
| RODILLO | 1672×941 | 1605×856 | 551.6 KB | 296.0 KB / 1243 shapes | 96.0 KB | WEBP recomendado: preserva el brillo de la madera y los mangos de color. |
| VINO | 1024×1536 | 1010×1536 | 1748.7 KB | 959.8 KB / 3711 shapes | 213.6 KB | WEBP recomendado: conserva el vidrio, el vino y las uvas con bordes suaves. |

Los SVG se generaron y optimizaron para evaluarlos, pero no se recomiendan
para el fondo final si introducen artefactos puntuales o complejidad excesiva.
WebP es la opción final para estos assets glossy porque conserva mejor el
acabado y reduce el peso.

## Lectura técnica

- `alpha_bbox` y las dimensiones recortadas se calculan desde el canal alpha;
  no se corta ningún píxel visible.
- `partially_transparent_pixels` y `edge_translucency_pixels` sirven como
  indicadores de bordes suaves/posibles halos; la revisión visual está en
  `previews/comparison.html`.
- Las variantes no seleccionadas quedan en `reports/variants/` para comparar
  simplificación y cantidad de formas.
