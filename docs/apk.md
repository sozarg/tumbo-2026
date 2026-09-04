# Generar el APK de Android

Cómo pasar de la aplicación web a un `.apk` instalable en un celular.
Los pasos van en orden y no se saltean.

Se probó y se documentó el 29/08/2026 con Android Studio Quail 3
(2026.1.3), Capacitor 8.4 y Angular 22. Compilación completa: 2m 14s.

---

## Qué hace falta

**Android Studio.** Trae adentro el SDK y el JDK 21, que es lo único que
necesita Capacitor 8. No hace falta instalar Java aparte.

**`src/environments/environment.local.ts`** con la URL y la clave
publishable de Supabase. Ese archivo está en `.gitignore` y no viene en
el repositorio: si no lo tenés, mirá el paso 7 de `supabase/README.md`.
**Sin ese archivo el APK compila igual, pero sale en modo demostración**
y los accesos rápidos muestran los usuarios falsos del mock, que es
justamente lo que la cátedra prohíbe.

---

## 1. La primera vez

```bash
npm install
npx cap add android
```

`npx cap add android` crea la carpeta `android/`. Se corre **una sola
vez** en la vida del proyecto: ya está hecho y versionado, así que si
clonás el repositorio no tenés que repetirlo.

---

## 2. Cada vez que querés un APK nuevo

```bash
npm run apk
npx cap open android
```

`npm run apk` hace dos cosas: compila la web con la configuración `apk`
—que es la de producción pero reemplazando `environment.ts` por
`environment.local.ts`— y copia el resultado dentro del proyecto
Android.

`npx cap open android` abre Android Studio en la carpeta correcta.

Ahí adentro:

**Build → Generate App Bundles or APKs → Generate APKs**

El archivo queda en:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Ese `.apk` se pasa al celular por cable, Drive o WhatsApp. Al instalarlo
Android pide permiso para orígenes desconocidos; hay que dárselo.

---

## 3. El ícono y la pantalla de carga

Si no se hace este paso, el celular muestra el **ícono genérico de
Capacitor** y una pantalla de carga en blanco.

```bash
npm run icons
npm run icons:android
npm run apk
```

`npm run icons` genera todo desde `public/imagenes/logo.png`: los íconos
del navegador en `public/icons/` y, en `assets/`, las cuatro imágenes
fuente que necesita Android. `npm run icons:android` las recorta a todas
las densidades y las escribe dentro de `android/`.

> **Por qué `icons:android` corre dos comandos.** `@capacitor/assets`
> escribe `ic_launcher_foreground.png` con el tamaño del ícono ANTIGUO
> (48dp: 192 píxeles en xxxhdpi) en lugar del tamaño del ícono ADAPTABLE
> (108dp: 432 píxeles), y el celular lo tiene que agrandar 2,25 veces
> para dibujarlo. Además le mete un `inset` del 16,7 % que se suma al
> aire que ya trae nuestra imagen, así que el logo terminaba ocupando el
> 40 % del ícono en vez del 60 %. `tools/corregir-iconos-android.mjs`
> reescribe las dos capas en las densidades correctas y los XML sin ese
> recuadro. **No saques ese segundo comando**: si lo hacés, el ícono
> vuelve a verse pixelado, y con él la pantalla de carga del sistema,
> que desde Android 12 usa el mismo ícono.

Se corre solo cuando cambia el logo. Después hace falta un `npm run apk`
y volver a generar el APK.

> **Si cambiás el logo, tocá `public/imagenes/logo.png` y nada más.**
> Todo lo demás sale de ahí. Los archivos de `assets/` y de
> `public/icons/` están generados: editarlos a mano se pierde en la
> próxima corrida.

Sobre el ícono adaptable: Android lo recorta con la forma que tenga
configurada cada celular —círculo, cuadrado redondeado, gota— y solo
garantiza que se vea el **66% central**. Por eso el logo se genera con
20% de aire de cada lado; con menos, el recorte circular le come el
borde naranja.

---

## 3 bis. Las ilustraciones del fondo

No hay nada que correr a mano: `npm run apk` ya lo hace solo. Se explica
igual porque conviene saber que está pasando.

Los archivos de `public/imagenes/tumbito/` son los originales de diseño y
miden más de 1100 píxeles de ancho. En el celular ninguno se dibuja a más
de 272. Cuando el APK los usaba tal cual, el navegador tenía que
decodificar las tres visibles a tamaño completo justo mientras la splash
se animaba, y se veía un tirón: medido, un cuadro de 117 milisegundos
cuando el resto eran de 17.

`tools/generar-ilustraciones.mjs` escribe al lado de cada original tres
versiones más chicas (`sopa-240.webp`, `sopa-480.webp`, `sopa-960.webp`)
y el `srcset` del fondo deja que el celular elija la que le sirve. El
peor cuadro pasó de 117 a 33-50 ms, que es lo mismo que se mide sin
ninguna ilustración: dejaron de costar.

> **Los originales no se tocan.** Si Terrile cambia una ilustración,
> pisa el original y listo: el script se da cuenta por la fecha del
> archivo y rehace las variantes en la próxima compilación. La primera
> corrida tarda más o menos un minuto; después se saltea sola.

---

## 4. Comprobar que quedó bien

En el celular, con la aplicación instalada:

- [ ] El ícono en el cajón de aplicaciones es Tumbito, no el de Capacitor
- [ ] La pantalla de ingreso muestra los accesos rápidos con los nombres
      de la base (Mateo Terrile, Ramiro Bianucci...). **Si aparecen, el
      APK está hablando con Supabase.** Si salen otros nombres o la
      lista está vacía, quedó en modo demostración: revisá que
      `environment.local.ts` exista y volvé a correr `npm run apk`.
- [ ] `mateo@tumbo.demo` + `Tumbo2026` entra y el panel lo saluda como Dueño
- [ ] `pendiente@tumbo.demo` **no** entra y explica que está pendiente de aprobación
- [ ] Cerrar la aplicación del todo y volver a abrirla mantiene la sesión
- [ ] Cerrar sesión vuelve al ingreso

---

## Trampas conocidas

Todas estas nos pasaron de verdad al armar el primer APK.

**"Please Select Gradle JVM to Import Project".** Android Studio avisa
que el JVM 25 es incompatible con Gradle 8.14.3. En el mismo cartel
ofrece **"Use JVM 21"**: ese es el botón. No cambia el Java del sistema,
solo el que usa este proyecto.

**El menú Build está todo gris.** No es un error: Gradle todavía está
importando el proyecto. Mirá la barra de abajo del todo — mientras diga
*"Analyzing project..."* hay que esperar. Cuando termina, el menú se
habilita solo. La primera vez tarda varios minutos.

**No aceptar las actualizaciones que ofrece Android Studio.** Van a
aparecer carteles de *"Project update recommended / AGP Upgrade
Assistant"*, *"Migrate to Gradle Daemon toolchain"* y *"Patch
available"*. **Ignorarlos**, sobre todo antes de una entrega: cambian
las versiones de Gradle y del plugin de Android, y lo que compilaba deja
de compilar. Regla simple: nada que diga *upgrade*, *update* o
*migrate*.

**El proxy del banco.** Si la terminal tiene `http_proxy` o `https_proxy`
apuntando a la red interna, `npm install` y las descargas de Gradle
fallan. Se limpian por sesión de CMD:

```bash
set http_proxy=
set https_proxy=
set HTTP_PROXY=
set HTTPS_PROXY=
```

**El proyecto de Supabase se pausa solo.** En el plan gratuito, después
de 7 días de baja actividad Supabase suspende el proyecto y la primera
consulta falla mientras despierta. El APK va a mostrar los accesos
rápidos vacíos y parecer roto. Conviene entrar al panel la noche
anterior a cada demostración.

**Avisos que NO son problemas.** Al final del build aparecen
`Using flatDir should be avoided` y `New Minor Gradle Version Available`.
Los genera Capacitor y no afectan nada.

---

## Qué se versiona y qué no

La carpeta `android/` **sí** va al repositorio: así cualquiera del
equipo genera el APK sin correr `npx cap add android`. Capacitor deja su
propio `.gitignore` adentro, que ya excluye lo que es de cada máquina:

| Se ignora | Por qué |
|---|---|
| `android/local.properties` | Tiene la ruta del SDK de tu computadora |
| `android/build/`, `android/.gradle/` | Salida de compilación, se regenera |
| `android/app/src/main/assets/public` | La web compilada, la copia `npm run apk` |

El `.apk` tampoco se versiona: pesa y se regenera en dos comandos.

---

## Por qué hay una configuración `apk` aparte

En `angular.json` hay tres configuraciones de build y cada una existe
por una razón:

| Configuración | Para qué |
|---|---|
| `production` | Lo que compila Vercel. Usa `environment.ts`, que va al repositorio **con los valores vacíos** |
| `local` | `npm run start:local`. Sin optimizar y con sourcemaps, para desarrollar contra Supabase |
| `apk` | Optimizada como producción, pero apuntando a `environment.local.ts` |

La `apk` existe porque las otras dos no sirven: `production` generaría un
APK en modo demostración, y `local` generaría uno sin optimizar y con
sourcemaps adentro.

> Que la clave publishable viaje dentro del APK **no es un problema**:
> es pública por diseño y lo que protege los datos es RLS. La que nunca
> puede salir de una terminal es la `service_role`.
