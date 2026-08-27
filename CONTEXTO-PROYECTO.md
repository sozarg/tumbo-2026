# CONTEXTO DEL PROYECTO — TFI App de Gestión de Restaurante

> **Documento maestro de contexto.** Versión 1.0 — 25/08/2026
> Universidad Tecnológica Nacional, Facultad Regional Avellaneda
> Tecnicatura Universitaria en Programación — Trabajo Final Integrador 2026

---

## 0. CÓMO USAR ESTE DOCUMENTO

### 0.1. Para asistentes de IA

Este documento es la **única fuente de verdad** del proyecto. Si vas a generar código, revisar código o responder preguntas sobre este proyecto, leelo completo antes de responder.

**Reglas obligatorias:**

1. **No inventes nombres de tablas, columnas, rutas ni componentes.** Están todos definidos en las secciones 5 y 8. Si necesitás algo que no existe, decilo explícitamente en lugar de improvisar un nombre.
2. **Todo el código, los comentarios, los identificadores de UI y los textos visibles van en español**, con tildes correctas. Es un requisito excluyente de la cátedra, no una preferencia estética.
3. **Antes de proponer una solución de UI, verificá la sección 6** (reglas excluyentes). Muchas soluciones "estándar" de Ionic violan los requisitos de la cátedra — por ejemplo, el modo oscuro y los fondos blancos están prohibidos.
4. **El alcance es hasta el punto 22.** Los puntos 23 a 31 son de segunda y tercera fecha y **no** se implementan ahora. Si te piden algo de esos puntos, aclaralo.
5. **Si una decisión no está tomada en este documento**, está en la sección 12 (decisiones abiertas). No la resuelvas por tu cuenta sin avisar.

### 0.2. Para el equipo

- Este archivo vive en la raíz del repositorio como `CONTEXTO-PROYECTO.md`.
- Cuando tomen una decisión que contradiga algo de acá, **actualicen el documento en el mismo commit**. Un documento desactualizado es peor que no tenerlo, porque las IA lo van a seguir igual.
- Para darle contexto a una IA: pegá el documento entero al inicio de la conversación, o si la herramienta lo permite, dejalo como archivo de contexto permanente del proyecto.

### 0.3. Datos a completar

Reemplazar en todo el documento antes de usarlo:

| Placeholder | Significado |
|---|---|
| `[NOMBRE_GRUPO]` | Nombre del grupo (el repo se llama `[NOMBRE_GRUPO]-2026`) |
| `[NOMBRE_APP]` | Nombre comercial del restaurante / la app |
| `[LIDER]` | Integrante designado como líder |
| `[INTEGRANTE_A]` … `[INTEGRANTE_D]` | Los cuatro integrantes |
| `[DOMINIO]` | Dominio propio para el correo empresarial (ej. `[NOMBRE_APP].com.ar`) |

---

## 1. CONTEXTO ACADÉMICO

### 1.1. Qué es este trabajo

Trabajo Final Integrador de la Tecnicatura Universitaria en Programación (UTN Avellaneda). Consiste en desarrollar, implementar y documentar una **aplicación móvil totalmente funcional para la gestión de un restaurante**, aprovechando las capacidades nativas del dispositivo.

El enunciado pone el foco explícitamente en la **experiencia de usuario**, tanto de los clientes como de los empleados del comercio. Esto no es decorativo: buena parte de los requisitos excluyentes (sección 6) son de UX y son motivo de desaprobación aunque la funcionalidad esté completa.

### 1.2. Equipo

Grupo de cuatro (4) personas.

| Rol | Integrante |
|---|---|
| Líder | `[LIDER]` |
| Integrante | `[INTEGRANTE_A]` |
| Integrante | `[INTEGRANTE_B]` |
| Integrante | `[INTEGRANTE_C]` |
| Integrante | `[INTEGRANTE_D]` |

Responsabilidades del líder según la cátedra:

- Inscribir al grupo completo en el formulario de la cátedra.
- Crear y mantener el repositorio privado en GitHub.
- Anotar al grupo cada semana para la revisión de entrega preliminar.
- **Mantener el README actualizado** (se toma en cuenta para su nota final).

### 1.3. Calendario

| Fecha | Hito | Estado |
|---|---|---|
| **29/08/2026** | Cierre de inscripción de grupos | ⚠️ **CRÍTICO — a días de hoy** |
| 05/09/2026 | Asignación aleatoria de alumnos sin grupo; grupos definitivos | — |
| **17/10/2026** | **Primera fecha de entrega — ESTE ES NUESTRO OBJETIVO** | — |
| 07/11/2026 | Segunda fecha de entrega | No aplica |
| 28/11/2026 | Tercera fecha de entrega | No aplica |

Entre hoy y la primera fecha hay aproximadamente **7 semanas y media**, con revisiones semanales de por medio.

### 1.4. Criterios de aprobación — leer con atención

Este es el punto que más se malinterpreta. Hay **dos umbrales distintos**:

| Umbral | Qué significa |
|---|---|
| **Puntos 1 a 14 aprobados** | Mínimo necesario para *poder presentarse* a la entrega definitiva en primera o segunda fecha |
| **Puntos 1 a 22 aprobados** | Necesario para **promocionar** en la primera fecha |
| Puntos 1 a 23 aprobados | Promoción en segunda fecha / mínimo para presentarse en tercera |
| Puntos 1 a 31 aprobados | Promoción en tercera fecha |

**Los puntos se aprueban en las revisiones preliminares semanales, no el día de la entrega.** Esto significa que el trabajo tiene que estar terminado y aprobado *antes* del 17/10, no *el* 17/10. El cronograma de la sección 9 está construido sobre esta restricción.

### 1.5. Condiciones de las revisiones semanales

- **Todos los integrantes deben estar presentes.** No hay revisión con ausentes.
- **Todos los dispositivos móviles del grupo deben tener la misma versión de la app instalada** al momento de presentar.
- Cada grupo tiene un **máximo de 30 minutos**. Conviene tener la demo guionada de antemano (ver sección 9.3).

### 1.6. Requisitos del repositorio

Repositorio **privado** en GitHub, nombrado `[NOMBRE_GRUPO]-2026`, con los docentes agregados como colaboradores:

`maxineinerutn`, `aleconsta`, `naferrero-utnfra`, `amorelli-utnfra`, `octaviovillegas`, `aleloredo`

El `README.md` debe contener obligatoriamente:

1. Tabla de responsabilidades por integrante: **apellidos y nombres, módulos (objetivos) a desarrollar, fecha de inicio de la tarea, fecha de finalización, branch**.
2. Si alguien no llega con su funcionalidad comprometida, se debe **cambiar el plazo o reasignar el módulo, y dejarlo informado en el README**.
3. Un **índice que permita visualizar TODAS las imágenes asociadas al proyecto** — íconos, pantallas de presentación, formularios, listados. Todas y cada una.

El formato concreto está en la sección 11.3.

---

## 2. EL PRODUCTO

### 2.1. Objetivo

Aplicación móvil que cubre el ciclo completo de atención en un restaurante, desde que el cliente llega al local hasta que paga y se libera la mesa. Da soporte tanto al cliente como al personal del comercio, con vistas y permisos diferenciados por perfil.

### 2.2. Perfiles de usuario

| Perfil | Descripción | Requiere aprobación |
|---|---|---|
| `dueno` | Máximo nivel. Aprueba/rechaza clientes, gestiona catálogo y mesas | — |
| `supervisor` | Equivalente al dueño en las operaciones del alcance actual | — |
| `metre` | Gestiona la lista de espera y asigna mesas | — |
| `mozo` | Confirma o rechaza pedidos, responde consultas, entrega, cobra | — |
| `cocinero` | Ve y prepara los ítems del sector cocina. Da de alta platos | — |
| `cantinero` | Ve y prepara los ítems del sector bar. Da de alta bebidas | — |
| `cliente_registrado` | Cliente con cuenta. Accede a juegos y descuentos | **Sí** — dueño o supervisor |
| `cliente_anonimo` | Solo nombre y foto. Sin juegos ni descuentos | No |

Los perfiles `metre`, `mozo`, `cocinero` y `cantinero` se agrupan conceptualmente como **empleados**. Los cuatro primeros más los empleados se agrupan como **staff** (personal del comercio), término que se usa en las políticas de seguridad de la sección 5.

**Diferencia clave entre cliente registrado y anónimo:** solo el registrado puede acceder a los juegos y por lo tanto a los descuentos. El anónimo puede pedir, consultar al mozo, responder encuestas y pagar.

### 2.3. Flujo principal (recorrido feliz)

Este es el hilo narrativo que atraviesa los puntos 9 a 22 y es el que se demuestra en la presentación:

```
1. El cliente llega al local y escanea el QR DE INGRESO
        ↓
2. Se anota en la LISTA DE ESPERA (y puede ver resultados de encuestas previas)
        ↓
3. El METRE ve la lista actualizada y le ASIGNA UNA MESA        → push al cliente
        ↓
4. El cliente escanea el QR DE ESA MESA y queda vinculado
        ↓
5. Ve el MENÚ (platos, bebidas, postres) con 3 fotos por producto
        ↓
6. Arma el PEDIDO para todos los comensales, con importe siempre visible
        ↓
7. El MOZO recibe el pedido                                      → push al mozo
        ↓
   ┌─── RECHAZA → el cliente modifica y reenvía                  → push al cliente
   └─── CONFIRMA → se deriva a COCINA y/o BAR                    → push a los sectores
        ↓
8. Mientras espera, el cliente juega (descuentos) y ve el ESTADO DE SU PEDIDO
        ↓
9. Cocina y bar marcan listo. Cuando TODO el pedido está listo   → push al mozo
        ↓
10. El MOZO ENTREGA. El cliente CONFIRMA la recepción
        ↓
11. El cliente responde la ENCUESTA (una por estadía) y ve los gráficos
        ↓
12. El cliente PIDE LA CUENTA                                    → push al mozo
        ↓
13. Escanea uno de los 5 QR DE PROPINA (0% a 20%) según su satisfacción
        ↓
14. Ve el detalle: pedidos, descuentos de juegos, propina, TOTAL
        ↓
15. PAGA (simulado, modelo Mercado Pago)                → push a mozo, dueño y supervisor
        ↓
16. El MOZO CONFIRMA EL PAGO → la mesa queda LIBRE     → push a dueño y supervisor
```

### 2.4. Los cuatro dispositivos

El enunciado está escrito en términos de cuatro dispositivos físicos operando **en simultáneo**. Cada punto funcional indica en qué dispositivo se ejecuta. Los roles habituales en la demo:

| Dispositivo | Rol predominante en la demo |
|---|---|
| **Dispositivo 1** | Dueño / supervisor (altas de empleados, aprobación de clientes) y sector cocina |
| **Dispositivo 2** | Cliente registrado |
| **Dispositivo 3** | Cliente anónimo y sector bar |
| **Dispositivo 4** | Metre y mozo |

**Implicancia práctica:** necesitan cuatro celulares Android reales con la app instalada en la misma versión. Los emuladores no sirven para probar push con la app cerrada, cámara, vibración ni sensores. Resolver la distribución del APK temprano (sección 9.4).

### 2.5. Códigos QR del sistema

Hay tres familias de QR y **todos deben estar disponibles** (en el README, impresos, en pantalla) — es un requisito excluyente.

| QR | Cantidad | Contenido | Para qué sirve |
|---|---|---|---|
| **QR de ingreso al local** | 1, fijo | `[NOMBRE_APP]://ingreso` | Anotarse en la lista de espera y ver encuestas previas |
| **QR de mesa** | 1 por mesa (mín. 5) | `[NOMBRE_APP]://mesa/{qr_token}` | Vincular cliente↔mesa; para staff, ver info de la mesa |
| **QR de propina** | 5, fijos | `[NOMBRE_APP]://propina/{nivel}` | Definir el % de propina según satisfacción |

Niveles de propina:

| Nivel | Porcentaje |
|---|---|
| Excelente | 20 % |
| Muy bueno | 15 % |
| Bueno | 10 % |
| Regular | 5 % |
| Malo | 0 % |

Además, la app **lee** un cuarto tipo de código que no genera: el del **DNI argentino**, para autocompletar formularios de alta. Ver la advertencia de la sección 3.4.

### 2.6. Datos iniciales obligatorios

El enunciado exige un entorno con datos precargados antes de empezar a demostrar:

- **Un usuario de cada perfil**: dueño, supervisor, metre, mozo, cocinero, cantinero y cliente registrado.
- **Al menos 5 platos, 5 bebidas y 5 mesas.**
- **Interacciones simuladas de al menos cuatro semanas** (encuestas, consumos, estadías) en la base de datos.

Este último punto es el que suele quedar para último momento y es el que alimenta los gráficos estadísticos del punto 20. Si la base está vacía, los gráficos no muestran nada y el punto no se aprueba. El script de datos semilla está especificado en la sección 5.8.

---

## 3. STACK TÉCNICO

### 3.1. Decisiones tomadas

| Capa | Tecnología | Por qué |
|---|---|---|
| **Framework UI** | Angular (standalone components, signals) | El equipo ya lo cursó en Desarrollo Web. Cero curva de aprendizaje |
| **Componentes móviles** | Ionic Framework | Componentes nativos-like listos, gestos, navegación móvil |
| **Runtime nativo** | Capacitor | Acceso a cámara, QR, push, vibración, sensores desde la webview |
| **Base de datos** | Supabase (PostgreSQL) | Modelo relacional puro, RLS, Realtime, API automática |
| **Autenticación** | Supabase Auth | Sesiones JWT, y en 2.ª fecha regala el login social del punto 23 |
| **Almacenamiento** | Supabase Storage | Fotos de usuarios, productos y mesas |
| **Tiempo real** | Supabase Realtime | Listados de cocina/bar, lista de espera, chat |
| **Backend serverless** | Supabase Edge Functions (Deno) | Envío de push y correos; lógica que no puede vivir en el cliente |
| **Push notifications** | Firebase Cloud Messaging (FCM) | **Supabase no tiene push propio.** Ver 3.3 |
| **Correo transaccional** | Resend | Plantillas HTML con logo y estilos; remitente de dominio propio |
| **Gráficos** | Chart.js vía `ng2-charts` | Torta, barra y línea para el punto 20 |

### 3.2. Por qué Supabase y no Firebase

Decisión ya tomada, se documenta el razonamiento para poder defenderlo en la presentación:

1. **El dominio es relacional.** Mesas, sesiones, pedidos, ítems, productos y encuestas son entidades con integridad referencial. El punto 16 ("listado de pedidos pendientes agrupados por número de mesa, filtrados por sector") es un `GROUP BY` en SQL y una pesadilla de desnormalización en Firestore.
2. **RLS reemplaza cientos de líneas de lógica de permisos.** Con ocho perfiles de visibilidad distinta, escribir las reglas una vez en la base es más seguro y más corto que esparcir condicionales por la app.
3. **Edge Functions son gratuitas.** Firebase Cloud Functions exige plan Blaze con tarjeta de crédito.
4. **El esquema queda versionado en git** como migraciones SQL, no atrapado en un panel web.

**Contrapartida asumida:** hay que integrar Firebase igual, solo para FCM. Es el costo de la decisión y está presupuestado en el cronograma.

### 3.3. Arquitectura de notificaciones push

Esto es lo más delicado del stack y conviene tenerlo claro desde el día uno.

```
   App Ionic (Capacitor)
   @capacitor/push-notifications
            │
            │ 1. al iniciar sesión, registra el token del dispositivo
            ▼
   ┌──────────────────────────┐
   │  Supabase                │
   │  tabla dispositivos_push │
   └──────────────────────────┘

   ── Cuando ocurre un evento que debe notificar ──

   INSERT/UPDATE en pedidos, lista_espera, cuentas…
            │
            │ 2. Database Webhook (o trigger pg_net)
            ▼
   ┌──────────────────────────┐
   │  Edge Function           │
   │  enviar-push             │
   │                          │
   │  - resuelve destinatarios│
   │  - busca sus tokens      │
   │  - arma el payload       │
   └──────────┬───────────────┘
              │ 3. HTTP POST autenticado
              ▼
   ┌──────────────────────────┐
   │  FCM HTTP v1 API         │
   │  Firebase Cloud Messaging│
   └──────────┬───────────────┘
              │ 4. entrega
              ▼
     Dispositivo destino
     (funciona con la app ABIERTA y CERRADA)
```

**Notas de implementación:**

- El proyecto de Firebase se usa **exclusivamente** para FCM. No se usa Firestore, ni Auth de Firebase, ni Hosting.
- El archivo `google-services.json` va en `android/app/`. **No commitear las credenciales de servicio de FCM** — van como secreto de la Edge Function.
- La app debe pedir permiso de notificaciones explícitamente y manejar el rechazo con un mensaje claro (no un `alert`).
- Android 13+ requiere el permiso `POST_NOTIFICATIONS` en runtime.
- **Probar con la app cerrada desde la primera semana en que se toca push.** Es el escenario que exige el TP y el que más sorpresas da.

### 3.4. Advertencia: el código del DNI argentino no es un QR

El enunciado dice "lector de código QR para el DNI" en los puntos 1 y 5. **El DNI argentino no tiene un QR: tiene un código PDF417** en el reverso.

Solución: usar `@capacitor-mlkit/barcode-scanning`, que soporta ambos formatos. Configurar el scanner para aceptar `QR_CODE` y `PDF_417`.

Formato del PDF417 del DNI (campos separados por `@`):

```
00000000@APELLIDO@NOMBRE@SEXO@NUMERO_DNI@EJEMPLAR@FECHA_NACIMIENTO@FECHA_EMISION@...
```

El parser debe ser tolerante: hay al menos dos versiones de formato en circulación según el año de emisión. Si el parseo falla, cargar los campos vacíos y avisar al usuario con un control visible (no un alert), nunca romper el formulario.

> **Acción pendiente:** consultar a la cátedra si aceptan la lectura del PDF417 real o si esperan un QR generado por nosotros que simule el DNI. Registrar la respuesta en la sección 12.

### 3.5. Arquitectura de correos

El enunciado exige correos **automáticos**, **desde cuenta empresarial** (no personal de un integrante), con **logo, mensajes personalizados, y fuentes, colores y tamaños distintos a los que vienen por defecto**.

El mailer que trae Supabase Auth **no sirve** para esto: está pensado para confirmaciones de cuenta, tiene un rate limit muy bajo en el plan gratuito y no es lo bastante personalizable.

```
Evento (cliente aprobado / rechazado)
        │
        ▼
Edge Function  enviar-correo
        │  plantilla HTML + datos del cliente
        ▼
Resend API  →  correo entregado desde  no-responder@[DOMINIO]
        │
        ▼
Registro en tabla  correos_enviados
```

**Requisitos de las plantillas** (aplican a *todos* los correos por igual — el enunciado insiste en que los cambios de estilo valen tanto para el correo de confirmación como para el de rechazo):

- Logo de `[NOMBRE_APP]` embebido.
- Saludo personalizado con nombre y apellido del destinatario.
- Tipografía distinta de la default del cliente de correo.
- Colores y tamaños de texto propios de la marca.
- Todo el texto en español con tildes.

**Sobre el remitente:** para que sea "empresarial" hace falta un dominio verificado. Un `.com.ar` cuesta poco y resuelve el requisito de forma limpia. Alternativa sin dominio: Brevo permite verificar una dirección individual como remitente.

### 3.6. Dependencias del proyecto

**Angular / Ionic**

```
@ionic/angular
@angular/core  @angular/forms  @angular/router
@supabase/supabase-js
ng2-charts  chart.js
angularx-qrcode
```

**Plugins de Capacitor y a qué requisito responde cada uno**

| Plugin | Requisito que cubre |
|---|---|
| `@capacitor/camera` | Fotos de empleados, clientes, productos y mesas (puntos 1-5) |
| `@capacitor-mlkit/barcode-scanning` | Lectura de QR de ingreso, mesa y propina + PDF417 del DNI |
| `@capacitor/push-notifications` | Todas las push del flujo (excluyente) |
| `@capacitor/haptics` | Vibración ante **todos** los errores (excluyente) |
| `@capacitor/splash-screen` | Pantalla de presentación estática (excluyente) |
| `@capacitor/preferences` | Persistencia de la sesión de Supabase — ver 3.7 |
| `@capacitor/app` | Detectar `pause`/`resume` para el sonido de cierre |
| `@capacitor/network` | Detectar falta de conexión y avisar sin alerts |
| `@capacitor/status-bar` | Color de barra de estado acorde al theme (excluyente: sin espacios neutros) |
| `@capacitor/keyboard` | Evitar que el teclado tape campos en formularios largos |
| `@capacitor-community/native-audio` | Sonidos de apertura y cierre (excluyente) |
| `@capacitor/motion` | **Solo tercera fecha (punto 31). No instalar ahora** |

**Regla sobre fotos — leer con atención, es sutil y se evalúa:**

| Punto | Sujeto | ¿Permite galería? |
|---|---|---|
| 1 | Foto del empleado | **NO** — solo cámara |
| 5 | Foto del cliente registrado | **NO** — solo cámara |
| 2 | Fotos del plato (3) | Sí, cámara o galería |
| 3 | Fotos de la bebida (3) | Sí, cámara o galería |
| 4 | Foto de la mesa | **NO** — solo cámara |

En los casos "solo cámara" hay que invocar `Camera.getPhoto({ source: CameraSource.Camera })`, nunca `CameraSource.Prompt`, que ofrecería la galería.

### 3.7. Configuración de Supabase en Capacitor

`supabase-js` guarda la sesión en `localStorage` por defecto. Dentro de la webview de Capacitor eso funciona pero es frágil: el sistema puede limpiarlo y el usuario aparece deslogueado sin motivo aparente, típicamente en el peor momento.

Configurar un adaptador de almacenamiento sobre `@capacitor/preferences` desde el inicio del proyecto:

```typescript
// src/app/nucleo/supabase/almacenamiento-sesion.ts
import { Preferences } from '@capacitor/preferences';

export const almacenamientoSesion = {
  getItem: async (clave: string) => {
    const { value } = await Preferences.get({ key: clave });
    return value;
  },
  setItem: async (clave: string, valor: string) => {
    await Preferences.set({ key: clave, value: valor });
  },
  removeItem: async (clave: string) => {
    await Preferences.remove({ key: clave });
  },
};
```

```typescript
// src/app/nucleo/supabase/cliente-supabase.ts
import { createClient } from '@supabase/supabase-js';
import { almacenamientoSesion } from './almacenamiento-sesion';
import { entorno } from '../../../environments/environment';

export const supabase = createClient(entorno.supabaseUrl, entorno.supabaseAnonKey, {
  auth: {
    storage: almacenamientoSesion,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // importante en Capacitor
  },
});
```

> **Requisito relacionado (excluyente):** la app debe tener un botón de cierre de sesión y hay que **verificar que las credenciales se borren**. Con este adaptador, el logout debe llamar a `supabase.auth.signOut()` y además limpiar cualquier dato de usuario cacheado en memoria o en Preferences.

### 3.8. Límites del plan gratuito de Supabase

| Recurso | Límite | ¿Nos alcanza? |
|---|---|---|
| Tamaño de base | 500 MB | Sobra ampliamente |
| Storage | 1 GB por organización | **Ajustado** — ver abajo |
| Egress | 5 GB cacheado + 5 GB sin cachear | Suficiente para demos |
| Proyectos activos | 2 | Suficiente (producción + pruebas) |
| Invocaciones de Edge Functions | 500.000 / mes | Sobra |
| Mensajes de Realtime | 2 millones | Sobra |

**Dos riesgos concretos:**

1. **El proyecto se pausa tras 7 días de baja actividad.** Con revisiones semanales es perfectamente posible llegar a la revisión con la base dormida y perder los primeros minutos despertándola. Mitigación: un cron externo que pegue a un endpoint cada 2-3 días, o como mínimo, despertarla la noche anterior a cada revisión.
2. **El storage se llena rápido con fotos de cámara.** Una foto de celular moderna pesa 3-5 MB. Con 5 platos × 3 fotos + 5 bebidas × 3 fotos + 5 mesas + fotos de usuarios, sin compresión se van cientos de megas. **Comprimir siempre en el cliente antes de subir**: redimensionar a 1200 px de lado mayor y calidad 80 deja fotos de ~200 KB sin pérdida visible. Centralizar esto en `ServicioImagenes.comprimirYSubir()` y prohibir subidas directas desde los componentes.

---

## 4. ARQUITECTURA DE LA APLICACIÓN

### 4.1. Vista general

```
┌─────────────────────────────────────────────────────────┐
│  APP MÓVIL — Angular + Ionic dentro de Capacitor        │
│                                                          │
│  Páginas por perfil    Componentes compartidos           │
│  Servicios de dominio  Guards de ruta por perfil         │
│  Interceptor de errores → vibración + control visual     │
└───────────────┬─────────────────────────┬───────────────┘
                │                         │
      supabase-js (REST + Realtime)   Plugins nativos
                │                         │
                ▼                         ▼
┌───────────────────────────────┐   ┌──────────────────┐
│  SUPABASE                     │   │  Cámara          │
│  ├ PostgreSQL + RLS           │   │  Escáner QR/PDF417│
│  ├ Auth (JWT)                 │   │  Vibración       │
│  ├ Storage (fotos)            │   │  Audio           │
│  ├ Realtime (websockets)      │   │  Push (FCM)      │
│  └ Edge Functions (Deno)      │   └──────────────────┘
└───────┬───────────────┬───────┘
        │               │
        ▼               ▼
┌──────────────┐  ┌──────────────┐
│  FCM         │  │  Resend      │
│  push        │  │  correos     │
└──────────────┘  └──────────────┘
```

### 4.2. Principio de separación

**Regla:** el cliente nunca ejecuta lógica que pueda ser saltada. Concretamente:

| Va en el cliente | Va en la base (RLS / triggers / funciones) | Va en Edge Function |
|---|---|---|
| Presentación y navegación | Quién puede ver y modificar qué | Enviar push |
| Validación de formularios (UX) | Validación de integridad (constraints) | Enviar correos |
| Composición del pedido | Cálculo del total de la cuenta | Operaciones con claves secretas |
| Reproducir sonidos, vibrar | Regla de "un solo descuento por estadía" | — |
| Escanear y generar QR | Transición de estados de pedido | — |

El cálculo del total de la cuenta va en una función de base de datos (`calcular_cuenta`) y no en el cliente. Motivo: es el número que se cobra, tiene que ser el mismo en el dispositivo del cliente y en el del mozo, y no puede depender de que ambos tengan la misma versión de la app.

### 4.3. Canales de Realtime

| Canal | Tabla / filtro | Quién escucha | Punto |
|---|---|---|---|
| `lista-espera` | `lista_espera` where `estado='esperando'` | Metre | 9, 10 |
| `pedidos-mozo` | `pedidos` where `estado in ('pendiente_confirmacion','listo')` | Mozos | 12, 18 |
| `pedidos-cocina` | `pedido_items` where `sector='cocina'` | Cocinero | 16 |
| `pedidos-bar` | `pedido_items` where `sector='bar'` | Cantinero | 17 |
| `estado-pedido-{id}` | `pedidos` where `id=...` | Cliente dueño del pedido | 12-19 |
| `sala-{sesion_id}` | `mensajes` | Cliente y todos los mozos | 11 |
| `clientes-pendientes` | `usuarios` where `estado='pendiente'` | Dueño y supervisor | 6 |

**Realtime vs. push — no son lo mismo y el TP pide los dos:**

- **Realtime** actualiza la pantalla mientras la app está abierta y a la vista.
- **Push (FCM)** avisa al usuario **aunque la app esté cerrada**, que es lo que exige el enunciado.

Los eventos marcados con `(push notification)` en el PDF necesitan ambas cosas: Realtime para que la pantalla se actualice sola si el usuario está mirando, y push para que se entere si no lo está.

---

## 5. MODELO DE DATOS

### 5.1. Cómo se administra el esquema

El esquema se define como **migraciones SQL versionadas en git**, no desde el panel web de Supabase.

```
supabase/
├── config.toml
├── migrations/
│   ├── 20260901000000_tipos_y_enums.sql
│   ├── 20260901000100_tablas_base.sql
│   ├── 20260901000200_tablas_operacion.sql
│   ├── 20260901000300_funciones.sql
│   ├── 20260901000400_politicas_rls.sql
│   └── 20260901000500_storage.sql
└── seed.sql
```

Comandos de trabajo:

```bash
supabase login
supabase link --project-ref <ref-del-proyecto>
supabase db push          # aplica migraciones pendientes al proyecto remoto
supabase db reset         # recrea la base local desde cero + seed
supabase migration new nombre_descriptivo
```

**Regla del equipo:** nadie modifica tablas desde el panel web. Si alguien lo hace, el esquema del repo y el real se desincronizan y el próximo `db push` de otro integrante puede romper todo.

> **Estado del esquema:** el SQL de las secciones 5.3 a 5.8 fue ejecutado y probado sobre PostgreSQL 16. Aplica sin errores y se verificó el comportamiento de los constraints (correo inválido, empleado sin CUIL, bebida en sector cocina), los índices únicos parciales (doble ocupación de mesa, cliente en dos mesas, segundo descuento en la misma estadía), los triggers (autocompletado de precio y sector, pedido a `listo` solo cuando todos los sectores terminan, liberación de la mesa al confirmar el pago) y la función `calcular_cuenta`.

### 5.2. Diagrama de relaciones

```
   auth.users
       │ 1:1
       ▼
   usuarios ─────────────┬──────────────┬─────────────┐
       │                 │              │             │
       │ 1:N             │ 1:N          │ 1:N         │ 1:N
       ▼                 ▼              ▼             ▼
 dispositivos_push  lista_espera   partidas_juego  notificaciones
                         │
                         │ al asignar mesa
                         ▼
   mesas ──── 1:N ──► sesiones_mesa ◄── 1:1 ── cuentas
     │                    │  │  │
     │                    │  │  └── 1:N ──► mensajes
     │                    │  └───── 1:1 ──► encuestas ── 1:N ─► respuestas_encuesta
     │                    │                                            │
     │                    │ 1:N                            preguntas_encuesta
     │                    ▼
     │                pedidos ── 1:N ──► pedido_items ──► productos
     │                                                        │ 1:N
     └── qr_token (único por mesa)                    producto_fotos
```

### 5.3. Tipos enumerados

```sql
-- migrations/20260901000000_tipos_y_enums.sql

create type perfil_usuario as enum (
  'dueno', 'supervisor', 'metre', 'mozo', 'cocinero', 'cantinero',
  'cliente_registrado', 'cliente_anonimo'
);

create type estado_registro as enum ('pendiente', 'aprobado', 'rechazado');

create type tipo_mesa as enum ('vip', 'estandar', 'movilidad_reducida');

create type estado_mesa as enum ('libre', 'ocupada');

create type tipo_producto as enum ('plato', 'bebida', 'postre');

create type sector_preparacion as enum ('cocina', 'bar');

create type estado_espera as enum ('esperando', 'asignado', 'eliminado');

create type estado_sesion as enum (
  'activa', 'cuenta_solicitada', 'pagada', 'cerrada'
);

create type estado_pedido as enum (
  'borrador',                -- el cliente lo está armando
  'pendiente_confirmacion',  -- enviado, esperando al mozo
  'rechazado',               -- el mozo lo devolvió para modificar
  'confirmado',              -- derivado a los sectores
  'en_preparacion',          -- algún sector empezó
  'listo',                   -- todos los sectores terminaron
  'entregado',               -- el mozo lo entregó y el cliente confirmó
  'pagado'
);

create type estado_item as enum ('pendiente', 'en_preparacion', 'listo');

create type tipo_mensaje as enum ('consulta', 'respuesta');

create type tipo_control as enum (
  'radio', 'checkbox', 'select', 'rango', 'estrellas', 'texto_largo', 'interruptor'
);

create type estado_cuenta as enum ('pendiente', 'pagada', 'confirmada');

create type nivel_satisfaccion as enum (
  'excelente', 'muy_bueno', 'bueno', 'regular', 'malo'
);

create type plataforma_push as enum ('android', 'ios', 'web');
```

### 5.4. Tablas base

```sql
-- migrations/20260901000100_tablas_base.sql

-- ─────────────────────────────────────────────────────────────
-- USUARIOS
-- Extiende auth.users. Los clientes anónimos también tienen fila
-- acá: se crean con supabase.auth.signInAnonymously().
-- ─────────────────────────────────────────────────────────────
create table public.usuarios (
  id              uuid primary key references auth.users(id) on delete cascade,
  apellidos       text,
  nombres         text not null,
  dni             text unique,
  cuil            text,
  correo          text unique,
  perfil          perfil_usuario not null,
  estado          estado_registro not null default 'pendiente',
  foto_url        text,
  motivo_rechazo  text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  -- Los anónimos solo aportan nombre y foto; el resto debe estar completo
  constraint datos_completos_si_no_es_anonimo check (
    perfil = 'cliente_anonimo'
    or (apellidos is not null and dni is not null and correo is not null)
  ),
  -- El CUIL solo se pide a los empleados (punto 1)
  constraint cuil_en_empleados check (
    perfil not in ('metre','mozo','cocinero','cantinero') or cuil is not null
  ),
  constraint formato_correo check (
    correo is null or correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  constraint formato_dni check (dni is null or dni ~ '^[0-9]{7,8}$'),
  constraint formato_cuil check (cuil is null or cuil ~ '^[0-9]{2}-?[0-9]{7,8}-?[0-9]$')
);

comment on column public.usuarios.estado is
  'Los clientes registrados nacen pendientes y no pueden operar hasta ser aprobados (punto 5). El staff y los anónimos se crean directamente aprobados.';

create index idx_usuarios_perfil on public.usuarios(perfil);
create index idx_usuarios_estado on public.usuarios(estado) where estado = 'pendiente';

-- ─────────────────────────────────────────────────────────────
-- DISPOSITIVOS PUSH
-- Un usuario puede tener varios dispositivos.
-- ─────────────────────────────────────────────────────────────
create table public.dispositivos_push (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references public.usuarios(id) on delete cascade,
  token           text not null unique,
  plataforma      plataforma_push not null default 'android',
  actualizado_en  timestamptz not null default now()
);

create index idx_dispositivos_usuario on public.dispositivos_push(usuario_id);

-- ─────────────────────────────────────────────────────────────
-- MESAS
-- El qr_token se genera solo al insertar (punto 4).
-- ─────────────────────────────────────────────────────────────
create table public.mesas (
  id                    uuid primary key default gen_random_uuid(),
  numero                integer not null unique,
  cantidad_comensales   integer not null check (cantidad_comensales between 1 and 20),
  tipo                  tipo_mesa not null,
  estado                estado_mesa not null default 'libre',
  foto_url              text,
  qr_token              text not null unique default encode(gen_random_bytes(12), 'hex'),
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- PRODUCTOS  (platos, bebidas y postres)
-- ─────────────────────────────────────────────────────────────
create table public.productos (
  id                      uuid primary key default gen_random_uuid(),
  tipo                    tipo_producto not null,
  nombre                  text not null,
  descripcion             text not null,
  tiempo_elaboracion_min  integer not null check (tiempo_elaboracion_min > 0),
  precio                  numeric(10,2) not null check (precio > 0),
  sector                  sector_preparacion not null,
  activo                  boolean not null default true,
  creado_por              uuid references public.usuarios(id),
  creado_en               timestamptz not null default now(),
  actualizado_en          timestamptz not null default now(),

  constraint nombre_unico_por_tipo unique (tipo, nombre),
  -- Las bebidas las prepara el bar; platos y postres, la cocina
  constraint sector_coherente check (
    (tipo = 'bebida' and sector = 'bar') or
    (tipo in ('plato','postre') and sector = 'cocina')
  )
);

create index idx_productos_tipo on public.productos(tipo) where activo;

-- ─────────────────────────────────────────────────────────────
-- FOTOS DE PRODUCTO
-- El TP exige exactamente 3 fotos por plato y por bebida (puntos 2 y 3).
-- ─────────────────────────────────────────────────────────────
create table public.producto_fotos (
  id           uuid primary key default gen_random_uuid(),
  producto_id  uuid not null references public.productos(id) on delete cascade,
  url          text not null,
  orden        smallint not null check (orden between 1 and 3),
  creado_en    timestamptz not null default now(),

  constraint orden_unico_por_producto unique (producto_id, orden)
);

-- ─────────────────────────────────────────────────────────────
-- NIVELES DE PROPINA  (tabla fija, 5 filas — punto 21)
-- ─────────────────────────────────────────────────────────────
create table public.niveles_propina (
  nivel        nivel_satisfaccion primary key,
  porcentaje   numeric(5,2) not null check (porcentaje >= 0),
  etiqueta     text not null,
  qr_token     text not null unique
);

-- ─────────────────────────────────────────────────────────────
-- JUEGOS  (tabla fija, 3 filas — puntos 14 y 15)
-- ─────────────────────────────────────────────────────────────
create table public.juegos (
  id                     uuid primary key default gen_random_uuid(),
  nombre                 text not null unique,
  descripcion            text not null,
  porcentaje_descuento   numeric(5,2) not null check (porcentaje_descuento > 0),
  activo                 boolean not null default true
);

-- ─────────────────────────────────────────────────────────────
-- PREGUNTAS DE ENCUESTA (punto 20)
-- El tipo_control debe VARIAR: es requisito excluyente no usar
-- siempre el mismo control para recolectar información.
-- ─────────────────────────────────────────────────────────────
create table public.preguntas_encuesta (
  id        uuid primary key default gen_random_uuid(),
  texto     text not null,
  tipo      tipo_control not null,
  opciones  jsonb,          -- para radio/checkbox/select
  minimo    numeric,        -- para rango/estrellas
  maximo    numeric,
  orden     smallint not null unique,
  activa    boolean not null default true,
  requerida boolean not null default true
);
```

### 5.5. Tablas de operación

```sql
-- migrations/20260901000200_tablas_operacion.sql

-- ─────────────────────────────────────────────────────────────
-- LISTA DE ESPERA (punto 9)
-- ─────────────────────────────────────────────────────────────
create table public.lista_espera (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.usuarios(id) on delete cascade,
  estado        estado_espera not null default 'esperando',
  mesa_id       uuid references public.mesas(id),
  creado_en     timestamptz not null default now(),
  asignado_en   timestamptz,

  constraint mesa_solo_si_asignado check (
    (estado = 'asignado' and mesa_id is not null and asignado_en is not null)
    or (estado <> 'asignado' and mesa_id is null)
  )
);

-- Un cliente no puede estar dos veces esperando al mismo tiempo
create unique index idx_espera_unica_por_cliente
  on public.lista_espera(cliente_id) where estado = 'esperando';

-- ─────────────────────────────────────────────────────────────
-- SESIONES DE MESA  ("estadía": la ocupación de una mesa por un cliente)
-- Es la entidad central: pedidos, encuesta, chat y cuenta cuelgan de acá.
-- ─────────────────────────────────────────────────────────────
create table public.sesiones_mesa (
  id           uuid primary key default gen_random_uuid(),
  mesa_id      uuid not null references public.mesas(id),
  cliente_id   uuid not null references public.usuarios(id),
  estado       estado_sesion not null default 'activa',
  comensales   integer not null default 1 check (comensales > 0),
  abierta_en   timestamptz not null default now(),
  cerrada_en   timestamptz
);

-- Una mesa no puede tener dos sesiones activas: esto implementa
-- "no se le puede asignar dicha mesa a otro cliente" (punto 10)
create unique index idx_sesion_activa_por_mesa
  on public.sesiones_mesa(mesa_id)
  where estado in ('activa','cuenta_solicitada','pagada');

-- Un cliente no puede vincularse a dos mesas: "el cliente no puede
-- vincularse con otra mesa" (punto 10)
create unique index idx_sesion_activa_por_cliente
  on public.sesiones_mesa(cliente_id)
  where estado in ('activa','cuenta_solicitada','pagada');

-- ─────────────────────────────────────────────────────────────
-- PEDIDOS (puntos 12 a 19)
-- ─────────────────────────────────────────────────────────────
create table public.pedidos (
  id                uuid primary key default gen_random_uuid(),
  sesion_mesa_id    uuid not null references public.sesiones_mesa(id) on delete cascade,
  estado            estado_pedido not null default 'borrador',
  mozo_id           uuid references public.usuarios(id),
  motivo_rechazo    text,
  creado_en         timestamptz not null default now(),
  enviado_en        timestamptz,
  confirmado_en     timestamptz,
  listo_en          timestamptz,
  entregado_en      timestamptz,

  constraint motivo_si_rechazado check (
    estado <> 'rechazado' or motivo_rechazo is not null
  )
);

create index idx_pedidos_sesion on public.pedidos(sesion_mesa_id);
create index idx_pedidos_estado on public.pedidos(estado);

-- ─────────────────────────────────────────────────────────────
-- ÍTEMS DEL PEDIDO
-- precio_unitario se congela al momento del pedido: si después
-- cambia el precio del producto, la cuenta no se altera.
-- ─────────────────────────────────────────────────────────────
create table public.pedido_items (
  id               uuid primary key default gen_random_uuid(),
  pedido_id        uuid not null references public.pedidos(id) on delete cascade,
  producto_id      uuid not null references public.productos(id),
  cantidad         integer not null check (cantidad > 0),
  precio_unitario  numeric(10,2) not null check (precio_unitario > 0),
  sector           sector_preparacion not null,
  estado           estado_item not null default 'pendiente',
  listo_en         timestamptz,

  constraint producto_unico_por_pedido unique (pedido_id, producto_id)
);

create index idx_items_pedido on public.pedido_items(pedido_id);
create index idx_items_sector on public.pedido_items(sector, estado);

-- ─────────────────────────────────────────────────────────────
-- MENSAJES  (sala de conversación cliente ↔ mozos, punto 11)
-- ─────────────────────────────────────────────────────────────
create table public.mensajes (
  id              uuid primary key default gen_random_uuid(),
  sesion_mesa_id  uuid not null references public.sesiones_mesa(id) on delete cascade,
  autor_id        uuid not null references public.usuarios(id),
  tipo            tipo_mensaje not null,
  cuerpo          text not null check (length(trim(cuerpo)) > 0),
  enviado_en      timestamptz not null default now()
);

create index idx_mensajes_sesion on public.mensajes(sesion_mesa_id, enviado_en);

-- ─────────────────────────────────────────────────────────────
-- ENCUESTAS (punto 20) — una por estadía
-- ─────────────────────────────────────────────────────────────
create table public.encuestas (
  id              uuid primary key default gen_random_uuid(),
  sesion_mesa_id  uuid not null unique references public.sesiones_mesa(id) on delete cascade,
  cliente_id      uuid not null references public.usuarios(id),
  creado_en       timestamptz not null default now()
);

create table public.respuestas_encuesta (
  id            uuid primary key default gen_random_uuid(),
  encuesta_id   uuid not null references public.encuestas(id) on delete cascade,
  pregunta_id   uuid not null references public.preguntas_encuesta(id),
  valor         jsonb not null,   -- string, number, boolean o array según el control

  constraint respuesta_unica unique (encuesta_id, pregunta_id)
);

-- ─────────────────────────────────────────────────────────────
-- PARTIDAS DE JUEGO (puntos 14 y 15)
-- Reglas: solo cliente registrado; el descuento se otorga únicamente
-- si gana en el PRIMER intento; un solo descuento por estadía.
-- ─────────────────────────────────────────────────────────────
create table public.partidas_juego (
  id                    uuid primary key default gen_random_uuid(),
  juego_id              uuid not null references public.juegos(id),
  sesion_mesa_id        uuid not null references public.sesiones_mesa(id) on delete cascade,
  cliente_id            uuid not null references public.usuarios(id),
  intento               integer not null check (intento > 0),
  gano                  boolean not null,
  descuento_otorgado    numeric(5,2) not null default 0,
  jugado_en             timestamptz not null default now(),

  constraint intento_unico unique (sesion_mesa_id, juego_id, intento)
);

-- Como máximo una partida con descuento por estadía
create unique index idx_un_descuento_por_sesion
  on public.partidas_juego(sesion_mesa_id)
  where descuento_otorgado > 0;

-- ─────────────────────────────────────────────────────────────
-- CUENTAS (puntos 21 y 22)
-- ─────────────────────────────────────────────────────────────
create table public.cuentas (
  id                uuid primary key default gen_random_uuid(),
  sesion_mesa_id    uuid not null unique references public.sesiones_mesa(id) on delete cascade,
  subtotal          numeric(10,2) not null default 0,
  descuento_pct     numeric(5,2) not null default 0,
  descuento_monto   numeric(10,2) not null default 0,
  nivel_propina     nivel_satisfaccion,
  propina_pct       numeric(5,2),
  propina_monto     numeric(10,2) not null default 0,
  total             numeric(10,2) not null default 0,
  estado            estado_cuenta not null default 'pendiente',
  mozo_id           uuid references public.usuarios(id),
  solicitada_en     timestamptz not null default now(),
  pagada_en         timestamptz,
  confirmada_en     timestamptz,

  -- "No se podrá generar la cuenta sin antes seleccionar el porcentaje
  --  de propina correspondiente" (punto 21)
  constraint propina_obligatoria_para_pagar check (
    estado = 'pendiente' or (nivel_propina is not null and propina_pct is not null)
  )
);

-- ─────────────────────────────────────────────────────────────
-- BITÁCORAS  (para poder demostrar que los envíos son automáticos)
-- ─────────────────────────────────────────────────────────────
create table public.notificaciones (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references public.usuarios(id) on delete cascade,
  titulo       text not null,
  cuerpo       text not null,
  datos        jsonb,
  enviada_en   timestamptz not null default now(),
  leida_en     timestamptz
);

create table public.correos_enviados (
  id            uuid primary key default gen_random_uuid(),
  destinatario  text not null,
  plantilla     text not null,
  asunto        text not null,
  estado        text not null default 'enviado',
  proveedor_id  text,
  enviado_en    timestamptz not null default now()
);
```

### 5.6. Funciones y triggers

```sql
-- migrations/20260901000300_funciones.sql

-- ─────────────────────────────────────────────────────────────
-- Helpers de perfil.
-- SECURITY DEFINER es imprescindible: sin él, consultar la tabla
-- usuarios desde una política RLS sobre usuarios causa recursión.
-- ─────────────────────────────────────────────────────────────
create or replace function public.perfil_actual()
returns perfil_usuario
language sql stable security definer set search_path = public
as $$ select perfil from public.usuarios where id = auth.uid() $$;

create or replace function public.es_gerencia()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.perfil_actual() in ('dueno','supervisor') $$;

create or replace function public.es_staff()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.perfil_actual() in
     ('dueno','supervisor','metre','mozo','cocinero','cantinero') $$;

create or replace function public.es_cliente()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.perfil_actual() in
     ('cliente_registrado','cliente_anonimo') $$;

-- ─────────────────────────────────────────────────────────────
-- actualizado_en automático
-- ─────────────────────────────────────────────────────────────
create or replace function public.tocar_actualizado_en()
returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create trigger trg_usuarios_actualizado before update on public.usuarios
  for each row execute function public.tocar_actualizado_en();
create trigger trg_mesas_actualizado before update on public.mesas
  for each row execute function public.tocar_actualizado_en();
create trigger trg_productos_actualizado before update on public.productos
  for each row execute function public.tocar_actualizado_en();

-- ─────────────────────────────────────────────────────────────
-- El sector del ítem se hereda del producto, no lo manda el cliente
-- ─────────────────────────────────────────────────────────────
create or replace function public.completar_datos_item()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p record;
begin
  select precio, sector into p from public.productos where id = new.producto_id;
  new.precio_unitario := coalesce(new.precio_unitario, p.precio);
  new.sector := p.sector;
  return new;
end $$;

create trigger trg_item_completar before insert on public.pedido_items
  for each row execute function public.completar_datos_item();

-- ─────────────────────────────────────────────────────────────
-- Cuando TODOS los ítems quedan listos, el pedido pasa a 'listo'.
-- Implementa el punto 18: "solo se informará cuando el pedido, en
-- los sectores intervinientes, esté completo".
-- ─────────────────────────────────────────────────────────────
create or replace function public.evaluar_pedido_listo()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pendientes integer;
begin
  select count(*) into pendientes
    from public.pedido_items
   where pedido_id = new.pedido_id and estado <> 'listo';

  if pendientes = 0 then
    update public.pedidos
       set estado = 'listo', listo_en = now()
     where id = new.pedido_id and estado <> 'listo';
  elsif new.estado = 'en_preparacion' then
    update public.pedidos
       set estado = 'en_preparacion'
     where id = new.pedido_id and estado = 'confirmado';
  end if;

  return new;
end $$;

create trigger trg_evaluar_pedido after update of estado on public.pedido_items
  for each row execute function public.evaluar_pedido_listo();

-- ─────────────────────────────────────────────────────────────
-- Cálculo de la cuenta. Vive en la base para que el número del
-- cliente y el del mozo sean SIEMPRE el mismo (punto 21).
-- ─────────────────────────────────────────────────────────────
create or replace function public.calcular_cuenta(p_sesion_id uuid)
returns table (
  subtotal numeric, descuento_pct numeric, descuento_monto numeric,
  base numeric
)
language sql stable security definer set search_path = public as $$
  with items as (
    select coalesce(sum(i.cantidad * i.precio_unitario), 0) as st
      from public.pedido_items i
      join public.pedidos p on p.id = i.pedido_id
     where p.sesion_mesa_id = p_sesion_id
       and p.estado in ('confirmado','en_preparacion','listo','entregado','pagado')
  ),
  desc_juego as (
    select coalesce(max(descuento_otorgado), 0) as pct
      from public.partidas_juego
     where sesion_mesa_id = p_sesion_id
  )
  select
    items.st,
    desc_juego.pct,
    round(items.st * desc_juego.pct / 100, 2),
    round(items.st - (items.st * desc_juego.pct / 100), 2)
  from items, desc_juego;
$$;

-- ─────────────────────────────────────────────────────────────
-- Al confirmar el pago, la mesa vuelve a estar libre (punto 22)
-- ─────────────────────────────────────────────────────────────
create or replace function public.liberar_mesa_al_confirmar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'confirmada' and old.estado <> 'confirmada' then
    update public.sesiones_mesa
       set estado = 'cerrada', cerrada_en = now()
     where id = new.sesion_mesa_id;

    update public.mesas m
       set estado = 'libre'
      from public.sesiones_mesa s
     where s.id = new.sesion_mesa_id and m.id = s.mesa_id;
  end if;
  return new;
end $$;

create trigger trg_liberar_mesa after update on public.cuentas
  for each row execute function public.liberar_mesa_al_confirmar();
```

### 5.7. Políticas RLS

```sql
-- migrations/20260901000400_politicas_rls.sql

alter table public.usuarios            enable row level security;
alter table public.dispositivos_push   enable row level security;
alter table public.mesas               enable row level security;
alter table public.productos           enable row level security;
alter table public.producto_fotos      enable row level security;
alter table public.niveles_propina     enable row level security;
alter table public.juegos              enable row level security;
alter table public.preguntas_encuesta  enable row level security;
alter table public.lista_espera        enable row level security;
alter table public.sesiones_mesa       enable row level security;
alter table public.pedidos             enable row level security;
alter table public.pedido_items        enable row level security;
alter table public.mensajes            enable row level security;
alter table public.encuestas           enable row level security;
alter table public.respuestas_encuesta enable row level security;
alter table public.partidas_juego      enable row level security;
alter table public.cuentas             enable row level security;
alter table public.notificaciones      enable row level security;

-- ── USUARIOS ────────────────────────────────────────────────
create policy usuarios_ver_propio on public.usuarios
  for select using (id = auth.uid());

create policy usuarios_staff_ve_todos on public.usuarios
  for select using (public.es_staff());

-- Alta de empleados: solo dueño o supervisor (punto 1)
-- Alta de clientes: cualquiera puede autoregistrarse (punto 5)
create policy usuarios_insertar on public.usuarios
  for insert with check (
    id = auth.uid() or public.es_gerencia()
  );

-- Solo gerencia aprueba o rechaza (puntos 7 y 8)
create policy usuarios_actualizar on public.usuarios
  for update using (id = auth.uid() or public.es_gerencia());

-- ── DISPOSITIVOS PUSH ───────────────────────────────────────
create policy dispositivos_propios on public.dispositivos_push
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ── CATÁLOGO: todos leen, roles específicos escriben ────────
create policy mesas_lectura on public.mesas for select using (true);
create policy mesas_escritura on public.mesas
  for all using (public.es_gerencia()) with check (public.es_gerencia());

create policy productos_lectura on public.productos for select using (true);
-- El cocinero da de alta platos y postres (punto 2);
-- el cantinero, bebidas (punto 3)
create policy productos_alta on public.productos
  for insert with check (
    public.es_gerencia()
    or (public.perfil_actual() = 'cocinero'  and tipo in ('plato','postre'))
    or (public.perfil_actual() = 'cantinero' and tipo = 'bebida')
  );
create policy productos_modificacion on public.productos
  for update using (public.es_staff());

create policy fotos_lectura on public.producto_fotos for select using (true);
create policy fotos_escritura on public.producto_fotos
  for all using (public.es_staff()) with check (public.es_staff());

create policy propinas_lectura on public.niveles_propina for select using (true);
create policy juegos_lectura on public.juegos for select using (true);
create policy preguntas_lectura on public.preguntas_encuesta for select using (true);

-- ── LISTA DE ESPERA ─────────────────────────────────────────
create policy espera_cliente_propia on public.lista_espera
  for select using (cliente_id = auth.uid());
create policy espera_staff_ve_toda on public.lista_espera
  for select using (public.es_staff());
create policy espera_cliente_se_anota on public.lista_espera
  for insert with check (cliente_id = auth.uid());
-- El metre asigna; el cliente puede eliminarse a sí mismo (punto 9)
create policy espera_actualizar on public.lista_espera
  for update using (
    cliente_id = auth.uid()
    or public.perfil_actual() in ('metre','dueno','supervisor')
  );

-- ── SESIONES DE MESA ────────────────────────────────────────
create policy sesiones_cliente on public.sesiones_mesa
  for select using (cliente_id = auth.uid());
create policy sesiones_staff on public.sesiones_mesa
  for select using (public.es_staff());
create policy sesiones_crear on public.sesiones_mesa
  for insert with check (
    cliente_id = auth.uid() or public.perfil_actual() in ('metre','dueno','supervisor')
  );
create policy sesiones_actualizar on public.sesiones_mesa
  for update using (cliente_id = auth.uid() or public.es_staff());

-- ── PEDIDOS ─────────────────────────────────────────────────
create policy pedidos_cliente on public.pedidos
  for select using (
    exists (select 1 from public.sesiones_mesa s
             where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
  );
create policy pedidos_staff on public.pedidos
  for select using (public.es_staff());
create policy pedidos_cliente_crea on public.pedidos
  for insert with check (
    exists (select 1 from public.sesiones_mesa s
             where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
  );
-- El cliente modifica su borrador o su pedido rechazado (punto 13);
-- el mozo confirma o rechaza (puntos 13 y 14)
create policy pedidos_actualizar on public.pedidos
  for update using (
    (exists (select 1 from public.sesiones_mesa s
              where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
      and estado in ('borrador','rechazado'))
    or public.es_staff()
  );

-- ── ÍTEMS ───────────────────────────────────────────────────
create policy items_ver on public.pedido_items
  for select using (
    public.es_staff()
    or exists (select 1 from public.pedidos p
                 join public.sesiones_mesa s on s.id = p.sesion_mesa_id
                where p.id = pedido_id and s.cliente_id = auth.uid())
  );
create policy items_cliente_edita on public.pedido_items
  for all using (
    exists (select 1 from public.pedidos p
              join public.sesiones_mesa s on s.id = p.sesion_mesa_id
             where p.id = pedido_id and s.cliente_id = auth.uid()
               and p.estado in ('borrador','rechazado'))
  ) with check (
    exists (select 1 from public.pedidos p
              join public.sesiones_mesa s on s.id = p.sesion_mesa_id
             where p.id = pedido_id and s.cliente_id = auth.uid()
               and p.estado in ('borrador','rechazado'))
  );
-- Cocina y bar marcan listos SOLO los ítems de su sector
create policy items_sector_actualiza on public.pedido_items
  for update using (
    (public.perfil_actual() = 'cocinero'  and sector = 'cocina')
    or (public.perfil_actual() = 'cantinero' and sector = 'bar')
    or public.perfil_actual() in ('mozo','dueno','supervisor')
  );

-- ── MENSAJES: el cliente de la sesión y TODOS los mozos ─────
create policy mensajes_ver on public.mensajes
  for select using (
    public.perfil_actual() in ('mozo','dueno','supervisor')
    or exists (select 1 from public.sesiones_mesa s
                where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
  );
create policy mensajes_escribir on public.mensajes
  for insert with check (
    autor_id = auth.uid() and (
      public.perfil_actual() = 'mozo'
      or exists (select 1 from public.sesiones_mesa s
                  where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
    )
  );

-- ── ENCUESTAS: cualquiera lee los resultados (puntos 9 y 22) ─
create policy encuestas_lectura on public.encuestas for select using (true);
create policy respuestas_lectura on public.respuestas_encuesta for select using (true);
create policy encuestas_crear on public.encuestas
  for insert with check (cliente_id = auth.uid());
create policy respuestas_crear on public.respuestas_encuesta
  for insert with check (
    exists (select 1 from public.encuestas e
             where e.id = encuesta_id and e.cliente_id = auth.uid())
  );

-- ── JUEGOS: solo el cliente REGISTRADO puede jugar (punto 14) ─
create policy partidas_ver on public.partidas_juego
  for select using (cliente_id = auth.uid() or public.es_staff());
create policy partidas_crear on public.partidas_juego
  for insert with check (
    cliente_id = auth.uid() and public.perfil_actual() = 'cliente_registrado'
  );

-- ── CUENTAS ─────────────────────────────────────────────────
create policy cuentas_ver on public.cuentas
  for select using (
    public.es_staff()
    or exists (select 1 from public.sesiones_mesa s
                where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
  );
create policy cuentas_cliente_solicita on public.cuentas
  for insert with check (
    exists (select 1 from public.sesiones_mesa s
             where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
  );
create policy cuentas_actualizar on public.cuentas
  for update using (
    public.es_staff()
    or exists (select 1 from public.sesiones_mesa s
                where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
  );

-- ── NOTIFICACIONES ──────────────────────────────────────────
create policy notificaciones_propias on public.notificaciones
  for select using (usuario_id = auth.uid());
```

### 5.8. Storage

```sql
-- migrations/20260901000500_storage.sql

insert into storage.buckets (id, name, public) values
  ('fotos-usuarios',  'fotos-usuarios',  true),
  ('fotos-productos', 'fotos-productos', true),
  ('fotos-mesas',     'fotos-mesas',     true)
on conflict (id) do nothing;

create policy "lectura publica de fotos" on storage.objects
  for select using (
    bucket_id in ('fotos-usuarios','fotos-productos','fotos-mesas')
  );

create policy "usuarios autenticados suben fotos" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('fotos-usuarios','fotos-productos','fotos-mesas')
  );
```

**Convención de nombres de archivo:**

```
fotos-usuarios/{usuario_id}/perfil.jpg
fotos-productos/{producto_id}/{orden}.jpg      (orden = 1, 2 o 3)
fotos-mesas/{mesa_id}/mesa.jpg
```

Todas las fotos se comprimen antes de subir (ver 3.8).

### 5.9. Datos semilla

`supabase/seed.sql` debe generar, como mínimo:

| Qué | Cantidad | Referencia del TP |
|---|---|---|
| Un usuario de cada perfil de staff | 6 | "Preparación inicial" |
| Cliente registrado aprobado | 1 (mínimo) | "Preparación inicial" |
| Platos | 5 | "Preparación inicial" |
| Bebidas | 5 | "Preparación inicial" |
| Mesas (con sus QR) | 5 | "Preparación inicial" |
| Niveles de propina | 5 | Punto 21 |
| Juegos | 3 | Punto 14 |
| Preguntas de encuesta, con controles variados | 6-8 | Punto 20 |
| **Estadías, pedidos y encuestas simuladas** | **4 semanas** | "Preparación inicial" |

**Sobre las cuatro semanas de datos simulados:** es el requisito que más se posterga y el que hace que los gráficos del punto 20 tengan algo que mostrar. Generarlo con un script que reparta estadías a lo largo de 28 días, con pedidos y encuestas verosímiles. Sin esto, el punto 20 no se aprueba porque los gráficos salen vacíos.

Sobre las preguntas de encuesta: el enunciado exige **variedad de controles**, no repetir siempre el mismo. Una distribución que cumple:

| Pregunta (ejemplo) | Control |
|---|---|
| ¿Cómo calificarías la atención? | `estrellas` |
| ¿Qué te pareció el tiempo de espera? | `radio` |
| ¿Qué aspectos te gustaron? (varias opciones) | `checkbox` |
| ¿Cómo nos conociste? | `select` |
| Nivel de limpieza del local | `rango` |
| ¿Volverías? | `interruptor` |
| Comentarios adicionales | `texto_largo` |

---

## 6. REQUISITOS EXCLUYENTES — REGLAS DE IMPLEMENTACIÓN

> **Esta es la sección más importante del documento para cualquiera que escriba código de UI.**
>
> Los requisitos de la página 3 del enunciado son **excluyentes**: se puede tener los 22 puntos funcionales andando perfectamente y no promocionar por incumplir cualquiera de estos. Están traducidos acá a reglas concretas y verificables.

### 6.1. Apariencia y theming

**R1 — Prohibido el modo oscuro.**
Ionic activa el modo oscuro por defecto en sus proyectos nuevos. Hay que desactivarlo explícitamente:

- Borrar el bloque `@media (prefers-color-scheme: dark)` de `src/theme/variables.scss`.
- No importar `@ionic/angular/css/palettes/dark.always.css`, `dark.class.css` ni `dark.system.css` en `global.scss`.
- Nunca agregar la clase `ion-palette-dark` al `<html>`.
- No ofrecer ningún selector de tema en la app.

**R2 — Prohibidos los fondos blancos y negros**, y también los "clarito" y "oscurito". Ionic viene con `--ion-background-color: #ffffff`. Hay que reemplazar la paleta completa por colores de marca de tono medio.

**R3 — Contraste nítido obligatorio** entre texto y fondo, y entre imágenes, textos y fondos. Todo tiene que poder leerse con claridad. Verificar cada combinación de la paleta con un medidor de contraste antes de fijarla.

**R4 — Ningún espacio neutro.** La totalidad de la superficie de la pantalla debe estar ocupada con elementos. Implicancias:

- Los `ion-content` con poco contenido no pueden dejar el resto vacío: usar layouts flex que estiren los elementos.
- Los tamaños de texto y de los elementos se ajustan según el espacio disponible (el enunciado lo dice explícitamente en la imagen "Distribución de elementos").
- Botones y tarjetas grandes, no controles diminutos flotando en el vacío.

**R5 — Nada cortado ni descentrado.** Ninguna imagen ni texto informativo puede quedar cortado, descentrado o de un tamaño ilegible.

- Prohibido `text-overflow: ellipsis` en contenido informativo.
- Los ítems de un listado no se pueden cortar por la mitad: o entran completos en la pantalla visible, o entran *n* elementos completos. Definir alturas mínimas por tipo de ítem y verificar en el dispositivo más chico del equipo.
- Las fotos van en contenedores individuales, con buen tamaño, centradas, sin mostrar partes de otras fotos, y con la posibilidad de pasar a otra imagen.

**R6 — Prohibidas las abreviaturas.** "Cant." → "Cantidad". "Desc." → "Descripción". Sin excepciones.

**R7 — Todo el texto en español, con tildes.** Incluye mensajes de error, placeholders, textos de botones, títulos de pantalla, notificaciones y correos.

### 6.2. Retroalimentación al usuario

**R8 — Prohibido `alert()`.** Todo error o información se muestra con **distintos tipos de controles** — la variedad es parte del requisito, no alcanza con usar siempre un toast. Repertorio a usar según el caso:

| Situación | Control |
|---|---|
| Error de validación en un campo | Mensaje inline debajo del campo, con color de error |
| Error de operación recuperable | `ion-toast` con color de peligro |
| Confirmación destructiva | `ion-alert` del `AlertController` (no el `alert()` del navegador) |
| Información contextual extensa | `ion-modal` |
| Estado de un elemento en un listado | `ion-badge` / `ion-chip` |
| Éxito de una operación | `ion-toast` con color de éxito y sonido |
| Aviso persistente | Banner fijo con `ion-note` |

**R9 — Vibración ante TODOS los errores.** Sin excepción, todos. La forma de garantizarlo es centralizar: ningún componente maneja errores por su cuenta.

```typescript
// src/app/nucleo/servicios/servicio-errores.ts
@Injectable({ providedIn: 'root' })
export class ServicioErrores {
  async mostrar(mensaje: string, severidad: 'leve' | 'grave' = 'leve') {
    await Haptics.impact({
      style: severidad === 'grave' ? ImpactStyle.Heavy : ImpactStyle.Medium,
    });
    // …presenta el control visual correspondiente
  }
}
```

Todo `catch` de la aplicación pasa por acá. Prohibido `console.error` como único manejo.

**R10 — Indicadores visuales (spinners) CON EL LOGO en TODAS las esperas.** Sin excepción, todas. El `ion-spinner` pelado no cumple: hay que envolverlo en un componente propio que incluya el logo de la empresa.

```
<app-cargando [visible]="cargando()" mensaje="Buscando mesas disponibles…" />
```

Prohibido usar `ion-loading` con su spinner por defecto. Prohibido dejar una operación asíncrona sin indicador.

**R11 — Sonidos distintos al iniciar y al cerrar la aplicación.** Dos archivos de audio distintos, precargados con `NativeAudio`.

- Inicio: en el `APP_INITIALIZER` o al terminar el splash animado.
- Cierre: en el listener de `App` `'pause'`.

> **Riesgo conocido:** cuando Android suspende la app, el proceso puede morir antes de que el audio termine de sonar. Es un problema real y hay que resolverlo temprano (audio corto, de menos de 400 ms, disparado en `pause`). Anotado en la sección 12.

### 6.3. Ingreso y sesión

**R12 — Botones de ingreso rápido de usuarios con distintos perfiles.** El enunciado es explícito: **NO** usar botones fijos, combos ni similares.

Interpretación: los botones se generan dinámicamente a partir de los usuarios que existen en la base. Si mañana se agrega un empleado, aparece su botón sin tocar código.

```typescript
// Cargar de la base, no hardcodear
const { data } = await supabase
  .from('usuarios')
  .select('id, nombres, apellidos, perfil, foto_url, correo')
  .eq('estado', 'aprobado');
// …renderizar un botón por cada uno, con su foto y su perfil visible
```

**R13 — Botón de cierre de sesión, y verificar que las credenciales se borren.** El logout debe:

1. Llamar a `supabase.auth.signOut()`.
2. Limpiar las `Preferences` de sesión.
3. Limpiar cualquier señal o estado de usuario en memoria.
4. Desregistrar el token push del dispositivo (borrar la fila de `dispositivos_push`).
5. Navegar al ingreso con `replaceUrl: true` para que el botón "atrás" no vuelva a la sesión.

Hay que poder **demostrar** que las credenciales se borraron.

**R14 — Pantallas de presentación (splash) estáticas y animadas**, con el **ícono de la aplicación**, el **nombre del grupo** y los **apellidos y nombres de cada integrante**.

Son dos cosas distintas y hacen falta las dos:

- **Estática:** la nativa de Capacitor (`@capacitor/splash-screen`), generada con `@capacitor/assets`.
- **Animada:** una pantalla Angular que se muestra al terminar la nativa, con animación propia, y que muestra el ícono, el nombre del grupo y los cuatro integrantes.

### 6.4. Datos

**R15 — Validación de datos en TODOS los formularios, TODOS los campos.** Formatos, campos vacíos, tipos de datos.

Usar Reactive Forms con validadores, y un componente único de mensajes de error para que se vean igual en toda la app:

```
<app-errores-campo [control]="formulario.controls.dni" />
```

Validaciones mínimas por tipo de campo:

| Campo | Reglas |
|---|---|
| Nombres / apellidos | Requerido, solo letras y espacios (con tildes y ñ), 2-50 caracteres |
| DNI | Requerido, 7 u 8 dígitos, único |
| CUIL | Requerido en empleados, 11 dígitos, dígito verificador válido |
| Correo | Requerido, formato válido, único |
| Clave | Requerida, mínimo 6 caracteres |
| Precio | Requerido, numérico, mayor a cero, máximo 2 decimales |
| Tiempo de elaboración | Requerido, entero, mayor a cero |
| Cantidad de comensales | Requerido, entero, entre 1 y 20 |
| Número de mesa | Requerido, entero, único |
| Fotos | Cantidad exacta requerida (3 en productos, 1 en personas y mesas) |

**Doble validación:** la del formulario es para la experiencia de usuario; los `CHECK` constraints de la sección 5.4 son la garantía real. Las dos tienen que existir.

### 6.5. Capacidades del dispositivo

**R16 — Notificaciones automáticas (push) con la aplicación abierta O cerrada.** Ver arquitectura en 3.3. Los eventos que las requieren están marcados en la sección 7.

**R17 — Envío automático de correos electrónicos desde cuenta empresarial**, no desde la cuenta personal de un integrante. Ver 3.5.

**R18 — Lectura y generación de distintos códigos QR.** Las dos cosas: leer (ingreso, mesa, propina, DNI) y generar (mesa, propina, ingreso). Y **todos los QR deben estar disponibles** — en el README, en pantalla, impresos.

### 6.6. Contenido

**R19 — Al menos tres juegos simples, completamente funcionales.** No maquetas: jugables de punta a punta, con lógica de victoria y derrota. Cada uno otorga un descuento distinto: 10 %, 15 % y 20 %.

**R20 — Generación de distintos tipos de encuestas usando variedad de controles.** No usar siempre los mismos controles para recolectar información. Ver la distribución sugerida en 5.9.

**R21 — Gráficos estadísticos (torta, barra, línea, etc.) que reflejen los datos recolectados en las encuestas. Cada gráfico en una pantalla distinta.**

Esto último es literal: no se puede armar un dashboard con los tres gráficos juntos. Un gráfico, una pantalla, con navegación entre ellas.

**R22 — Los puntos funcionales 1 al 22 completos.**

### 6.7. Lista de verificación previa a cada revisión

Pasar esta lista antes de cada revisión semanal. Un solo ítem en rojo puede costar el punto.

```
APARIENCIA
[ ] Ninguna pantalla tiene fondo blanco, negro, "clarito" ni "oscurito"
[ ] El modo oscuro del sistema no altera la app (probar cambiándolo en el celular)
[ ] Ninguna pantalla tiene espacios vacíos
[ ] Ningún texto ni imagen queda cortado, descentrado o ilegible
[ ] Ningún listado corta un elemento por la mitad
[ ] No hay abreviaturas en ningún texto visible
[ ] Todo el texto está en español y con tildes

RETROALIMENTACIÓN
[ ] No existe ni un alert() en el código (grep del proyecto)
[ ] Todos los errores vibran
[ ] Todas las esperas muestran el spinner con logo
[ ] Se usan al menos 4 tipos distintos de control para mostrar información
[ ] Suena algo al abrir la app, y algo distinto al cerrarla

DATOS
[ ] Todos los campos de todos los formularios validan
[ ] Se probó dejar cada campo vacío y con formato inválido

SESIÓN
[ ] Los botones de ingreso rápido salen de la base, no están hardcodeados
[ ] El botón de cierre de sesión borra las credenciales (demostrable)

DISPOSITIVO
[ ] Las push llegan con la app CERRADA (probado en los 4 dispositivos)
[ ] Los correos llegan desde la cuenta empresarial, con logo y estilos propios
[ ] Todos los QR se leen y todos están disponibles

LOGÍSTICA
[ ] Los 4 dispositivos tienen la MISMA versión instalada
[ ] El README está actualizado con módulos, fechas y branches
[ ] El índice de imágenes del README está completo
[ ] La base de Supabase está despierta
```

---

## 7. LOS 22 PUNTOS FUNCIONALES

Alcance de la primera fecha. Cada punto indica el dispositivo en el que se ejecuta según el enunciado, porque la demostración se hace con los cuatro en simultáneo.

Convenciones: 📲 = requiere push notification · ✉️ = requiere correo automático · 📷 = requiere cámara · 🔳 = requiere QR

---

### Punto 1 — Alta de empleado 📷 🔳
**Dispositivo 1 · Perfiles: dueño o supervisor**

Alta de un empleado con perfil **cocinero**. Campos: nombres, apellidos, DNI, CUIL, correo electrónico, contraseña, perfil y foto personal.

- La foto **se toma desde el dispositivo**. No se permite elegir de la galería.
- Debe haber un lector de código del DNI que autocomplete los campos correspondientes (ver advertencia PDF417 en 3.4).
- Validar **todos** los campos: formatos, vacíos, tipos de datos.

**Tablas:** `usuarios` (insert, perfil `cocinero`, estado `aprobado`), `storage.fotos-usuarios`

**Criterios de aceptación:**

- [ ] El formulario rechaza cada campo vacío con mensaje visible y vibración
- [ ] El DNI se autocompleta al escanear el documento — hay que **demostrar la lectura**
- [ ] La foto solo puede tomarse con la cámara
- [ ] El empleado creado puede iniciar sesión
- [ ] El empleado aparece en el listado de personal

---

### Punto 2 — Alta de plato 📷
**Dispositivo 2 · Perfil: cocinero**

Nombre, descripción, tiempo de elaboración en minutos, precio y **tres (3) fotos**, tomadas del dispositivo o elegidas de la galería.

Las fotos se muestran en contenedores individuales, con buen tamaño, sin que se vean partes de otras fotos, centradas y con la posibilidad de pasar a otra imagen (carrusel).

**Tablas:** `productos` (tipo `plato`, sector `cocina`), `producto_fotos` (3 filas)

**Criterios de aceptación:**

- [ ] No se puede guardar con menos de 3 fotos
- [ ] El carrusel muestra una sola foto por vez, centrada y completa
- [ ] Todos los campos validan
- [ ] El plato aparece en la carta (menú) inmediatamente

---

### Punto 3 — Alta de bebida 📷
**Dispositivo 3 · Perfil: cantinero**

Idéntico al punto 2 pero para bebidas, que se derivan al sector **bar**.

**Tablas:** `productos` (tipo `bebida`, sector `bar`), `producto_fotos`

**Criterios de aceptación:** los mismos del punto 2, más:

- [ ] La bebida queda asignada al sector bar, no a cocina

---

### Punto 4 — Alta de mesa 📷 🔳
**Dispositivo 4 · Perfiles: dueño o supervisor**

Número, cantidad de comensales, tipo (VIP, estándar, movilidad reducida), disponibilidad (vacía por defecto) y foto **tomada desde el dispositivo**.

La foto se muestra en un contenedor individual, con buen tamaño y centrada.

**El código QR de la mesa se genera de forma automática.** Además, debe existir gestión de mesas con posibilidad de modificar la disponibilidad.

**Tablas:** `mesas` (el `qr_token` se genera solo por `default`)

**Criterios de aceptación:**

- [ ] El QR se genera automáticamente al crear la mesa, sin intervención
- [ ] El QR es legible y se puede mostrar en pantalla y exportar
- [ ] La mesa aparece en el listado
- [ ] Se puede cambiar la disponibilidad desde la gestión de mesas
- [ ] No se permiten dos mesas con el mismo número

---

### Punto 5 — Alta de cliente registrado 📷 🔳 ✉️
**Dispositivo 2 · Perfiles: cliente (autoregistro) o metre**

Nombres, apellidos, DNI, correo electrónico, contraseña y foto personal **tomada desde el dispositivo**. Lector del código del DNI para autocompletar.

**Reglas de negocio:**

- El registro queda en estado **`pendiente`**.
- Solo **dueño o supervisor** pueden aprobar o rechazar.
- Se envía automáticamente un correo al cliente informando la situación de su registro.
- **El cliente NO puede ingresar a la aplicación si no fue aceptado previamente.**
- Los clientes anónimos no requieren aprobación.

**Tablas:** `usuarios` (perfil `cliente_registrado`, estado `pendiente`)

**Criterios de aceptación:**

- [ ] Todos los campos validan
- [ ] Se demuestra la lectura del código del DNI
- [ ] El cliente recién creado queda en estado pendiente
- [ ] Al intentar ingresar sin aprobación, se muestra un mensaje alusivo (no un alert)

---

### Punto 6 — Listado de clientes pendientes 📲
**Dispositivo 1 · Perfiles: dueño o supervisor**

El registro del punto 5 aparece en el listado de clientes pendientes de aprobación, y llega una **push notification**.

El listado contiene como mínimo apellidos, nombres y **foto** del cliente. Cada foto se ve con buen tamaño y claramente relacionada con el nombre y apellido correspondiente.

Debe existir un control para aceptar o rechazar.

**Tablas:** `usuarios` where `estado = 'pendiente'` · **Realtime:** canal `clientes-pendientes`

**Criterios de aceptación:**

- [ ] La push llega al dueño con la app **cerrada**
- [ ] El listado se actualiza solo si la app está abierta
- [ ] Las fotos se ven grandes y bien asociadas a cada nombre
- [ ] Ningún elemento del listado queda cortado

---

### Punto 7 — Rechazo de cliente ✉️
**Dispositivo 1 · Perfiles: dueño o supervisor**

El cliente recibe un correo informando la situación de su registro.

**El correo debe tener:** logo de la empresa, mensaje personalizado, fuentes distintas, colores y tamaños diferentes a los que vienen por defecto. **Estos mismos cambios deben aplicarse también al correo de confirmación** — el enunciado insiste en la simetría entre ambos.

El correo debe ser **automático** y **no** enviarse desde la cuenta personal de ningún integrante.

Verificar que el cliente rechazado (dispositivo 2) **no pueda ingresar**, informándolo con un mensaje alusivo.

**Tablas:** `usuarios` (estado `rechazado`, `motivo_rechazo`), `correos_enviados` · **Edge Function:** `enviar-correo`

**Criterios de aceptación:**

- [ ] El correo llega solo, sin intervención manual
- [ ] El remitente es la cuenta empresarial, no un Gmail personal
- [ ] Tiene logo, tipografía, colores y tamaños propios
- [ ] El cliente rechazado no puede ingresar y ve un mensaje claro

---

### Punto 8 — Aprobación de cliente ✉️
**Dispositivo 1 · Perfiles: dueño o supervisor**

Simétrico al punto 7. Mismo estándar de correo. Verificar que el cliente aprobado **sí pueda ingresar**.

**Tablas:** `usuarios` (estado `aprobado`), `correos_enviados`

**Criterios de aceptación:**

- [ ] El correo cumple el mismo estándar visual que el de rechazo
- [ ] El cliente aprobado ingresa sin problemas

---

### Punto 9 — Ingreso de cliente anónimo y lista de espera 📷 🔳 📲
**Dispositivo 3 (cliente anónimo) · Dispositivo 4 (metre)**

El cliente anónimo se registra solo con **nombre y foto**, sin aprobación. Escanea el **QR de entrada** para solicitar mesa y quedar en la **lista de espera**.

El QR de ingreso al local habilita dos cosas: anotarse en la lista de espera **y** ver los resultados de las encuestas previas.

**Tablas:** `usuarios` (perfil `cliente_anonimo`), `lista_espera` · **Realtime:** canal `lista-espera`

**Criterios de aceptación:**

- [ ] Aparece en la lista de espera del metre y llega **push** al metre
- [ ] Cada cliente de la lista puede ser **eliminado** del listado
- [ ] Un cliente **no puede tomar una mesa** sin estar previamente en la lista de espera
- [ ] Desde el QR de ingreso se accede a los resultados de encuestas previas
- [ ] El listado del metre no corta elementos

---

### Punto 10 — Asignación de mesa 🔳 📲
**Dispositivo 4 (metre) → Dispositivo 2 (cliente registrado)**

El metre asigna una mesa a un cliente registrado. Llega **push** al cliente.

El cliente escanea el **QR de la mesa asignada** para vincularse.

**Tablas:** `lista_espera` (estado `asignado`), `sesiones_mesa` (insert), `mesas` (estado `ocupada`)

Las tres reglas de exclusividad las garantizan los índices únicos parciales definidos en 5.5, no el código de la app.

**Criterios de aceptación:**

- [ ] La push llega al cliente
- [ ] Si el cliente escanea el QR de **otra** mesa, se le indica cuál es la suya y no se vincula
- [ ] Con la mesa ya asignada, no puede vincularse a otra
- [ ] Esa misma mesa **no** puede asignarse a otro cliente (probar desde el dispositivo 3)

---

### Punto 11 — Menú y consulta al mozo 🔳 📲
**Dispositivo del cliente · Dispositivos 1 y 4 (mozos)**

Al cargar el QR de la mesa, el cliente ve el listado de productos (comidas, bebidas, postres) con **tres imágenes por producto**, nombre, precio, descripción y tiempo estimado de elaboración.

Las imágenes van en contenedores individuales, con buen tamaño, sin mostrar partes de otras imágenes, centradas y con posibilidad de pasar a otra.

Con la mesa asignada se habilita el botón **"consulta al mozo"**, que permite una consulta rápida con **número de mesa** y **fecha con hora y minutos**.

Se genera una **sala de conversación estilo WhatsApp** entre los mozos y los clientes (todos los mozos y todos los clientes).

**Tablas:** `productos`, `producto_fotos`, `mensajes` · **Realtime:** canal `sala-{sesion_id}`

**Criterios de aceptación:**

- [ ] Cada producto muestra sus 3 imágenes, una por vez, centradas y completas
- [ ] La consulta llega a **todos** los mozos (dispositivos 1 y 4) por **push**
- [ ] Un mozo responde y la respuesta incluye **su nombre** y **fecha con hora y minutos**
- [ ] La respuesta se verifica en el cliente por **push**
- [ ] La sala se comporta como un chat: mensajes en orden, se distingue quién escribió

---

### Punto 12 — Realización del pedido 📲
**Dispositivo del cliente**

El cliente arma el pedido **para todos los comensales de la mesa**, eligiendo productos con sus cantidades.

**Requisito subrayado en el enunciado:** el **importe acumulado debe estar visible en todo momento y con buen tamaño**. Se evalúa específicamente.

También debe mostrarse el **tiempo total estimado** de realización del pedido completo.

El cliente termina el pedido y espera la confirmación del mozo (**push** al mozo).

**Tablas:** `pedidos` (`borrador` → `pendiente_confirmacion`), `pedido_items`

**Criterios de aceptación:**

- [ ] El importe acumulado se actualiza al instante y se ve grande y claro
- [ ] Se muestra el tiempo total estimado
- [ ] Al enviarlo, llega **push** al mozo
- [ ] **El pedido NO se deriva a los sectores hasta que el mozo confirme** — verificar que cocina y bar no lo vean todavía
- [ ] El cliente puede consultar el estado de su pedido

---

### Punto 13 — Rechazo del pedido por el mozo 📲
**Dispositivo 4 (mozo) → cliente**

El mozo rechaza el pedido para que el cliente lo modifique, parcial o totalmente (**push** al cliente).

**Tablas:** `pedidos` (estado `rechazado`, `motivo_rechazo`), `pedido_items`

**Criterios de aceptación:**

- [ ] Llega **push** al cliente con el motivo
- [ ] El cliente puede modificar productos y cantidades
- [ ] El cliente puede **agregar, modificar y quitar** productos
- [ ] Al reenviarlo, llega **push** nuevamente al mozo

---

### Punto 14 — Confirmación del pedido 📲
**Dispositivo 4 (mozo)**

El mozo confirma y el pedido se deriva a los sectores correspondientes (cocina y bar).

A partir de acá el cliente puede acceder a los **juegos** y al **estado de su pedido**.

**Reglas de los juegos** (definidas en este punto del enunciado):

- Los descuentos **no son acumulativos**.
- Solo se obtiene descuento **si se gana en el primer intento**.
- Son **tres juegos simples**, solo para **cliente registrado** (el anónimo **NO**).
- Otorgan 10 %, 15 % y 20 % de descuento.

**Tablas:** `pedidos` (estado `confirmado`), `pedido_items` (visibles por sector)

**Criterios de aceptación:**

- [ ] Llega **push** a cocina y a bar
- [ ] Cada sector ve **solo** los ítems que le corresponden
- [ ] El cliente accede a los juegos recién ahora
- [ ] Un cliente anónimo **no** puede acceder a los juegos

---

### Punto 15 — Juegos y descuentos
**Dispositivo del cliente registrado**

El cliente accede a la sección de juegos en busca de descuentos.

**Tablas:** `juegos`, `partidas_juego`

**Criterios de aceptación:**

- [ ] Los tres juegos son **completamente funcionales**, no maquetas
- [ ] Solo se aplica **un** descuento: el primero obtenido
- [ ] El descuento solo se otorga si ganó **en el primer intento**
- [ ] Una vez obtenido el beneficio, puede seguir jugando libremente **las veces que quiera**, sin obtener descuentos adicionales
- [ ] El descuento se ve reflejado después en la cuenta (punto 21)

---

### Punto 16 — Sector cocina
**Dispositivo 1 · Perfil: cocinero**

El sector cocina recibe los productos que le corresponden. En el **listado de pedidos pendientes** se visualiza:

- Número de mesa
- Fecha, **con hora y minutos**
- Los ítems que debe elaborar el sector (nombre y cantidad)

Los listados están **agrupados por número de mesa**, los números son visibles, y hay **espacio entre distintos pedidos** para facilitar la manipulación por parte del cocinero.

**Tablas:** `pedido_items` where `sector = 'cocina'` · **Realtime:** canal `pedidos-cocina`

**Criterios de aceptación:**

- [ ] Agrupado por número de mesa, con el número bien visible
- [ ] Fecha con hora y minutos
- [ ] Separación clara entre pedidos distintos
- [ ] Ningún elemento del listado queda cortado
- [ ] **El cliente verifica el cambio de estado en su pedido**

---

### Punto 17 — Sector bar
**Dispositivo 3 · Perfil: cantinero**

Idéntico al punto 16, para el sector bar.

**Tablas:** `pedido_items` where `sector = 'bar'` · **Realtime:** canal `pedidos-bar`

**Criterios de aceptación:** los mismos del punto 16.

---

### Punto 18 — Pedido completo 📲
**Ambos sectores → Dispositivo 4 (mozo)**

Cada sector realiza sus tareas y avisa cuando todos sus productos están listos.

**Regla clave:** cada parte del pedido se visualiza en el listado de pedidos pendientes del mozo, pero **solo se informa cuando el pedido está completo en todos los sectores intervinientes**. Está implementado en el trigger `evaluar_pedido_listo` (sección 5.6).

**Tablas:** `pedido_items` (estado `listo`), `pedidos` (estado `listo`) · **Realtime:** canal `pedidos-mozo`

**Criterios de aceptación:**

- [ ] El mozo ve el avance parcial de cada sector
- [ ] La **push** de "pedido completo" llega **solo** cuando todos los sectores terminaron
- [ ] Si el pedido tiene ítems de un solo sector, se informa cuando ese sector termina
- [ ] El cliente verifica el cambio de estado

---

### Punto 19 — Entrega
**Dispositivo 4 (mozo) → cliente**

El mozo entrega el pedido completo (comidas, bebidas y postres). El cliente **confirma la recepción**.

**Tablas:** `pedidos` (estado `entregado`)

**Criterios de aceptación:**

- [ ] El cliente confirma explícitamente la recepción
- [ ] El cliente verifica el cambio de estado
- [ ] A partir de acá el cliente puede acceder a: **juegos**, **encuesta** y **"pedir la cuenta"**

---

### Punto 20 — Encuesta y gráficos
**Dispositivo del cliente**

El cliente accede a la encuesta e ingresa su opinión sobre diversos temas.

**Tablas:** `preguntas_encuesta`, `encuestas`, `respuestas_encuesta`

**Criterios de aceptación:**

- [ ] Solo se puede **agregar una encuesta nueva por estadía** — al segundo intento se informa que ya respondió
- [ ] La encuesta usa **variedad de controles**, no siempre el mismo (ver 5.9)
- [ ] Todos los campos validan
- [ ] Los resultados se muestran en **distintos tipos de gráficos** (torta, barra, línea)
- [ ] **Cada gráfico está en una pantalla distinta** — no un dashboard con los tres juntos
- [ ] Los gráficos tienen datos reales, alimentados por las 4 semanas de datos simulados

---

### Punto 21 — Cuenta y propina 🔳 📲
**Dispositivo del cliente · push a mozo, dueño y supervisor**

El cliente solicita la cuenta al mozo (**push**).

Se habilita, **mediante la lectura del código QR correspondiente**, el ingreso de la propina. **No se podrá generar la cuenta sin antes seleccionar el porcentaje de propina.**

El detalle de la cuenta debe contener:

- Los pedidos realizados, **con precios unitarios** y su respectivo importe
- Los descuentos correspondientes a los juegos (solo si ganó en el primer intento)
- El grado de satisfacción del cliente (propina)
- El **TOTAL a abonar, grande y claro**

Referencia visual: **tomar como modelo a Mercado Pago.**

El cliente realiza el **pago simulado** y espera la confirmación del mozo (**push**). La notificación automática la reciben el **mozo**, el **dueño** y el **supervisor**.

**Tablas:** `cuentas`, `niveles_propina` · **Función:** `calcular_cuenta`

**Criterios de aceptación:**

- [ ] Sin escanear un QR de propina, la cuenta **no se genera**
- [ ] Los cinco QR de propina funcionan y aplican 20/15/10/5/0 %
- [ ] El detalle muestra precios unitarios e importes por línea
- [ ] El descuento del juego aparece como línea propia
- [ ] El TOTAL se ve grande y claro
- [ ] La estética sigue el modelo de Mercado Pago
- [ ] Al pagar, llega **push** al mozo, al dueño y al supervisor

---

### Punto 22 — Confirmación de pago y liberación de la mesa 🔳 📲
**Dispositivo 4 (mozo)**

El mozo confirma el pago y **se libera la mesa**.

**Tablas:** `cuentas` (estado `confirmada`) → trigger libera `sesiones_mesa` y `mesas`

**Criterios de aceptación:**

- [ ] Tras la confirmación, llega **push** al dueño y al supervisor
- [ ] La mesa queda libre — se verifica **haciendo que el cliente vuelva a escanear el QR de esa mesa**
- [ ] El cliente, escaneando el QR de la lista de espera, puede ver los resultados de las encuestas en distintos tipos de gráficos, **un gráfico por pantalla**

> ⚠️ **Ojo con la numeración.** El punto 22 de la **segunda fecha** es distinto: agrega la generación de factura en PDF. **No corresponde a esta entrega.** Nuestro punto 22 es el de arriba.

---

### 7.1. Resumen de eventos que requieren push

| # | Evento | Destinatarios |
|---|---|---|
| 6 | Nuevo cliente pendiente de aprobación | Dueño, supervisor |
| 9 | Cliente se anota en la lista de espera | Metre |
| 10 | Mesa asignada | Cliente |
| 11 | Consulta al mozo | **Todos** los mozos |
| 11 | Respuesta del mozo | Cliente |
| 12 | Pedido enviado | Mozo |
| 13 | Pedido rechazado | Cliente |
| 13 | Pedido reenviado | Mozo |
| 14 | Pedido confirmado y derivado | Cocinero, cantinero |
| 18 | Pedido completo en todos los sectores | Mozo |
| 18 | Cambio de estado del pedido | Cliente |
| 21 | Cuenta solicitada | Mozo |
| 21 | Pago realizado | Mozo, dueño, supervisor |
| 22 | Pago confirmado | Dueño, supervisor |

### 7.2. Resumen de correos automáticos

| # | Evento | Destinatario | Plantilla |
|---|---|---|---|
| 7 | Registro rechazado | Cliente | `cliente-rechazado` |
| 8 | Registro aprobado | Cliente | `cliente-aprobado` |

Ambas plantillas comparten cabecera con logo, tipografía, colores y tamaños propios.

---

## 8. ESTRUCTURA DEL PROYECTO

```
[NOMBRE_GRUPO]-2026/
├── CONTEXTO-PROYECTO.md          ← este documento
├── README.md                      ← formato exigido por la cátedra (11.3)
├── capacitor.config.ts
├── ionic.config.json
│
├── docs/
│   ├── imagenes/                  ← TODAS las capturas, indexadas en el README
│   ├── qr/                        ← QR de ingreso, de las 5 mesas y de las 5 propinas
│   └── decisiones/                ← registro de decisiones tomadas
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   │   ├── enviar-push/
│   │   └── enviar-correo/
│   │       └── plantillas/
│   └── seed.sql
│
├── src/
│   ├── app/
│   │   ├── nucleo/                        # transversal, sin dependencias de páginas
│   │   │   ├── supabase/
│   │   │   │   ├── cliente-supabase.ts
│   │   │   │   └── almacenamiento-sesion.ts
│   │   │   ├── servicios/
│   │   │   │   ├── servicio-autenticacion.ts
│   │   │   │   ├── servicio-errores.ts        # R9: vibración centralizada
│   │   │   │   ├── servicio-carga.ts          # R10: spinner con logo
│   │   │   │   ├── servicio-sonidos.ts        # R11
│   │   │   │   ├── servicio-imagenes.ts       # compresión + subida
│   │   │   │   ├── servicio-escaner.ts        # QR + PDF417 del DNI
│   │   │   │   ├── servicio-push.ts
│   │   │   │   └── servicio-tiempo-real.ts
│   │   │   ├── guardias/
│   │   │   │   ├── guardia-sesion.ts
│   │   │   │   └── guardia-perfil.ts
│   │   │   └── modelos/                       # interfaces espejo del esquema SQL
│   │   │
│   │   ├── compartido/                    # componentes reutilizables
│   │   │   ├── cargando/                      # R10
│   │   │   ├── errores-campo/                 # R15
│   │   │   ├── carrusel-imagenes/             # R5
│   │   │   ├── tarjeta-producto/
│   │   │   ├── escaner-qr/
│   │   │   └── generador-qr/
│   │   │
│   │   ├── paginas/
│   │   │   ├── presentacion/                  # splash animado, R14
│   │   │   ├── ingreso/                       # botones dinámicos, R12
│   │   │   ├── gerencia/                      # dueño y supervisor
│   │   │   │   ├── alta-empleado/             # punto 1
│   │   │   │   ├── alta-mesa/                 # punto 4
│   │   │   │   ├── gestion-mesas/             # punto 4
│   │   │   │   └── clientes-pendientes/       # puntos 6, 7, 8
│   │   │   ├── catalogo/
│   │   │   │   ├── alta-plato/                # punto 2
│   │   │   │   └── alta-bebida/               # punto 3
│   │   │   ├── metre/
│   │   │   │   └── lista-espera/              # puntos 9, 10
│   │   │   ├── cliente/
│   │   │   │   ├── registro/                  # punto 5
│   │   │   │   ├── ingreso-anonimo/           # punto 9
│   │   │   │   ├── menu/                      # punto 11
│   │   │   │   ├── pedido/                    # puntos 12, 13
│   │   │   │   ├── estado-pedido/             # puntos 14-19
│   │   │   │   ├── juegos/                    # puntos 14, 15
│   │   │   │   ├── encuesta/                  # punto 20
│   │   │   │   └── cuenta/                    # punto 21
│   │   │   ├── mozo/
│   │   │   │   ├── pedidos-pendientes/        # puntos 12, 13, 14, 18
│   │   │   │   ├── entrega/                   # punto 19
│   │   │   │   └── cobro/                     # puntos 21, 22
│   │   │   ├── sectores/
│   │   │   │   ├── cocina/                    # punto 16
│   │   │   │   └── bar/                       # punto 17
│   │   │   ├── conversacion/                  # punto 11
│   │   │   └── graficos/
│   │   │       ├── grafico-torta/             # R21: una pantalla por gráfico
│   │   │       ├── grafico-barras/
│   │   │       └── grafico-lineal/
│   │   └── app.routes.ts
│   │
│   ├── theme/
│   │   └── variables.scss             # paleta sin blancos ni negros, sin modo oscuro
│   ├── assets/
│   │   ├── logo/
│   │   ├── sonidos/                   # inicio.mp3, cierre.mp3
│   │   └── juegos/
│   └── environments/
│
└── android/
```

**Convención de nombres:** todo en español y en `kebab-case` para archivos, `PascalCase` para clases, `camelCase` para variables y métodos. Los nombres de las tablas y columnas se usan **exactamente** como están en la sección 5.

---

## 9. PLAN DE INTEGRACIÓN

### 9.1. Principio rector

Las revisiones son semanales y los puntos se aprueban ahí. El plan está construido para que **cada semana haya algo demostrable en los cuatro dispositivos**, no para tener todo a medias hasta octubre.

Dos hitos internos:

- **Fin de la semana 5 (4 de octubre): puntos 1 a 14 aprobados.** Es el mínimo para poder presentarse. Si a esa fecha no están, la primera fecha se cae y hay que replanificar.
- **Fin de la semana 7 (16 de octubre): puntos 1 a 22 aprobados.** Es la promoción.

### 9.2. Cronograma

**Semana 0 — 25 al 30 de agosto · CIERRE DE INSCRIPCIÓN**

| Tarea | Responsable |
|---|---|
| ⚠️ **Inscribir al grupo en el formulario (vence el 29/08)** | `[LIDER]` |
| Crear repo privado `[NOMBRE_GRUPO]-2026` y agregar a los 6 docentes | `[LIDER]` |
| Subir este documento y el README inicial | `[LIDER]` |
| Definir nombre de la app, logo e ícono | Todos |
| Crear proyecto de Supabase y de Firebase | `[INTEGRANTE_A]` |
| Comprar el dominio para el correo empresarial | `[LIDER]` |
| Confirmar que los 4 tienen un Android para probar | Todos |

**Semana 1 — 31 de agosto al 6 de septiembre · Cimientos**

Nada de esto es un punto funcional, pero todo lo demás depende de esto.

- Proyecto Ionic + Angular + Capacitor inicializado y compilando en dispositivo real
- Migraciones SQL aplicadas: esquema completo de la sección 5
- `seed.sql` con usuarios, 5 platos, 5 bebidas, 5 mesas, propinas, juegos y preguntas
- **Paleta y theme definitivos**, sin modo oscuro, sin blancos ni negros (R1-R3)
- Componentes transversales: `app-cargando`, `app-errores-campo`, `ServicioErrores`
- Splash estático + animado con integrantes (R14)
- Sonidos de inicio y cierre (R11)
- Ingreso con botones dinámicos y cierre de sesión (R12, R13)
- Distribución del primer APK a los cuatro dispositivos

**Semana 2 — 7 al 13 de septiembre · Altas y QR**

Puntos **1, 2, 3, 4**. Es el bloque más autocontenido y se puede repartir bien entre los cuatro.

- Servicio de cámara con compresión (R5, 3.8)
- Escáner QR + PDF417 del DNI funcionando en dispositivo real
- Generación de QR de mesa automática, y los 5 QR de propina exportados a `docs/qr/`
- Carrusel de imágenes que no corta nada (R5)

**Semana 3 — 14 al 20 de septiembre · Clientes, correos y push**

Puntos **5, 6, 7, 8**. Acá se resuelven las dos integraciones externas.

- FCM configurado; Edge Function `enviar-push` andando
- **Probar push con la app CERRADA en los cuatro dispositivos** — no dejarlo para después
- Resend configurado con dominio verificado; Edge Function `enviar-correo`
- Plantillas HTML de aprobación y rechazo con logo y estilos propios
- Estado `pendiente` bloqueando el ingreso

**Semana 4 — 21 al 27 de septiembre · Ingreso al local y mesa**

Puntos **9, 10, 11**.

- Cliente anónimo con `signInAnonymously`
- Lista de espera con Realtime
- Asignación de mesa y las tres reglas de exclusividad
- Menú con 3 imágenes por producto
- Sala de conversación cliente ↔ mozos

**Semana 5 — 28 de septiembre al 4 de octubre · Pedido · HITO 1-14**

Puntos **12, 13, 14** + los tres juegos (15).

- Importe acumulado siempre visible (requisito subrayado)
- Ciclo completo enviar → rechazar → modificar → reenviar → confirmar
- Derivación a sectores solo después de la confirmación
- Los tres juegos funcionales con sus descuentos

🎯 **Al cierre de esta semana deben estar aprobados los puntos 1 a 14.**

**Semana 6 — 5 al 11 de octubre · Sectores, entrega y encuestas**

Puntos **16, 17, 18, 19, 20**.

- Listados de cocina y bar agrupados por mesa, con separación entre pedidos
- Trigger de "pedido completo" y su push
- Entrega y confirmación del cliente
- Encuesta con controles variados
- Los tres gráficos, **uno por pantalla**
- **Generar las 4 semanas de datos simulados** para que los gráficos tengan contenido

**Semana 7 — 12 al 16 de octubre · Cuenta, cierre y ensayo**

Puntos **21, 22** + pulido.

- Cuenta con detalle completo, estética Mercado Pago
- QR de propina obligatorio antes de generar la cuenta
- Pago simulado y liberación de la mesa
- **Recorrer entera la lista de verificación de 6.7**
- **Ensayo cronometrado de la demo** (máximo 30 minutos)
- Compilar el APK definitivo e instalarlo en los cuatro dispositivos
- README con el índice completo de imágenes

**17 de octubre — Entrega.**

### 9.3. Guion de la demostración

Hay 30 minutos como máximo y cuatro dispositivos. Conviene tenerlo guionado y ensayado, con la base ya poblada y los cuatro celulares cargados.

| Minutos | Qué se muestra | Dispositivos |
|---|---|---|
| 0-3 | Splash estático y animado, ingreso rápido, cierre de sesión | 1 |
| 3-8 | Altas: empleado con lectura de DNI, plato, bebida, mesa con QR automático | 1, 2, 3, 4 |
| 8-13 | Registro de cliente, push al dueño, rechazo con correo, aprobación con correo | 1, 2 |
| 13-17 | Cliente anónimo, QR de ingreso, lista de espera, asignación de mesa | 3, 4 |
| 17-23 | Menú, consulta al mozo, pedido, rechazo, modificación, confirmación | 2, 4 |
| 23-27 | Cocina y bar, pedido completo, entrega, juegos | 1, 3, 4 |
| 27-30 | Encuesta, gráficos, cuenta con QR de propina, pago, liberación de mesa | 2, 4 |

**Recomendación:** tener un segundo juego de datos ya cargado para poder retomar la demo si algo falla, en lugar de perder minutos recreando estados desde cero.

### 9.4. Distribución del APK

Los cuatro dispositivos deben tener **la misma versión** en cada revisión. Flujo propuesto:

```bash
ionic build --prod
npx cap sync android
cd android && ./gradlew assembleRelease
```

El APK firmado se sube a una release de GitHub con el número de versión, y los cuatro lo instalan desde ahí. Versionar como `sX.Y` donde X es el número de semana. En cada revisión, el líder confirma en voz alta la versión instalada antes de empezar.

---

## 10. DIVISIÓN DEL TRABAJO

Reparto por **áreas coherentes**, no por puntos sueltos: así cada uno se hace dueño de una parte del dominio y se minimizan los conflictos de merge.

### `[LIDER]` / `[INTEGRANTE_A]` — Plataforma e identidad

**Puntos:** 1, 6, 7, 8

**Además:** proyecto Supabase, migraciones, RLS, `seed.sql`, proyecto Firebase, Edge Functions (`enviar-push` y `enviar-correo`), plantillas de correo, autenticación, guardias de ruta, theme y paleta, componentes transversales (`app-cargando`, `app-errores-campo`, `ServicioErrores`), splash, sonidos, build y distribución del APK, README.

*Es la carga más pesada de la semana 1 y la más liviana de la 6-7, lo que compensa la tarea permanente de mantener el README y los builds.*

### `[INTEGRANTE_B]` — Catálogo, mesas y cobro

**Puntos:** 2, 3, 4, 11 (menú), 21, 22

**Además:** servicio de imágenes con compresión, componente de carrusel, generación y exportación de todos los QR, gestión de mesas, cálculo y presentación de la cuenta con estética Mercado Pago.

### `[INTEGRANTE_C]` — Clientes, acceso y análisis

**Puntos:** 5, 9, 10, 15, 20

**Además:** registro de clientes y flujo de aprobación del lado del cliente, ingreso anónimo, lista de espera con Realtime, asignación de mesa y reglas de exclusividad, los tres juegos, encuesta con controles variados, los tres gráficos en pantallas separadas, script de las 4 semanas de datos simulados.

### `[INTEGRANTE_D]` — Ciclo del pedido

**Puntos:** 11 (consulta al mozo y chat), 12, 13, 14, 16, 17, 18, 19

**Además:** máquina de estados del pedido, sala de conversación, listados de cocina y bar, lógica de pedido completo, pantalla de estado del pedido para el cliente.

### 10.1. Dependencias entre integrantes

```
Semana 1:  A entrega esquema + theme + componentes  →  desbloquea a B, C y D
Semana 2:  B entrega servicio de imágenes           →  lo usan A (punto 1) y C (punto 5)
           B entrega escáner y generación de QR     →  los usan C (9, 10) y B (21)
Semana 3:  A entrega Edge Function de push          →  la usan C (9, 10) y D (12-18)
Semana 4:  C entrega sesiones de mesa               →  las usa D (todos sus puntos)
Semana 5:  D entrega pedidos confirmados            →  los usa B (cuenta, punto 21)
           C entrega partidas de juego              →  las usa B (descuento en la cuenta)
```

**Regla:** el que produce una dependencia la entrega **al inicio** de la semana en que otro la necesita, no al final. Si algo se va a demorar, se avisa el lunes, no el viernes.

---

## 11. CONVENCIONES DE TRABAJO

### 11.1. Git

```
main       → solo versiones presentadas en revisiones. Protegida.
develop    → integración. Todos mergean acá.
feat/pXX-descripcion-corta   → una rama por punto funcional
fix/descripcion              → correcciones
```

Ejemplos: `feat/p04-alta-mesa`, `feat/p12-pedido-cliente`, `fix/p06-foto-cortada`

**Reglas:**

- Nada se commitea directo a `main` ni a `develop`. Todo pasa por Pull Request.
- Cada PR lo revisa al menos otro integrante.
- Antes de cada revisión semanal, `develop` se mergea a `main` y se tagea con la versión del APK.
- Mensajes de commit en español, en imperativo: `agrega validacion de CUIL en alta de empleado`.
- **Nunca** commitear `google-services.json` con credenciales de servicio, ni la `service_role` key de Supabase, ni la API key de Resend. Todo eso va en secretos de Edge Functions y en `.env` ignorado.

### 11.2. Sincronización del equipo

- **Lunes:** repartir tareas de la semana y confirmar dependencias.
- **Jueves:** integrar todo en `develop` y compilar APK de prueba.
- **Antes de la revisión:** recorrer la lista de 6.7 entre todos, con los cuatro dispositivos en mano.

### 11.3. Formato del README exigido por la cátedra

```markdown
# [NOMBRE_GRUPO] — Trabajo Final Integrador 2026
Aplicación de gestión de restaurante · [NOMBRE_APP]
Tecnicatura Universitaria en Programación — UTN Avellaneda

## Integrantes y responsabilidades

| Apellidos y nombres | Módulos (objetivos) a desarrollar | Fecha de inicio | Fecha de finalización | Branch |
|---|---|---|---|---|
| Apellido, Nombre | Punto 1 - Alta de empleado | 07/09/2026 | 11/09/2026 | feat/p01-alta-empleado |
| Apellido, Nombre | Punto 2 - Alta de plato | 07/09/2026 | 12/09/2026 | feat/p02-alta-plato |
| … | … | … | … | … |

### Reasignaciones y cambios de plazo
> La cátedra exige que, si alguien no llega con su funcionalidad
> comprometida, se cambie el plazo o se reasigne el módulo, y quede
> informado acá.

| Fecha | Módulo | De | A | Motivo |
|---|---|---|---|---|

## Índice de imágenes
> TODAS Y CADA UNA de las imágenes del proyecto.

### Ícono e identidad
- [Ícono de la aplicación](docs/imagenes/icono.png)
- [Logo](docs/imagenes/logo.png)

### Pantallas de presentación
- [Splash estático](docs/imagenes/splash-estatico.png)
- [Splash animado](docs/imagenes/splash-animado.png)

### Códigos QR
- [QR de ingreso al local](docs/qr/ingreso.png)
- [QR mesa 1](docs/qr/mesa-01.png) … [QR mesa 5](docs/qr/mesa-05.png)
- [QR propina Excelente 20%](docs/qr/propina-excelente.png) … (los 5)

### Formularios
- [Alta de empleado](docs/imagenes/alta-empleado.png)
- …

### Listados
- [Clientes pendientes](docs/imagenes/clientes-pendientes.png)
- …

### Gráficos
- [Gráfico de torta](docs/imagenes/grafico-torta.png)
- …

## Stack técnico
Angular · Ionic · Capacitor · Supabase (PostgreSQL) · Firebase Cloud Messaging · Resend

## Documentación
Ver [CONTEXTO-PROYECTO.md](CONTEXTO-PROYECTO.md)
```

**El índice de imágenes es responsabilidad del líder y se evalúa.** Conviene sacar la captura en el momento en que se termina cada pantalla, no dejarlas todas para la última semana.

---

## 12. RIESGOS Y DECISIONES ABIERTAS

### 12.1. Riesgos identificados

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | **Push con la app cerrada no funciona** | Excluyente. Sin esto no se promociona | Probarlo en la semana 3, no en la 7. Es el riesgo técnico principal |
| R2 | **El proyecto de Supabase se pausa** a los 7 días de baja actividad | Perder minutos de la revisión | Cron externo cada 2-3 días. Como mínimo, despertarla la noche anterior |
| R3 | **No hay 4 Android disponibles** el día de la revisión | No se puede demostrar | Confirmarlo en la semana 0. Tener un dispositivo de respaldo |
| R4 | **Storage de 1 GB agotado** por fotos sin comprimir | Suben a plan pago o se rompen las altas | Compresión obligatoria en `ServicioImagenes`. Prohibido subir sin pasar por ahí |
| R5 | **El sonido de cierre no suena** porque Android mata el proceso | Requisito excluyente incumplido | Audio de menos de 400 ms disparado en `pause`. Probar en varios modelos |
| R6 | **Las 4 semanas de datos simulados quedan para el final** y los gráficos salen vacíos | Punto 20 no se aprueba | Está planificado en la semana 6, pero el script conviene escribirlo antes |
| R7 | **El modo oscuro de Ionic reaparece** tras actualizar dependencias | Requisito excluyente incumplido | Verificar en la lista de 6.7 antes de cada revisión, cambiando el tema del celular |
| R8 | **El correo cae en spam** por dominio no verificado | Se ve como que no funciona | Configurar SPF y DKIM al verificar el dominio en Resend, en la semana 3 |
| R9 | **Desacople del esquema** por cambios desde el panel web de Supabase | Builds roto para el resto del equipo | Solo migraciones. Nadie toca el panel |
| R10 | **Un integrante no llega** con su módulo | Se cae la fecha | Los lunes se confirma avance. La cátedra exige documentar reasignaciones en el README |

### 12.2. Decisiones abiertas

| # | Pregunta | Quién decide | Estado |
|---|---|---|---|
| D1 | ¿La cátedra acepta leer el PDF417 real del DNI, o espera un QR propio que lo simule? | Cátedra | ⬜ Preguntar en la primera revisión |
| D2 | ¿La propina se calcula sobre el subtotal o sobre el subtotal ya con descuento? | Cátedra / equipo | ⬜ La función `calcular_cuenta` hoy asume **sobre el subtotal con descuento aplicado** |
| D3 | ¿Cuáles son los tres juegos? | Equipo | ⬜ Definir en la semana 1. Sugerencia: memoria de pares, adivinar el número, piedra-papel-tijera |
| D4 | ¿La sala de conversación es una por mesa o una global entre todos los mozos y todos los clientes? | Cátedra | ⬜ El esquema hoy asume **una por sesión de mesa, visible para todos los mozos** |
| D5 | ¿Se compra dominio propio para el correo o se usa remitente verificado en Brevo? | Equipo | ⬜ Semana 0 |
| D6 | ¿Cómo se comparte el proyecto de Supabase entre los 4? | Equipo | ⬜ Invitar a los 4 a la organización, o entorno local con `supabase start` |
| D7 | ¿Los clientes anónimos pueden responder la encuesta? | Cátedra | ⬜ El esquema hoy lo **permite**; solo los juegos están restringidos a registrados |

**Cuando se resuelva cualquiera de estas, actualizar este documento en el mismo commit.**

---

## 13. GLOSARIO

| Término | Significado en este proyecto |
|---|---|
| **Estadía** | La ocupación de una mesa por un cliente, de punta a punta. En la base es `sesiones_mesa`. Los pedidos, la encuesta, el chat y la cuenta cuelgan de una estadía |
| **Sector** | Cocina o bar. Determina qué empleado prepara cada ítem del pedido |
| **Staff** | Personal del comercio: dueño, supervisor, metre, mozo, cocinero, cantinero |
| **Gerencia** | Dueño y supervisor. Los únicos que aprueban clientes y gestionan mesas |
| **Punto funcional** | Cada uno de los 22 requisitos numerados del enunciado. Se aprueban de a uno en las revisiones semanales |
| **Requisito excluyente** | Requisito de la página 3 del enunciado. Incumplirlo impide promocionar aunque los puntos funcionales estén completos |
| **Revisión preliminar** | Instancia semanal donde la cátedra aprueba puntos. Requiere presencia de los cuatro integrantes |
| **Promoción** | Aprobar la materia sin final. Requiere los puntos 1 a 22 aprobados en la primera fecha |
| **RLS** | Row Level Security. Las reglas de Postgres que definen qué filas ve y modifica cada perfil |
| **Realtime** | Los websockets de Supabase que actualizan la pantalla mientras la app está abierta |
| **Push** | Notificación de FCM que llega **aunque la app esté cerrada**. No es lo mismo que Realtime, y el TP exige las dos cosas |
| **Edge Function** | Función serverless en Deno alojada en Supabase. Se usa para enviar push y correos |

---

## APÉNDICE — RESUMEN PARA PEGAR EN UN CHAT NUEVO

> Si necesitás darle contexto rápido a una IA sin pegar el documento completo, usá este bloque. Para generar código, pegá siempre el documento entero.

Proyecto: aplicación móvil de gestión de restaurante. Trabajo Final Integrador de la Tecnicatura Universitaria en Programación, UTN Avellaneda, 2026. Equipo de 4 personas. Entrega el 17/10/2026, alcance puntos 1 a 22 del enunciado, buscando promoción.

Stack: Angular + Ionic + Capacitor en el cliente. Supabase (PostgreSQL con RLS, Auth, Storage, Realtime, Edge Functions) como backend. Firebase Cloud Messaging solo para push notifications. Resend para correos transaccionales. Chart.js para los gráficos.

Ocho perfiles: dueño, supervisor, metre, mozo, cocinero, cantinero, cliente registrado y cliente anónimo. El cliente registrado requiere aprobación de dueño o supervisor y recibe correo automático; el anónimo no requiere aprobación y no accede a los juegos.

Flujo central: el cliente escanea el QR de ingreso, se anota en la lista de espera, el metre le asigna mesa, escanea el QR de esa mesa, ve el menú, arma el pedido, el mozo lo confirma o rechaza, se deriva a cocina y bar, los sectores avisan cuando está completo, el mozo entrega, el cliente responde la encuesta y juega por descuentos, pide la cuenta, escanea un QR de propina de 0 a 20 %, paga simulado, el mozo confirma y se libera la mesa.

Restricciones no negociables de la cátedra: todo el texto en español con tildes; prohibido el modo oscuro y los fondos blancos o negros; ningún espacio vacío en pantalla; nada cortado ni descentrado; sin abreviaturas; prohibido `alert()`; vibración en todos los errores; spinner con logo en todas las esperas; sonidos distintos al abrir y cerrar; validación de todos los campos de todos los formularios; push con la app abierta y cerrada; correos automáticos desde cuenta empresarial; lectura y generación de códigos QR; tres juegos funcionales; encuestas con controles variados; gráficos estadísticos con un gráfico por pantalla.

Se demuestra con cuatro dispositivos físicos operando en simultáneo, con la misma versión de la app instalada.

---

*Documento mantenido por `[LIDER]`. Última actualización: 25/08/2026.*
