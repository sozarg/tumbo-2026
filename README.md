# TUMBO — Trabajo Final Integrador 2026

Aplicación móvil de gestión de restaurante para la Tecnicatura Universitaria en Programación (UTN Avellaneda).

## Estado actual

La base Angular + Ionic está implementada y compila. La entrega actual incluye:

- identidad visual basada en el logo entregado;
- splash estática (docs/imagenes/splash-estatica.svg);
- splash de inicialización mínima con el ícono centrado;
- pantalla de bienvenida separada con marca, ingreso y metadata institucional;
- formulario de ingreso con validación visible de correo y clave;
- accesos rápidos relacionados con usuarios de prueba;
- sesión, cierre de sesión y navegación por pantalla;
- centro de pruebas responsive con el flujo mock de los puntos 1 a 22;
- estado mock desacoplado para altas, catálogo, mesas, espera, pedidos, cocina, bar, juegos, encuestas, cuenta, propina y pago.

La capa de Supabase está implementada y probada: el esquema completo con RLS vive en supabase/migrations, y la autenticación real, los accesos rápidos leídos de la base, el control de estado pendiente/rechazado y la restauración de sesión están en src/app/core. Falta únicamente crear el proyecto en supabase.com y aplicar las migraciones; los pasos están en supabase/README.md.

Mientras eso no esté hecho, la aplicación arranca en modo demostración con AutenticacionMockService y DemoRestauranteService, sin que haga falta configurar nada. app.config.ts elige el adaptador según si environment tiene URL y clave.

Para trabajar contra Supabase no se toca environment.ts: se copia environment.example.ts a environment.local.ts (ignorado por git) y se arranca con npm run start:local. No se guardan secretos reales en el repositorio.

## Ejecutar el proyecto

Requisitos: Node.js LTS y npm.

    npm install
    npm start          # modo demostración, no necesita configuración
    npm run start:local # contra Supabase, requiere environment.local.ts

Abrir http://localhost:4200/.

Para validar la compilación y los tests:

    npm run build
    npm test -- --watch=false

## Usuarios de demostración

La clave provisional para el ingreso por formulario es Tumbo2026, tanto en modo demostración como con Supabase. Los accesos rápidos se generan a partir de los usuarios existentes: en modo demostración salen del mock, y con Supabase salen de la base, como exige el requisito excluyente de la cátedra.

| Correo | Perfil |
|---|---|
| mateo@tumbo.demo | Dueño |
| ramiro@tumbo.demo | Supervisor |
| ignacio@tumbo.demo | Maitre |
| matias@tumbo.demo | Mozo |
| alicia@tumbo.demo | Cocinero |
| bruno@tumbo.demo | Cantinero |
| camila@tumbo.demo | Cliente registrado |
| anonimo@tumbo.demo | Cliente anónimo |

Después de ingresar, el botón Abrir centro de pruebas del flujo completo permite recorrer las funcionalidades mock según el perfil.

## Integrantes y responsabilidades preliminares

| Apellidos y nombres | Tareas asignadas | Branch sugerida |
|---|---|---|
| Terrile, Mateo (líder) | Organización del repositorio, README, integración general y coordinación | feat/integracion-general |
| Bianucci, Ramiro | Diseño del ícono y de la pantalla de presentación estática | feat/icono-splash-estatica |
| Cruz, Ignacio Agustín | Diseño de la pantalla de presentación dinámica | feat/splash-dinamica |
| Ferrari, Matías Gabriel | Formulario de ingreso, validaciones, Supabase, accesos rápidos y cierre de sesión | feat/ingreso-autenticacion |

La rama main queda reservada para la versión integrada que se presenta.

## Identidad visual

| Uso | Color |
|---|---|
| Amarillo de marca | #FBB103 |
| Crema brillante | #FCEDBB |
| Naranja sombreado | #DC5B02 |
| Fondo crema | #FBF1D5 |
| Azul de acento | #006AE7 |
| Azul brillante | #F8FBFD |
| Azul sombreado | #003592 |

Se usa #003592 para texto corriente por contraste, #006AE7 para acciones y títulos destacados, y amarillo/naranja para la marca y estados.

## Recursos

- Ícono: docs/imagenes/logo.png
- Logo con nombre: docs/imagenes/logo-nombre.png
- Splash estática: docs/imagenes/splash-estatica.svg
- Puesta en marcha de Supabase: supabase/README.md
- Consigna original del TFI: docs/Trabajo-practico-2026-TFI.pdf
- Contexto ampliado del proyecto: CONTEXTO-PROYECTO.md
- Manual visual de referencia: docs/manual-tfi.html
- Reglas para agentes y equipo: AGENTS.md

Los códigos QR de ingreso, mesas y propina se encuentran también en docs/imagenes/qr-*.png.

## Arquitectura

    src/app/
    ├── core/
    │   ├── guards/
    │   ├── models/
    │   └── services/
    └── features/
        ├── presentacion/
        ├── ingreso/
        ├── inicio/
        └── operacion/

Las rutas de funcionalidades se cargan de forma lazy. La ruta `splash` muestra únicamente el ícono durante el primer render y deriva inmediatamente a `presentacion`, que contiene la pantalla de bienvenida interactiva. Los componentes usan standalone, signals, formularios reactivos y estilos SCSS mobile first. Capacitor queda inicializado en capacitor.config.ts; npm run cap:sync prepara el build web para una plataforma nativa cuando se agregue Android o iOS.

## Criterios acordados

- Todo texto visible está en español y conserva sus tildes.
- No se usa alert().
- No se usa modo oscuro ni fondos blancos o negros puros.
- Los errores se muestran dentro de la pantalla.
- El logo se conserva como recurso original y se reutiliza sin deformarlo.
- Las credenciales de demostración son temporales; la autenticación real debe vivir en Supabase Auth.
