# Tumbito — Trabajo Final Integrador 2026

Aplicación móvil de gestión de restaurante, Grupo Tumbito.

## Integrantes

| Apellidos y nombres     | Módulos                                                                                                                                                                            | Branch     | Inicio     | Finalización |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------- | ------------ |
| Terrile, Mateo (líder)  |  Servicio (Cocina y Barra), Experiencia del cliente (Menú y Encuesta) y Seguimiento (Reportes, Consultas y Cuenta). Puntos 11 a 22. Arquitectura e integración                     | `terrile`  | 26/08/2026 | 02/10/2026   |
| Bianucci, Ramiro        | Experiencia del cliente (Juegos). Punto 15. Identidad visual, sonidos, vibración y proyecto Android, Operación (Pedidos),                                                          | `bianucci` | 26/08/2026 | 02/10/2026   |
| Cruz, Ignacio Agustín   | Gestión (Clientes) y Operación (Espera). Puntos 6 a 11                                                                                                                             | `cruz`     | 27/08/2026 | 30/09/2026   |
| Ferrari, Matías Gabriel | Gestión (Personal y Productos) y Operación (Mesas). Puntos 1 a 5. Autenticación, validaciones y APK                                                                                | `ferrari`  | 28/08/2026 | 28/09/2026   |

Las fechas son las del primer y el último commit de cada uno. `main` tiene la versión integrada que se presenta.

### Qué hizo cada uno

Sale del historial del repositorio: es lo que está mergeado en `main`.

**Terrile, Mateo**

- Estructura del proyecto Angular + Ionic, rutas, navegación, pantalla de ingreso y fondo con las ilustraciones de Tumbito.
- Puntos: cocina y bar, entrega, encuesta con gráficos, cuenta, propina y liberación de la mesa.
- Push con Firebase y correos con Brevo, disparados desde la base.
- Despliegue de la base en Supabase, pruebas automáticas y limpieza de los datos de prueba.
- Integración de las cuatro ramas en `main`.

**Bianucci, Ramiro**

- Tipografías (Poppins y Oh Chewy), recursos gráficos y ajustes de estilos.
- Proyecto de Android Studio y recursos nativos.
- Sonido al abrir y al cerrar (`AppAudio`) y vibración con Haptics.
- Juego «Recolección tumbito» con Phaser.
- Puntos 12 al 15

**Cruz, Ignacio Agustín**

- Primeras migraciones de Supabase y datos de prueba.
- Primera splash y arreglos del ingreso.
- Conexión del centro de operación con Supabase y realtime.
- Gestión de imágenes de productos y bajas con confirmación.
- Puntos 9 y 10: entrada sin cuenta, lista de espera y asignación de mesa.

**Ferrari, Matías Gabriel**

- Esquema con RLS, Supabase Auth, accesos rápidos y restauración de sesión.
- Seguridad de la base: freno a la escalada de privilegios y protección de las columnas de autorización.
- Validadores en `core/validacion`, iguales a las restricciones de la base.
- Puntos 1 a 4 con Edge Functions (`crear-empleado`, `guardar-producto`, `guardar-mesa`), cámara y lector de DNI.
- Registro de cliente con correos y push (puntos 5 a 8).
- Empaquetado del APK y la guía de [`docs/apk.md`](docs/apk.md).
- Script para armar el tablero del TFI en GitHub Projects.

## Cómo entrar

En la pantalla de ingreso, el carrusel de acceso rápido completa correo y clave de cada perfil; se entra con «Ingresar». La clave de las cuentas de demostración no se publica acá.

| Perfil             | Cuenta             |
| ------------------ | ------------------ |
| Dueño              | mateo@tumbo.demo   |
| Supervisor         | ramiro@tumbo.demo  |
| Maître             | ignacio@tumbo.demo |
| Mozo               | matias@tumbo.demo  |
| Cocinero           | alicia@tumbo.demo  |
| Cantinero          | bruno@tumbo.demo   |
| Cliente registrado | camila@tumbo.demo  |

El cliente anónimo no tiene cuenta: entra con «Entrar sin cuenta con el QR de ingreso». Para registrarse como cliente está «¿No tenés cuenta? Registrate».

Qué hace cada perfil en cada módulo, paso a paso: [`docs/flujos-por-modulo.md`](docs/flujos-por-modulo.md).

## Primera entrega

### Requisitos excluyentes

| #   | Requisito                                                | Estado                       | Dónde                                                      |
| --- | -------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| 1   | Splash estático y animado con ícono, grupo e integrantes | Hecho                        | `features/splash`, splash nativo de Android                |
| 2   | Textos en español, con tildes                            | Hecho                        | Toda la interfaz                                           |
| 3   | Sin `alert`, mensajes con controles                      | Hecho                        | No hay ningún `alert(` en `src`                            |
| 4   | Sonido al abrir y al cerrar                              | Hecho                        | `services/app-audio.service.ts`                            |
| 5   | Validación de todos los campos                           | Hecho                        | `core/validacion` y restricciones de la base               |
| 6   | Spinner con el logo en las esperas                       | Hecho                        | `shared/components/espera`                                 |
| 7   | Vibración ante los errores                               | Hecho                        | `core/services/errores.service.ts`                         |
| 8   | Accesos rápidos por perfil, sin combos                   | Hecho                        | Carrusel del ingreso                                       |
| 9   | Cierre de sesión que borra las credenciales              | Hecho                        | Borra la sesión y el registro de push, y vuelve al ingreso |
| 10  | Pantallas ocupadas por completo                          | Hecho                        | Diseño mobile first con el fondo de la marca               |
| 11  | Contraste, sin fondos blancos o negros ni modo oscuro    | Hecho                        | Paleta de la marca, con contraste WCAG AA                  |
| 12  | Nada cortado, descentrado ni abreviado                   | Hecho                        | Revisado en pantallas de 360 px                            |
| 13  | Encuesta con controles variados                          | Hecho                        | Siete preguntas, siete controles distintos                 |
| 14  | Push con la app abierta y cerrada                        | Hecho                        | Edge Function `avisar-push` con Firebase                   |
| 15  | Correos desde una cuenta empresarial                     | Falta confirmar el remitente | Edge Function `avisar-cliente` con Brevo                   |
| 16  | Lectura y generación de QR                               | Hecho                        | ML Kit para leer; `codigo-qr.service.ts` para generar      |
| 17  | Tres juegos funcionales                                  | Hecho                        | Recolección tumbito, adivinanza y piedra, papel o tijera   |
| 18  | Gráficos de encuestas, cada uno en su pantalla           | Hecho                        | Torta, barras y línea                                      |
| 19  | Puntos 1 a 22                                            | Hecho                        | Tabla siguiente                                            |

### Los 22 puntos

| #     | Funcionalidad                      | Responsable        |
| ----- | ---------------------------------- | ------------------ |
| 1     | Agregar empleado                   | Ferrari            |
| 2     | Agregar plato                      | Ferrari            |
| 3     | Agregar bebida                     | Ferrari            |
| 4     | Agregar mesa                       | Ferrari            |
| 5     | Registro de cliente                | Ferrari            |
| 6     | Clientes pendientes                | Cruz               |
| 7-8   | Rechazo y aceptación con correo    | Cruz               |
| 9     | Cliente anónimo y lista de espera  | Cruz / Terrile     |
| 10    | El maître asigna la mesa           | Cruz               |
| 11    | Menú y consulta al mozo            | Cruz / Terrile     |
| 12    | Realizar pedido                    | Bianucci            |
| 13    | Rechazar pedido                    | Bianucci            |
| 14    | Confirmar y derivar a cocina y bar | Bianucci            |
| 15    | Juegos y descuento                 | Bianucci / Terrile |
| 16-17 | Cocina y bar                       | Terrile            |
| 18    | Pedido completo                    | Terrile            |
| 19    | Entrega y recepción                | Terrile            |
| 20    | Encuesta y gráficos                | Terrile            |
| 21    | Cuenta y propina                   | Terrile            |
| 22    | Confirmación del pago y mesa libre | Terrile            |

Las reglas importantes las decide la base, no la pantalla: que una mesa no se asigne dos veces, el descuento de los juegos (solo el primer intento y sin acumular) y el total de la cuenta.

## Lo que falta

- Segunda entrega (07/11): factura en PDF al confirmar el pago e ingreso con redes sociales (punto 23). No empezada.
- Tercera entrega (28/11): reservas, pedidos a domicilio con mapa y repartidor, y menú con sensores (puntos 24 a 31). No empezada.

## Pantallas

![Animación de ingreso](docs/imagenes/pantallas/1-presentacion-gif.gif)

<table>
  <tr>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/01-ingreso.jpeg" width="200" alt="Pantalla de ingreso"><br>
      <sub><b>Ingreso</b><br>Formulario y accesos rápidos.</sub>
    </td>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/02-pantalla-principal.jpeg" width="200" alt="Pantalla principal"><br>
      <sub><b>Pantalla principal</b><br>Los módulos según el perfil.</sub>
    </td>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/03-pantalla-personal.jpeg" width="200" alt="Pantalla de personal"><br>
      <sub><b>Personal</b><br>Alta y baja de empleados.</sub>
    </td>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/04-pantalla-productos.jpeg" width="200" alt="Pantalla de productos"><br>
      <sub><b>Productos</b><br>Platos y bebidas con tres fotos.</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/05-pantalla-clientes.jpeg" width="200" alt="Pantalla de clientes"><br>
      <sub><b>Clientes pendientes</b><br>Aprobar o rechazar con motivo.</sub>
    </td>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/06-pantalla-pedidos.jpeg" width="200" alt="Pantalla de pedidos"><br>
      <sub><b>Pedidos</b><br>Estado del pedido de la mesa.</sub>
    </td>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/07-pantalla-mesas.jpeg" width="200" alt="Pantalla de mesas"><br>
      <sub><b>Mesas</b><br>Alta con foto y código QR.</sub>
    </td>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/08-pantalla-espera.jpeg" width="200" alt="Pantalla de lista de espera"><br>
      <sub><b>Lista de espera</b><br>El maître asigna la mesa.</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/09-pantalla-cocina.jpeg" width="200" alt="Pantalla de cocina"><br>
      <sub><b>Cocina</b><br>Pedidos por mesa, el más viejo primero.</sub>
    </td>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/10-pantalla-barra.jpeg" width="200" alt="Pantalla de barra"><br>
      <sub><b>Barra</b><br>Las bebidas de cada pedido.</sub>
    </td>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/11-pantalla-entrada.jpeg" width="200" alt="Pantalla de entrada"><br>
      <sub><b>Entrada</b><br>QR de ingreso y de la mesa.</sub>
    </td>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/12-pantalla-menu.jpeg" width="200" alt="Pantalla de menú"><br>
      <sub><b>Menú</b><br>Carta, importe y tiempo estimado.</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/13-pantalla-juegos.jpeg" width="200" alt="Pantalla de juegos"><br>
      <sub><b>Juegos</b><br>Descuentos de 10, 15 y 20 %.</sub>
    </td>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/14-pantalla-encuesta.jpeg" width="200" alt="Pantalla de encuesta"><br>
      <sub><b>Encuesta</b><br>Siete preguntas, siete controles.</sub>
    </td>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/15-pantalla-reportes.jpeg" width="200" alt="Pantalla de reportes"><br>
      <sub><b>Reportes</b><br>Gráficos de las encuestas.</sub>
    </td>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/16-pantalla-consultas.jpeg" width="200" alt="Pantalla de consultas"><br>
      <sub><b>Consultas</b><br>Sala entre el cliente y los mozos.</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="25%">
      <img src="docs/imagenes/pantallas/17-pantalla-cuenta.jpeg" width="200" alt="Pantalla de cuenta"><br>
      <sub><b>Cuenta</b><br>Detalle, propina y pago.</sub>
    </td>
  </tr>
</table>

## Cómo está hecho

Angular 22 con componentes standalone y signals, Ionic 9 para la interfaz, Capacitor 8 para Android y Supabase como backend (base PostgreSQL con RLS, Auth, Storage, Realtime y Edge Functions).

    src/app/
    ├── core/
    │   ├── dispositivo/     push, cámara y escáner de códigos
    │   ├── dni/             interpreta el código del DNI
    │   ├── imagenes/        compresión de fotos e ilustraciones
    │   ├── navegacion/      secciones y módulos por perfil
    │   ├── services/        sesión, operación, catálogo, QR
    │   ├── validacion/      las mismas reglas que la base
    │   ├── guards/
    │   ├── models/
    │   └── rutas/
    ├── features/
    │   ├── splash/
    │   ├── ingreso/
    │   ├── registro/
    │   ├── operacion/       la pantalla principal y sus secciones
    │   └── juegos/          Recolección tumbito (Phaser)
    ├── services/            sonidos
    └── shared/components/

    supabase/
    ├── migrations/          esquema, RLS, triggers y funciones (30)
    └── functions/           crear-empleado, guardar-producto, guardar-mesa,
                             eliminar-empleado, avisar-push, avisar-cliente

Rutas: `splash`, `ingreso`, `registro`, `operacion` y `juego-recoleccion`. Todas se cargan de forma lazy.

## Identidad visual

| Uso               | Color   |
| ----------------- | ------- |
| Amarillo de marca | #FBB103 |
| Crema brillante   | #FCEDBB |
| Naranja sombreado | #DC5B02 |
| Fondo crema       | #FBF1D5 |
| Azul de acento    | #006AE7 |
| Azul brillante    | #F8FBFD |
| Azul sombreado    | #003592 |

El texto corriente va en #003592 por contraste, las acciones y los títulos en #006AE7, y el amarillo y el naranja quedan para la marca y los estados.

## Criterios acordados

- Todo texto visible está en español y con tildes.
- No se usa `alert()`: los errores se muestran en la pantalla, con su cartel y vibración.
- No hay modo oscuro ni fondos blancos o negros puros.
- El logo se usa como está, sin deformarlo.
- Las validaciones de la interfaz se repiten en la base, con restricciones y RLS.
- Las altas de empleados, productos y mesas pasan por Edge Functions.
- El cierre de sesión borra la sesión y el registro de push del teléfono, y vuelve al ingreso.
- Las credenciales privadas no se guardan en el repositorio.

## Documentación

- [Cómo se opera cada módulo](docs/flujos-por-modulo.md)
- [Consigna del TFI, transcripta](docs/Trabajo-practico-2026-TFI.md)
- [Guía para armar el APK](docs/apk.md)
- [Contexto ampliado del proyecto](CONTEXTO-PROYECTO.md)
- [Manual visual de referencia](docs/manual-tfi.html)
- [Reglas para el equipo y los agentes](AGENTS.md)

## Índice de imágenes

<!-- indice-imagenes:inicio -->

261 imágenes.

<details>
<summary>Códigos QR (12)</summary>

- [docs/imagenes/qr-entrada.png](docs/imagenes/qr-entrada.png)
- [docs/imagenes/qr-mesa-1.png](docs/imagenes/qr-mesa-1.png)
- [docs/imagenes/qr-mesa-2.png](docs/imagenes/qr-mesa-2.png)
- [docs/imagenes/qr-mesa-26.png](docs/imagenes/qr-mesa-26.png)
- [docs/imagenes/qr-mesa-3.png](docs/imagenes/qr-mesa-3.png)
- [docs/imagenes/qr-mesa-4.png](docs/imagenes/qr-mesa-4.png)
- [docs/imagenes/qr-mesa-5.png](docs/imagenes/qr-mesa-5.png)
- [docs/imagenes/qr-propina-0.png](docs/imagenes/qr-propina-0.png)
- [docs/imagenes/qr-propina-10.png](docs/imagenes/qr-propina-10.png)
- [docs/imagenes/qr-propina-15.png](docs/imagenes/qr-propina-15.png)
- [docs/imagenes/qr-propina-20.png](docs/imagenes/qr-propina-20.png)
- [docs/imagenes/qr-propina-5.png](docs/imagenes/qr-propina-5.png)

</details>

<details>
<summary>Capturas de pantalla (18)</summary>

- [docs/imagenes/pantallas/01-ingreso.jpeg](docs/imagenes/pantallas/01-ingreso.jpeg)
- [docs/imagenes/pantallas/02-pantalla-principal.jpeg](docs/imagenes/pantallas/02-pantalla-principal.jpeg)
- [docs/imagenes/pantallas/03-pantalla-personal.jpeg](docs/imagenes/pantallas/03-pantalla-personal.jpeg)
- [docs/imagenes/pantallas/04-pantalla-productos.jpeg](docs/imagenes/pantallas/04-pantalla-productos.jpeg)
- [docs/imagenes/pantallas/05-pantalla-clientes.jpeg](docs/imagenes/pantallas/05-pantalla-clientes.jpeg)
- [docs/imagenes/pantallas/06-pantalla-pedidos.jpeg](docs/imagenes/pantallas/06-pantalla-pedidos.jpeg)
- [docs/imagenes/pantallas/07-pantalla-mesas.jpeg](docs/imagenes/pantallas/07-pantalla-mesas.jpeg)
- [docs/imagenes/pantallas/08-pantalla-espera.jpeg](docs/imagenes/pantallas/08-pantalla-espera.jpeg)
- [docs/imagenes/pantallas/09-pantalla-cocina.jpeg](docs/imagenes/pantallas/09-pantalla-cocina.jpeg)
- [docs/imagenes/pantallas/1-presentacion-gif.gif](docs/imagenes/pantallas/1-presentacion-gif.gif)
- [docs/imagenes/pantallas/10-pantalla-barra.jpeg](docs/imagenes/pantallas/10-pantalla-barra.jpeg)
- [docs/imagenes/pantallas/11-pantalla-entrada.jpeg](docs/imagenes/pantallas/11-pantalla-entrada.jpeg)
- [docs/imagenes/pantallas/12-pantalla-menu.jpeg](docs/imagenes/pantallas/12-pantalla-menu.jpeg)
- [docs/imagenes/pantallas/13-pantalla-juegos.jpeg](docs/imagenes/pantallas/13-pantalla-juegos.jpeg)
- [docs/imagenes/pantallas/14-pantalla-encuesta.jpeg](docs/imagenes/pantallas/14-pantalla-encuesta.jpeg)
- [docs/imagenes/pantallas/15-pantalla-reportes.jpeg](docs/imagenes/pantallas/15-pantalla-reportes.jpeg)
- [docs/imagenes/pantallas/16-pantalla-consultas.jpeg](docs/imagenes/pantallas/16-pantalla-consultas.jpeg)
- [docs/imagenes/pantallas/17-pantalla-cuenta.jpeg](docs/imagenes/pantallas/17-pantalla-cuenta.jpeg)

</details>

<details>
<summary>Marca y documentación (3)</summary>

- [docs/imagenes/logo-nombre.png](docs/imagenes/logo-nombre.png)
- [docs/imagenes/logo.png](docs/imagenes/logo.png)
- [docs/imagenes/splash-estatica.svg](docs/imagenes/splash-estatica.svg)

</details>

<details>
<summary>DNI de prueba (12)</summary>

- [docs/qr-dni-de-prueba/01-juarez.png](docs/qr-dni-de-prueba/01-juarez.png)
- [docs/qr-dni-de-prueba/02-escalante.png](docs/qr-dni-de-prueba/02-escalante.png)
- [docs/qr-dni-de-prueba/03-leguizamon.png](docs/qr-dni-de-prueba/03-leguizamon.png)
- [docs/qr-dni-de-prueba/04-duarte.png](docs/qr-dni-de-prueba/04-duarte.png)
- [docs/qr-dni-de-prueba/05-tolosa.png](docs/qr-dni-de-prueba/05-tolosa.png)
- [docs/qr-dni-de-prueba/06-gauna.png](docs/qr-dni-de-prueba/06-gauna.png)
- [docs/qr-dni-de-prueba/07-zalazar.png](docs/qr-dni-de-prueba/07-zalazar.png)
- [docs/qr-dni-de-prueba/08-bordon.png](docs/qr-dni-de-prueba/08-bordon.png)
- [docs/qr-dni-de-prueba/09-zalazar.png](docs/qr-dni-de-prueba/09-zalazar.png)
- [docs/qr-dni-de-prueba/10-ferreyra.png](docs/qr-dni-de-prueba/10-ferreyra.png)
- [docs/qr-dni-de-prueba/11-ojeda.png](docs/qr-dni-de-prueba/11-ojeda.png)
- [docs/qr-dni-de-prueba/12-acuna.png](docs/qr-dni-de-prueba/12-acuna.png)

</details>

<details>
<summary>Imágenes de la aplicación (58)</summary>

- [public/imagenes/logo-correo.png](public/imagenes/logo-correo.png)
- [public/imagenes/logo-nombre-mobile.webp](public/imagenes/logo-nombre-mobile.webp)
- [public/imagenes/logo-nombre.png](public/imagenes/logo-nombre.png)
- [public/imagenes/logo-splash.webp](public/imagenes/logo-splash.webp)
- [public/imagenes/logo.png](public/imagenes/logo.png)
- [public/imagenes/qr-entrada.png](public/imagenes/qr-entrada.png)
- [public/imagenes/qr-mesa-1.png](public/imagenes/qr-mesa-1.png)
- [public/imagenes/qr-mesa-2.png](public/imagenes/qr-mesa-2.png)
- [public/imagenes/qr-mesa-3.png](public/imagenes/qr-mesa-3.png)
- [public/imagenes/qr-mesa-4.png](public/imagenes/qr-mesa-4.png)
- [public/imagenes/qr-mesa-5.png](public/imagenes/qr-mesa-5.png)
- [public/imagenes/qr-propina-0.png](public/imagenes/qr-propina-0.png)
- [public/imagenes/qr-propina-10.png](public/imagenes/qr-propina-10.png)
- [public/imagenes/qr-propina-15.png](public/imagenes/qr-propina-15.png)
- [public/imagenes/qr-propina-20.png](public/imagenes/qr-propina-20.png)
- [public/imagenes/qr-propina-5.png](public/imagenes/qr-propina-5.png)
- [public/imagenes/splash-estatica.svg](public/imagenes/splash-estatica.svg)
- [public/imagenes/tumbito/cafe-240.webp](public/imagenes/tumbito/cafe-240.webp)
- [public/imagenes/tumbito/cafe-480.webp](public/imagenes/tumbito/cafe-480.webp)
- [public/imagenes/tumbito/cafe-960.webp](public/imagenes/tumbito/cafe-960.webp)
- [public/imagenes/tumbito/cafe.webp](public/imagenes/tumbito/cafe.webp)
- [public/imagenes/tumbito/carne-240.webp](public/imagenes/tumbito/carne-240.webp)
- [public/imagenes/tumbito/carne-480.webp](public/imagenes/tumbito/carne-480.webp)
- [public/imagenes/tumbito/carne-960.webp](public/imagenes/tumbito/carne-960.webp)
- [public/imagenes/tumbito/carne.webp](public/imagenes/tumbito/carne.webp)
- [public/imagenes/tumbito/cubiertos-240.webp](public/imagenes/tumbito/cubiertos-240.webp)
- [public/imagenes/tumbito/cubiertos-480.webp](public/imagenes/tumbito/cubiertos-480.webp)
- [public/imagenes/tumbito/cubiertos-960.webp](public/imagenes/tumbito/cubiertos-960.webp)
- [public/imagenes/tumbito/cubiertos.webp](public/imagenes/tumbito/cubiertos.webp)
- [public/imagenes/tumbito/ensalada-240.webp](public/imagenes/tumbito/ensalada-240.webp)
- [public/imagenes/tumbito/ensalada-480.webp](public/imagenes/tumbito/ensalada-480.webp)
- [public/imagenes/tumbito/ensalada-960.webp](public/imagenes/tumbito/ensalada-960.webp)
- [public/imagenes/tumbito/ensalada.webp](public/imagenes/tumbito/ensalada.webp)
- [public/imagenes/tumbito/fideos-240.webp](public/imagenes/tumbito/fideos-240.webp)
- [public/imagenes/tumbito/fideos-480.webp](public/imagenes/tumbito/fideos-480.webp)
- [public/imagenes/tumbito/fideos-960.webp](public/imagenes/tumbito/fideos-960.webp)
- [public/imagenes/tumbito/fideos.webp](public/imagenes/tumbito/fideos.webp)
- [public/imagenes/tumbito/pizza-240.webp](public/imagenes/tumbito/pizza-240.webp)
- [public/imagenes/tumbito/pizza-480.webp](public/imagenes/tumbito/pizza-480.webp)
- [public/imagenes/tumbito/pizza-960.webp](public/imagenes/tumbito/pizza-960.webp)
- [public/imagenes/tumbito/pizza.webp](public/imagenes/tumbito/pizza.webp)
- [public/imagenes/tumbito/rodillo-240.webp](public/imagenes/tumbito/rodillo-240.webp)
- [public/imagenes/tumbito/rodillo-480.webp](public/imagenes/tumbito/rodillo-480.webp)
- [public/imagenes/tumbito/rodillo-960.webp](public/imagenes/tumbito/rodillo-960.webp)
- [public/imagenes/tumbito/rodillo.webp](public/imagenes/tumbito/rodillo.webp)
- [public/imagenes/tumbito/saleros-240.webp](public/imagenes/tumbito/saleros-240.webp)
- [public/imagenes/tumbito/saleros-480.webp](public/imagenes/tumbito/saleros-480.webp)
- [public/imagenes/tumbito/saleros-960.webp](public/imagenes/tumbito/saleros-960.webp)
- [public/imagenes/tumbito/saleros.webp](public/imagenes/tumbito/saleros.webp)
- [public/imagenes/tumbito/sopa-240.webp](public/imagenes/tumbito/sopa-240.webp)
- [public/imagenes/tumbito/sopa-480.webp](public/imagenes/tumbito/sopa-480.webp)
- [public/imagenes/tumbito/sopa-960.webp](public/imagenes/tumbito/sopa-960.webp)
- [public/imagenes/tumbito/sopa.webp](public/imagenes/tumbito/sopa.webp)
- [public/imagenes/tumbito/vino-240.webp](public/imagenes/tumbito/vino-240.webp)
- [public/imagenes/tumbito/vino-480.webp](public/imagenes/tumbito/vino-480.webp)
- [public/imagenes/tumbito/vino-960.webp](public/imagenes/tumbito/vino-960.webp)
- [public/imagenes/tumbito/vino.webp](public/imagenes/tumbito/vino.webp)
- [public/imagenes/vaquita.webp](public/imagenes/vaquita.webp)

</details>

<details>
<summary>Juego «Recolección tumbito» (7)</summary>

- [public/assets/juego-recoleccion-assets/brocoli.png](public/assets/juego-recoleccion-assets/brocoli.png)
- [public/assets/juego-recoleccion-assets/fondo.png](public/assets/juego-recoleccion-assets/fondo.png)
- [public/assets/juego-recoleccion-assets/pizza.png](public/assets/juego-recoleccion-assets/pizza.png)
- [public/assets/juego-recoleccion-assets/pollo.png](public/assets/juego-recoleccion-assets/pollo.png)
- [public/assets/juego-recoleccion-assets/sopa.png](public/assets/juego-recoleccion-assets/sopa.png)
- [public/assets/juego-recoleccion-assets/tortita.png](public/assets/juego-recoleccion-assets/tortita.png)
- [public/assets/juego-recoleccion-assets/tumbito-avatar.png](public/assets/juego-recoleccion-assets/tumbito-avatar.png)

</details>

<details>
<summary>Ilustraciones de Tumbito (91)</summary>

- [public/assets/icon-background.png](public/assets/icon-background.png)
- [public/assets/icon-foreground.png](public/assets/icon-foreground.png)
- [public/assets/icon.png](public/assets/icon.png)
- [public/assets/splash-dark.png](public/assets/splash-dark.png)
- [public/assets/splash.png](public/assets/splash.png)
- [public/assets/tumbito/master/cafe.png](public/assets/tumbito/master/cafe.png)
- [public/assets/tumbito/master/carne.png](public/assets/tumbito/master/carne.png)
- [public/assets/tumbito/master/cubiertos.png](public/assets/tumbito/master/cubiertos.png)
- [public/assets/tumbito/master/ensalada.png](public/assets/tumbito/master/ensalada.png)
- [public/assets/tumbito/master/fideos.png](public/assets/tumbito/master/fideos.png)
- [public/assets/tumbito/master/pizza.png](public/assets/tumbito/master/pizza.png)
- [public/assets/tumbito/master/rodillo.png](public/assets/tumbito/master/rodillo.png)
- [public/assets/tumbito/master/saleros.png](public/assets/tumbito/master/saleros.png)
- [public/assets/tumbito/master/sopa.png](public/assets/tumbito/master/sopa.png)
- [public/assets/tumbito/master/vino.png](public/assets/tumbito/master/vino.png)
- [public/assets/tumbito/previews/rendered/cafe-light.png](public/assets/tumbito/previews/rendered/cafe-light.png)
- [public/assets/tumbito/previews/rendered/cafe-png.png](public/assets/tumbito/previews/rendered/cafe-png.png)
- [public/assets/tumbito/previews/rendered/cafe-svg.png](public/assets/tumbito/previews/rendered/cafe-svg.png)
- [public/assets/tumbito/previews/rendered/cafe-webp.png](public/assets/tumbito/previews/rendered/cafe-webp.png)
- [public/assets/tumbito/previews/rendered/carne-light.png](public/assets/tumbito/previews/rendered/carne-light.png)
- [public/assets/tumbito/previews/rendered/carne-png.png](public/assets/tumbito/previews/rendered/carne-png.png)
- [public/assets/tumbito/previews/rendered/carne-svg.png](public/assets/tumbito/previews/rendered/carne-svg.png)
- [public/assets/tumbito/previews/rendered/carne-webp.png](public/assets/tumbito/previews/rendered/carne-webp.png)
- [public/assets/tumbito/previews/rendered/contact-light.png](public/assets/tumbito/previews/rendered/contact-light.png)
- [public/assets/tumbito/previews/rendered/contact.png](public/assets/tumbito/previews/rendered/contact.png)
- [public/assets/tumbito/previews/rendered/ensalada-light.png](public/assets/tumbito/previews/rendered/ensalada-light.png)
- [public/assets/tumbito/previews/rendered/ensalada-png.png](public/assets/tumbito/previews/rendered/ensalada-png.png)
- [public/assets/tumbito/previews/rendered/ensalada-svg.png](public/assets/tumbito/previews/rendered/ensalada-svg.png)
- [public/assets/tumbito/previews/rendered/ensalada-webp.png](public/assets/tumbito/previews/rendered/ensalada-webp.png)
- [public/assets/tumbito/previews/rendered/fideos-light.png](public/assets/tumbito/previews/rendered/fideos-light.png)
- [public/assets/tumbito/previews/rendered/fideos-png.png](public/assets/tumbito/previews/rendered/fideos-png.png)
- [public/assets/tumbito/previews/rendered/fideos-svg.png](public/assets/tumbito/previews/rendered/fideos-svg.png)
- [public/assets/tumbito/previews/rendered/fideos-webp.png](public/assets/tumbito/previews/rendered/fideos-webp.png)
- [public/assets/tumbito/previews/rendered/pizza-light.png](public/assets/tumbito/previews/rendered/pizza-light.png)
- [public/assets/tumbito/previews/rendered/pizza-png.png](public/assets/tumbito/previews/rendered/pizza-png.png)
- [public/assets/tumbito/previews/rendered/pizza-svg.png](public/assets/tumbito/previews/rendered/pizza-svg.png)
- [public/assets/tumbito/previews/rendered/pizza-webp.png](public/assets/tumbito/previews/rendered/pizza-webp.png)
- [public/assets/tumbito/previews/rendered/sopa-light.png](public/assets/tumbito/previews/rendered/sopa-light.png)
- [public/assets/tumbito/previews/rendered/sopa-png.png](public/assets/tumbito/previews/rendered/sopa-png.png)
- [public/assets/tumbito/previews/rendered/sopa-svg.png](public/assets/tumbito/previews/rendered/sopa-svg.png)
- [public/assets/tumbito/previews/rendered/sopa-webp.png](public/assets/tumbito/previews/rendered/sopa-webp.png)
- [public/assets/tumbito/reports/variants/cafe/balanced.svg](public/assets/tumbito/reports/variants/cafe/balanced.svg)
- [public/assets/tumbito/reports/variants/cafe/detail.svg](public/assets/tumbito/reports/variants/cafe/detail.svg)
- [public/assets/tumbito/reports/variants/cafe/light.svg](public/assets/tumbito/reports/variants/cafe/light.svg)
- [public/assets/tumbito/reports/variants/carne/balanced.svg](public/assets/tumbito/reports/variants/carne/balanced.svg)
- [public/assets/tumbito/reports/variants/carne/detail.svg](public/assets/tumbito/reports/variants/carne/detail.svg)
- [public/assets/tumbito/reports/variants/carne/light.svg](public/assets/tumbito/reports/variants/carne/light.svg)
- [public/assets/tumbito/reports/variants/cubiertos/balanced.svg](public/assets/tumbito/reports/variants/cubiertos/balanced.svg)
- [public/assets/tumbito/reports/variants/cubiertos/detail.svg](public/assets/tumbito/reports/variants/cubiertos/detail.svg)
- [public/assets/tumbito/reports/variants/cubiertos/light.svg](public/assets/tumbito/reports/variants/cubiertos/light.svg)
- [public/assets/tumbito/reports/variants/ensalada/balanced.svg](public/assets/tumbito/reports/variants/ensalada/balanced.svg)
- [public/assets/tumbito/reports/variants/ensalada/detail.svg](public/assets/tumbito/reports/variants/ensalada/detail.svg)
- [public/assets/tumbito/reports/variants/ensalada/light.svg](public/assets/tumbito/reports/variants/ensalada/light.svg)
- [public/assets/tumbito/reports/variants/fideos/balanced.svg](public/assets/tumbito/reports/variants/fideos/balanced.svg)
- [public/assets/tumbito/reports/variants/fideos/detail.svg](public/assets/tumbito/reports/variants/fideos/detail.svg)
- [public/assets/tumbito/reports/variants/fideos/light.svg](public/assets/tumbito/reports/variants/fideos/light.svg)
- [public/assets/tumbito/reports/variants/pizza/balanced.svg](public/assets/tumbito/reports/variants/pizza/balanced.svg)
- [public/assets/tumbito/reports/variants/pizza/detail.svg](public/assets/tumbito/reports/variants/pizza/detail.svg)
- [public/assets/tumbito/reports/variants/pizza/light.svg](public/assets/tumbito/reports/variants/pizza/light.svg)
- [public/assets/tumbito/reports/variants/rodillo/balanced.svg](public/assets/tumbito/reports/variants/rodillo/balanced.svg)
- [public/assets/tumbito/reports/variants/rodillo/detail.svg](public/assets/tumbito/reports/variants/rodillo/detail.svg)
- [public/assets/tumbito/reports/variants/rodillo/light.svg](public/assets/tumbito/reports/variants/rodillo/light.svg)
- [public/assets/tumbito/reports/variants/saleros/balanced.svg](public/assets/tumbito/reports/variants/saleros/balanced.svg)
- [public/assets/tumbito/reports/variants/saleros/detail.svg](public/assets/tumbito/reports/variants/saleros/detail.svg)
- [public/assets/tumbito/reports/variants/saleros/light.svg](public/assets/tumbito/reports/variants/saleros/light.svg)
- [public/assets/tumbito/reports/variants/sopa/balanced.svg](public/assets/tumbito/reports/variants/sopa/balanced.svg)
- [public/assets/tumbito/reports/variants/sopa/detail.svg](public/assets/tumbito/reports/variants/sopa/detail.svg)
- [public/assets/tumbito/reports/variants/sopa/light.svg](public/assets/tumbito/reports/variants/sopa/light.svg)
- [public/assets/tumbito/reports/variants/vino/balanced.svg](public/assets/tumbito/reports/variants/vino/balanced.svg)
- [public/assets/tumbito/reports/variants/vino/detail.svg](public/assets/tumbito/reports/variants/vino/detail.svg)
- [public/assets/tumbito/reports/variants/vino/light.svg](public/assets/tumbito/reports/variants/vino/light.svg)
- [public/assets/tumbito/svg/cafe.svg](public/assets/tumbito/svg/cafe.svg)
- [public/assets/tumbito/svg/carne.svg](public/assets/tumbito/svg/carne.svg)
- [public/assets/tumbito/svg/cubiertos.svg](public/assets/tumbito/svg/cubiertos.svg)
- [public/assets/tumbito/svg/ensalada.svg](public/assets/tumbito/svg/ensalada.svg)
- [public/assets/tumbito/svg/fideos.svg](public/assets/tumbito/svg/fideos.svg)
- [public/assets/tumbito/svg/pizza.svg](public/assets/tumbito/svg/pizza.svg)
- [public/assets/tumbito/svg/rodillo.svg](public/assets/tumbito/svg/rodillo.svg)
- [public/assets/tumbito/svg/saleros.svg](public/assets/tumbito/svg/saleros.svg)
- [public/assets/tumbito/svg/sopa.svg](public/assets/tumbito/svg/sopa.svg)
- [public/assets/tumbito/svg/vino.svg](public/assets/tumbito/svg/vino.svg)
- [public/assets/tumbito/webp/cafe.webp](public/assets/tumbito/webp/cafe.webp)
- [public/assets/tumbito/webp/carne.webp](public/assets/tumbito/webp/carne.webp)
- [public/assets/tumbito/webp/cubiertos.webp](public/assets/tumbito/webp/cubiertos.webp)
- [public/assets/tumbito/webp/ensalada.webp](public/assets/tumbito/webp/ensalada.webp)
- [public/assets/tumbito/webp/fideos.webp](public/assets/tumbito/webp/fideos.webp)
- [public/assets/tumbito/webp/pizza.webp](public/assets/tumbito/webp/pizza.webp)
- [public/assets/tumbito/webp/rodillo.webp](public/assets/tumbito/webp/rodillo.webp)
- [public/assets/tumbito/webp/saleros.webp](public/assets/tumbito/webp/saleros.webp)
- [public/assets/tumbito/webp/sopa.webp](public/assets/tumbito/webp/sopa.webp)
- [public/assets/tumbito/webp/vino.webp](public/assets/tumbito/webp/vino.webp)

</details>

<details>
<summary>Íconos web (10)</summary>

- [public/apple-touch-icon.png](public/apple-touch-icon.png)
- [public/favicon.ico](public/favicon.ico)
- [public/icons/icon-16.png](public/icons/icon-16.png)
- [public/icons/icon-180.png](public/icons/icon-180.png)
- [public/icons/icon-192-maskable.png](public/icons/icon-192-maskable.png)
- [public/icons/icon-192.png](public/icons/icon-192.png)
- [public/icons/icon-32.png](public/icons/icon-32.png)
- [public/icons/icon-48.png](public/icons/icon-48.png)
- [public/icons/icon-512-maskable.png](public/icons/icon-512-maskable.png)
- [public/icons/icon-512.png](public/icons/icon-512.png)

</details>

<details>
<summary>Recursos de Android (50)</summary>

- [android/app/src/main/res/drawable-land-hdpi/splash.png](android/app/src/main/res/drawable-land-hdpi/splash.png)
- [android/app/src/main/res/drawable-land-ldpi/splash.png](android/app/src/main/res/drawable-land-ldpi/splash.png)
- [android/app/src/main/res/drawable-land-mdpi/splash.png](android/app/src/main/res/drawable-land-mdpi/splash.png)
- [android/app/src/main/res/drawable-land-night-hdpi/splash.png](android/app/src/main/res/drawable-land-night-hdpi/splash.png)
- [android/app/src/main/res/drawable-land-night-ldpi/splash.png](android/app/src/main/res/drawable-land-night-ldpi/splash.png)
- [android/app/src/main/res/drawable-land-night-mdpi/splash.png](android/app/src/main/res/drawable-land-night-mdpi/splash.png)
- [android/app/src/main/res/drawable-land-night-xhdpi/splash.png](android/app/src/main/res/drawable-land-night-xhdpi/splash.png)
- [android/app/src/main/res/drawable-land-night-xxhdpi/splash.png](android/app/src/main/res/drawable-land-night-xxhdpi/splash.png)
- [android/app/src/main/res/drawable-land-night-xxxhdpi/splash.png](android/app/src/main/res/drawable-land-night-xxxhdpi/splash.png)
- [android/app/src/main/res/drawable-land-xhdpi/splash.png](android/app/src/main/res/drawable-land-xhdpi/splash.png)
- [android/app/src/main/res/drawable-land-xxhdpi/splash.png](android/app/src/main/res/drawable-land-xxhdpi/splash.png)
- [android/app/src/main/res/drawable-land-xxxhdpi/splash.png](android/app/src/main/res/drawable-land-xxxhdpi/splash.png)
- [android/app/src/main/res/drawable-night/splash.png](android/app/src/main/res/drawable-night/splash.png)
- [android/app/src/main/res/drawable-port-hdpi/splash.png](android/app/src/main/res/drawable-port-hdpi/splash.png)
- [android/app/src/main/res/drawable-port-ldpi/splash.png](android/app/src/main/res/drawable-port-ldpi/splash.png)
- [android/app/src/main/res/drawable-port-mdpi/splash.png](android/app/src/main/res/drawable-port-mdpi/splash.png)
- [android/app/src/main/res/drawable-port-night-hdpi/splash.png](android/app/src/main/res/drawable-port-night-hdpi/splash.png)
- [android/app/src/main/res/drawable-port-night-ldpi/splash.png](android/app/src/main/res/drawable-port-night-ldpi/splash.png)
- [android/app/src/main/res/drawable-port-night-mdpi/splash.png](android/app/src/main/res/drawable-port-night-mdpi/splash.png)
- [android/app/src/main/res/drawable-port-night-xhdpi/splash.png](android/app/src/main/res/drawable-port-night-xhdpi/splash.png)
- [android/app/src/main/res/drawable-port-night-xxhdpi/splash.png](android/app/src/main/res/drawable-port-night-xxhdpi/splash.png)
- [android/app/src/main/res/drawable-port-night-xxxhdpi/splash.png](android/app/src/main/res/drawable-port-night-xxxhdpi/splash.png)
- [android/app/src/main/res/drawable-port-xhdpi/splash.png](android/app/src/main/res/drawable-port-xhdpi/splash.png)
- [android/app/src/main/res/drawable-port-xxhdpi/splash.png](android/app/src/main/res/drawable-port-xxhdpi/splash.png)
- [android/app/src/main/res/drawable-port-xxxhdpi/splash.png](android/app/src/main/res/drawable-port-xxxhdpi/splash.png)
- [android/app/src/main/res/drawable/splash.png](android/app/src/main/res/drawable/splash.png)
- [android/app/src/main/res/mipmap-hdpi/ic_launcher_background.png](android/app/src/main/res/mipmap-hdpi/ic_launcher_background.png)
- [android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png](android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png)
- [android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png](android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png)
- [android/app/src/main/res/mipmap-hdpi/ic_launcher.png](android/app/src/main/res/mipmap-hdpi/ic_launcher.png)
- [android/app/src/main/res/mipmap-ldpi/ic_launcher_background.png](android/app/src/main/res/mipmap-ldpi/ic_launcher_background.png)
- [android/app/src/main/res/mipmap-ldpi/ic_launcher_foreground.png](android/app/src/main/res/mipmap-ldpi/ic_launcher_foreground.png)
- [android/app/src/main/res/mipmap-ldpi/ic_launcher_round.png](android/app/src/main/res/mipmap-ldpi/ic_launcher_round.png)
- [android/app/src/main/res/mipmap-ldpi/ic_launcher.png](android/app/src/main/res/mipmap-ldpi/ic_launcher.png)
- [android/app/src/main/res/mipmap-mdpi/ic_launcher_background.png](android/app/src/main/res/mipmap-mdpi/ic_launcher_background.png)
- [android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png](android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png)
- [android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png](android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png)
- [android/app/src/main/res/mipmap-mdpi/ic_launcher.png](android/app/src/main/res/mipmap-mdpi/ic_launcher.png)
- [android/app/src/main/res/mipmap-xhdpi/ic_launcher_background.png](android/app/src/main/res/mipmap-xhdpi/ic_launcher_background.png)
- [android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png](android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png)
- [android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png](android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png)
- [android/app/src/main/res/mipmap-xhdpi/ic_launcher.png](android/app/src/main/res/mipmap-xhdpi/ic_launcher.png)
- [android/app/src/main/res/mipmap-xxhdpi/ic_launcher_background.png](android/app/src/main/res/mipmap-xxhdpi/ic_launcher_background.png)
- [android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png](android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png)
- [android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png](android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png)
- [android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png](android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png)
- [android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_background.png](android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_background.png)
- [android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png](android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png)
- [android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png](android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png)
- [android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png](android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png)

</details>

<!-- indice-imagenes:fin -->
