# Pipeline de assets gastronómicos TUMBO

Este pipeline conserva los PNG en `assets/tumbito/master/` y genera copias
recortadas por alpha en `svg/`, `webp/` y `previews/`. No modifica la pantalla
de bienvenida ni posiciona los assets en la aplicación.

## Preparar el entorno local

```bash
python3 -m venv /tmp/tumbo-vtracer-venv
/tmp/tumbo-vtracer-venv/bin/pip install Pillow vtracer==0.6.15
```

La CLI oficial actual de VTracer se distribuye también como binario Rust,
pero este entorno no tiene Cargo. El binding Python oficial permite ejecutar
las mismas trazas de color sin agregar dependencias al proyecto Angular.

## Ejecutar

```bash
/tmp/tumbo-vtracer-venv/bin/python tools/tumbito-assets/pipeline.py
```

Para regenerar sin pasar por SVGO:

```bash
/tmp/tumbo-vtracer-venv/bin/python tools/tumbito-assets/pipeline.py --skip-svgo
```

El pipeline usa tres variantes por asset (`detail`, `balanced`, `light`) y
conserva todas en `assets/tumbito/reports/variants/`. La variante balanceada
queda como SVG de comparación. La recomendación final se toma por calidad
visual y peso, no por el hecho de ser vectorial.

## Resultados

- `assets/tumbito/reports/REPORT.md`: análisis y recomendación por asset.
- `assets/tumbito/reports/metrics.json`: dimensiones, alpha, bounding box,
  transparencia, pesos y shapes.
- `assets/tumbito/previews/comparison.html`: PNG original, SVG y WebP sobre
  fondos blanco, crema y oscuro a 100, 200 y 400 CSS px.

Los SVG generados son vectoriales: no contienen elementos `<image>` ni raster
embebido. Para esta familia glossy se recomienda WebP en los seis casos porque
los SVG pierden acabado y producen demasiadas formas.
