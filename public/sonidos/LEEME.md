# Sonidos de la aplicación

**Faltan los dos archivos.** El requisito excluyente R11 pide dos
sonidos **distintos**: uno al abrir la aplicación y otro al cerrarla.

Hay que dejar acá exactamente estos dos, con estos nombres:

| Archivo | Cuándo suena | Duración |
|---|---|---|
| `apertura.mp3` | Al terminar la presentación animada | hasta 1 segundo |
| `cierre.mp3` | Cuando la aplicación pasa a segundo plano | **menos de 400 ms** |

El de cierre tiene que ser corto de verdad. Cuando Android suspende la
aplicación puede matar el proceso antes de que el audio termine, y un
sonido largo sencillamente no se escucha. Es un riesgo conocido y está
anotado en `CONTEXTO-PROYECTO.md`.

Mientras los archivos no estén, `SonidosService` no hace nada y la
aplicación funciona igual: no hace falta tocar código, solo dejar los
dos `.mp3` en esta carpeta y volver a generar el APK.

De dónde sacarlos: cualquier banco de sonidos libre de derechos sirve,
pero hay que poder justificar la licencia si la cátedra pregunta.
