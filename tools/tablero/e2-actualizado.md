### Por qué es una tarjeta aparte

El enunciado pide **lectura y generación** de códigos QR como requisito excluyente. Cuando se armó el tablero el proyecto **generaba y mostraba** imágenes de QR (`public/imagenes/qr-*.png`, `qrImagen()`), pero **no leía ninguno**.

### Qué hay que resolver
- [x] Elegir e instalar un lector (`@capacitor-mlkit/barcode-scanning`)
- [x] Permisos y prueba en el APK
- [x] Código del DNI → completar los campos del alta (**punto 1 listo**; punto 5 falta llamarlo)
- [ ] QR de entrada al local → lista de espera (punto 9)
- [ ] QR de mesa → vincular y ver el menú (puntos 10 y 11)
- [ ] QR de propina → los cinco niveles (punto 21)
- [ ] Que TODOS los QR estén disponibles en el README y en pantalla (es excluyente)

---

### Hecho: el lector y el primer uso

`src/app/core/dispositivo/lector-de-dni.service.ts`, sobre `@capacitor-mlkit/barcode-scanning@8.1.1`. Permisos en el manifiesto y la descarga del módulo de Google (`com.google.mlkit.vision.DEPENDENCIES = barcode_ui`) resueltas: en el primer uso el teléfono baja el módulo y el servicio espera a que esté.

Devuelve un tipo con cuatro casos —`leido`, `cancelado`, `otro-codigo`, `error`— para que la pantalla pueda decir *"eso no es un DNI"* en vez de *"falló"*.

**El DNI argentino trae un PDF417, no un QR.** El lector busca los dos formatos:

```ts
const FORMATOS = [BarcodeFormat.Pdf417, BarcodeFormat.QrCode];
```

Eso vale para los QR que faltan también: el mismo servicio lee cualquiera de los dos, así que los de mesa, entrada y propina no necesitan un lector nuevo, solo llamarlo y decidir qué hacer con el texto.

**El parser** (`core/dni/codigo-de-dni.ts`) se ancla en el campo de sexo y no en posiciones fijas: hay dos variantes del formato dando vueltas —la vieja arranca con el trámite, la nueva mete un campo de más— y contar desde el principio falla con una de las dos.

**Los códigos de prueba.** `npm run qr:dni` genera 12 QR con personas inventadas, en el formato real del documento, en `docs/qr-dni-de-prueba/` con su `hoja.html` para imprimir. Se hizo para no gastar los cuatro DNI reales del grupo en las demostraciones, y lo importante es que **la aplicación no puede distinguirlos de uno real**: mismo formato, sin ninguna rama "si es de prueba". Probar con estos ejercita el camino de lectura de verdad.

---

### Por qué queda en curso y no en hecho

El lector está y funciona, pero de los cinco usos que pide el enunciado hay **uno solo andando**. Los cuatro que faltan no necesitan infraestructura nueva; necesitan que cada punto lo llame y resuelva qué hacer con el contenido:

| QR | Punto | Qué falta |
|---|---|---|
| DNI | 1 | ✅ listo |
| DNI | 5 | llamar al servicio desde el alta de cliente |
| Entrada al local | 9 | leer y anotar en la lista de espera |
| Mesa | 10, 11 | leer, vincular la sesión y abrir el menú |
| Propina | 21 | leer los cinco niveles (hoy se **toca** la imagen en pantalla, que no es leer un QR) |

Y falta el índice de **todos** los QR en el README y en pantalla, que es excluyente.

### Bloquea a

P05, P09, P10, P11, P21, P22 — pero ya no por falta de lector, sino por el trabajo propio de cada punto.
