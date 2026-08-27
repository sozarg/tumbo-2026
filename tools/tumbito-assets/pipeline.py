#!/usr/bin/env python3
"""Analyze and prepare the transparent TUMBO food assets.

Masters are read-only. Every derived image is cropped from a temporary copy,
so the source PNGs remain byte-for-byte unchanged.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import subprocess
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path

from PIL import Image
import vtracer


ASSET_NAMES = (
    "carne",
    "pizza",
    "fideos",
    "cafe",
    "sopa",
    "ensalada",
    "cubiertos",
    "saleros",
    "rodillo",
    "vino",
)
RECOMMENDATIONS = {
    "carne": "WEBP recomendado: conserva el brillo de la carne y pesa mucho menos que el SVG.",
    "pizza": "WEBP recomendado: mantiene los bordes suaves, el queso y los reflejos sin artefactos.",
    "fideos": "WEBP recomendado: conserva la profundidad del caldo y la vajilla; el SVG agrega ruido.",
    "cafe": "WEBP recomendado: preserva el vapor, la crema y los degradados del café.",
    "sopa": "WEBP recomendado: mantiene los detalles finos del bowl y los palillos sin posterizar.",
    "ensalada": "WEBP recomendado: conserva la variación de hojas e ingredientes con menor peso.",
    "cubiertos": "WEBP recomendado: conserva los reflejos metálicos y la diagonal sin paths innecesarios.",
    "saleros": "WEBP recomendado: mantiene el vidrio, metal y granos visibles sin posterizar.",
    "rodillo": "WEBP recomendado: preserva el brillo de la madera y los mangos de color.",
    "vino": "WEBP recomendado: conserva el vidrio, el vino y las uvas con bordes suaves.",
}
ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "assets" / "tumbito"
MASTER = ASSETS / "master"
SVG = ASSETS / "svg"
WEBP = ASSETS / "webp"
PREVIEWS = ASSETS / "previews"
REPORTS = ASSETS / "reports"


@dataclass(frozen=True)
class AssetMetrics:
    name: str
    width: int
    height: int
    mode: str
    has_alpha: bool
    alpha_bbox: tuple[int, int, int, int] | None
    trimmed_width: int
    trimmed_height: int
    transparent_pixels_percent: float
    partially_transparent_pixels: int
    size_bytes: int
    edge_translucency_pixels: int


def alpha_metrics(path: Path) -> AssetMetrics:
    with Image.open(path) as image:
        rgba = image.convert("RGBA")
        alpha = rgba.getchannel("A")
        bbox = alpha.getbbox()
        width, height = rgba.size
        total = width * height
        alpha_values = list(alpha.getdata())
        partial = sum(0 < value < 255 for value in alpha_values)
        transparent = sum(value == 0 for value in alpha_values)
        edge_translucency = 0
        if bbox:
            left, top, right, bottom = bbox
            for x in range(left, right):
                for y in (top, bottom - 1):
                    if 0 < alpha.getpixel((x, y)) < 255:
                        edge_translucency += 1
            for y in range(top, bottom):
                for x in (left, right - 1):
                    if 0 < alpha.getpixel((x, y)) < 255:
                        edge_translucency += 1
            trimmed_width = right - left
            trimmed_height = bottom - top
        else:
            trimmed_width = trimmed_height = 0
        return AssetMetrics(
            name=path.stem,
            width=width,
            height=height,
            mode=image.mode,
            has_alpha="A" in image.getbands(),
            alpha_bbox=bbox,
            trimmed_width=trimmed_width,
            trimmed_height=trimmed_height,
            transparent_pixels_percent=round(transparent / total * 100, 2),
            partially_transparent_pixels=partial,
            size_bytes=path.stat().st_size,
            edge_translucency_pixels=edge_translucency,
        )


def cropped_copy(source: Path, directory: Path) -> Path:
    with Image.open(source) as image:
        rgba = image.convert("RGBA")
        bbox = rgba.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"{source.name} no contiene píxeles visibles")
        destination = directory / source.name
        rgba.crop(bbox).save(destination, format="PNG", optimize=True)
        return destination


def make_webp(source: Path, destination: Path) -> None:
    with Image.open(source) as image:
        image.convert("RGBA").save(
            destination,
            format="WEBP",
            quality=92,
            method=6,
            alpha_quality=100,
        )


def trace(source: Path, destination: Path, options: dict[str, object]) -> None:
    vtracer.convert_image_to_svg_py(str(source), str(destination), **options)
    text = destination.read_text(encoding="utf-8")
    with Image.open(source) as image:
        width, height = image.size
    if "viewBox=" not in text:
        text = re.sub(
            r"<svg\b",
            f'<svg viewBox="0 0 {width} {height}"',
            text,
            count=1,
        )
        destination.write_text(text, encoding="utf-8")


def count_svg_shapes(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    return sum(text.count(f"<{tag}") for tag in ("path", "polygon", "circle", "ellipse", "rect"))


def optimize_svgs() -> str:
    command = ["npx", "--yes", "svgo@4", "--multipass", *map(str, SVG.glob("*.svg"))]
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=False)
    if result.returncode:
        raise RuntimeError(f"SVGO falló: {result.stderr.strip()}")
    return result.stdout.strip()


def write_report(metrics: list[AssetMetrics], variants: dict[str, list[dict[str, object]]]) -> None:
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "metrics.json").write_text(
        json.dumps(
            {"assets": [asdict(metric) for metric in metrics], "svg_variants": variants},
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    rows = []
    for metric in metrics:
        selected = next(item for item in variants[metric.name] if item["selected"])
        svg_path = SVG / f"{metric.name}.svg"
        webp_path = WEBP / f"{metric.name}.webp"
        rows.append(
            f"| {metric.name.upper()} | {metric.width}×{metric.height} | {metric.trimmed_width}×{metric.trimmed_height} | "
            f"{metric.size_bytes / 1024:.1f} KB | {svg_path.stat().st_size / 1024:.1f} KB / {selected['shapes']} shapes | "
            f"{webp_path.stat().st_size / 1024:.1f} KB | {RECOMMENDATIONS[metric.name]} |"
        )
    report = """# Evaluación de assets gastronómicos TUMBO

Pipeline local: crop derivado con Pillow, vectorización colorida con VTracer,
optimización con SVGO 4 y WebP RGBA con Pillow/libwebp. Los masters no se
modifican.

## Recomendación

| Asset | Dimensiones master | Dimensiones derivadas | PNG master | SVG optimizado | WebP | Recomendación |
|---|---:|---:|---:|---:|---:|---|
{rows}

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
""".format(rows="\n".join(rows))
    (REPORTS / "REPORT.md").write_text(report, encoding="utf-8")


def write_comparison(metrics: list[AssetMetrics], variants: dict[str, list[dict[str, object]]]) -> None:
    cards: list[str] = []
    backgrounds = ("white", "cream", "dark")
    sizes = (100, 200, 400)
    for metric in metrics:
        selected = next(item for item in variants[metric.name] if item["selected"])
        cells: list[str] = []
        for label, path in (
            ("PNG original", f"../master/{metric.name}.png"),
            ("SVG", f"../svg/{metric.name}.svg"),
            ("WebP", f"../webp/{metric.name}.webp"),
        ):
            cells.append(
                f'<figure><figcaption>{html.escape(label)}</figcaption>'
                + "".join(
                    f'<div class="sample {background}" title="{background}, {size} CSS px" style="--size:{size}px"><img src="{path}" alt="" loading="lazy"></div>'
                    for background in backgrounds
                    for size in sizes
                )
                + "</figure>"
            )
        cards.append(
            f'<article><h2>{metric.name.upper()}</h2><p>{metric.size_bytes / 1024:.1f} KB PNG · '
            f'{(SVG / f"{metric.name}.svg").stat().st_size / 1024:.1f} KB SVG · '
            f'{(WEBP / f"{metric.name}.webp").stat().st_size / 1024:.1f} KB WebP · '
            f'{selected["shapes"]} shapes SVG</p><div class="comparison">{"".join(cells)}</div></article>'
        )
    document = """<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Comparación de assets TUMBO</title><style>
:root{font:16px/1.4 system-ui,sans-serif;color:#003592;background:#fbf1d5}body{margin:0;padding:24px}h1{margin-top:0}article{margin:32px 0;padding:20px;border:1px solid #dc5b0233;border-radius:16px;background:#fbf1d566}.comparison{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}figure{margin:0}figcaption{font-weight:700;margin-bottom:8px}.sample{display:inline-grid;place-items:center;width:calc(33.333% - 4px);height:140px;vertical-align:top;overflow:hidden}.sample img{width:min(var(--size),100%);height:min(var(--size),100%);object-fit:contain}.white{background:#fff}.cream{background:#fbf1d5}.dark{background:#182338}@media(max-width:700px){body{padding:12px}.comparison{grid-template-columns:1fr}.sample{height:120px}}
</style></head><body><h1>Comparación de assets gastronómicos TUMBO</h1><p>Cada asset se muestra sobre blanco, crema y oscuro a 100, 200 y 400 CSS px.</p>{cards}</body></html>""".replace("{cards}", "\n".join(cards))
    (PREVIEWS / "comparison.html").write_text(document, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-svgo", action="store_true")
    args = parser.parse_args()
    for directory in (SVG, WEBP, PREVIEWS, REPORTS):
        directory.mkdir(parents=True, exist_ok=True)

    metrics: list[AssetMetrics] = []
    variants: dict[str, list[dict[str, object]]] = {}
    with tempfile.TemporaryDirectory(prefix="tumbo-assets-") as temporary:
        temp_dir = Path(temporary)
        for name in ASSET_NAMES:
            master = MASTER / f"{name}.png"
            metrics.append(alpha_metrics(master))
            cropped = cropped_copy(master, temp_dir)
            variant_dir = REPORTS / "variants" / name
            variant_dir.mkdir(parents=True, exist_ok=True)
            variant_specs = (
                ("balanced", {"colormode": "color", "hierarchical": "stacked", "mode": "spline", "filter_speckle": 4, "color_precision": 6, "layer_difference": 16, "splice_threshold": 45, "path_precision": 3}),
                ("detail", {"colormode": "color", "hierarchical": "stacked", "mode": "spline", "filter_speckle": 2, "color_precision": 7, "layer_difference": 10, "splice_threshold": 35, "path_precision": 3}),
                ("light", {"colormode": "color", "hierarchical": "stacked", "mode": "spline", "filter_speckle": 8, "color_precision": 5, "layer_difference": 24, "splice_threshold": 55, "path_precision": 3}),
            )
            variants[name] = []
            for label, options in variant_specs:
                output = variant_dir / f"{label}.svg"
                trace(cropped, output, options)
                variants[name].append({"name": label, "shapes": count_svg_shapes(output), "bytes": output.stat().st_size, "selected": label == "balanced", "reason": "equilibrio de detalle, peso y acabado glossy" if label == "balanced" else "variante de comparación"})
            shutil.copy2(variant_dir / "balanced.svg", SVG / f"{name}.svg")
            make_webp(cropped, WEBP / f"{name}.webp")
    if not args.skip_svgo:
        optimize_svgs()
    for name in ASSET_NAMES:
        selected = next(item for item in variants[name] if item["selected"])
        selected["shapes"] = count_svg_shapes(SVG / f"{name}.svg")
        selected["bytes"] = (SVG / f"{name}.svg").stat().st_size
    write_report(metrics, variants)
    write_comparison(metrics, variants)
    print(f"Procesados {len(metrics)} assets en {ASSETS}")


if __name__ == "__main__":
    main()
