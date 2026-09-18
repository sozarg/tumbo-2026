# Auditoría de cumplimiento — Tumbito

## A. Alcance y resumen ejecutivo

**Fecha:** 18/09/2026, America/Montevideo. **Dictamen:** hay implementación parcial, incumplimientos funcionales y de autorización comprobados, y verificaciones pendientes. **No puede declararse listo el recorrido obligatorio 01–22.** Una compilación correcta y tests verdes no demuestran aceptación del sistema.

Repositorio: [sozarg/tumbo-2026](https://github.com/sozarg/tumbo-2026), carpeta local TUMBO 2026. Rama **terrile**, commit **ef8f6c0cd98cec3f26d88b84857a0d9315371a85**. Al inicio, git status --short no mostraba cambios. Se leyeron AGENTS.md y las instrucciones del proyecto, y se buscaron instrucciones en los directorios ascendentes: no se encontraron otras. No hay AGENTS.md anidados en los archivos inspeccionados. Se consultaron las skills Angular, Ionic, Supabase y Supabase Postgres Best Practices.

### Qué se inspeccionó y qué no

- Una aplicación Angular **22.1.4**, Ionic **9.0.1**, Capacitor **8.5.0**, Supabase JS **2.112.4**, TypeScript **6.0.3**, Vitest **4.1.11** instalados. Frontend en src/app; backend equivalente en SQL y dos Edge Functions: crear-empleado y eliminar-empleado. No se presupone un backend adicional.
- Rutas lazy, autenticación mock/real, operación, formularios, validadores, cámara/lector, generador QR, modelos, estilos, 10 migraciones, seed y documentación. El modelo SQL define 19 tablas públicas; hay tablas de push/correos, pero **una tabla no equivale a un servicio de envío**.
- README.md, CONTEXTO-PROYECTO.md, supabase/README.md y docs/Trabajo-practico-2026-TFI.md. La transcripción del TFI sí contiene un listado excluyente en su sección 3; no se encontró el PDF original referenciado. Las tres imágenes UI-L/UI-D/UI-C no fueron adjuntadas: se usaron sus descripciones del prompt, no las capturas históricas del proyecto como prueba de estado actual.
- Configuración versionada: environment.ts contiene URL y clave pública vacías, por lo que la copia probada usa **demo**. No se publicó ninguna clave, contraseña, DNI, CUIL, foto ni correo personal. No se usaron cuentas reales para mutaciones, no se enviaron correos/push y no se desplegó nada.
- **Base remota NO inspeccionada.** Proyecto solicitado: weeemajondwqstaoldtu. Aunque el login de Codex había concluido, en esta auditoría los dos intentos de conexión a MCP devolvieron: “MCP startup failed: failed to refresh OAuth tokens for server supabase”. No se pudieron enumerar tablas remotas, migraciones aplicadas, funciones desplegadas, buckets, políticas vigentes, publicaciones Realtime, configuración Auth o proveedor de correo. No se atribuyen a producción los resultados de la réplica local.
- **Base temporal:** PGlite/PostgreSQL embebido en memoria, con migraciones del commit. Se omitió únicamente CREATE EXTENSION pgcrypto —no usada por las pruebas— y se simularon auth.users, auth.uid(), roles anon/authenticated y tablas mínimas de Storage. Se concedieron permisos de tabla a authenticated para evaluar RLS. Esta hipótesis de grants se explicita: el resultado acredita las políticas del esquema local bajo esos grants, no los grants del servidor real. No se simuló GoTrue, Storage binario, Edge ni Realtime.
- Navegador Chrome headless con Playwright, recursos externos bloqueados, app servida en **127.0.0.1:4318**, imágenes y fuentes locales. Viewports: **320×568, 360×640, 390×844 y 768×1024 CSS px**. Se recorrieron 22 estados por tamaño (88 capturas/mediciones), más recorridos de roles y cuenta. Revisión visual directa de muestras; geometría automatizada en el resto. La reducción a 390×480 aproxima el espacio disponible con teclado, **no demuestra comportamiento del teclado nativo**.
- Cuatro contextos de navegador independientes para D1–D4: dueño; cliente registrado→anónimo; cantinero→cocinero; metre. Los cambios incluyen cierre de sesión y nuevo ingreso. No son cuatro dispositivos físicos, y los mocks de estos contextos no comparten datos. La identificación D1–D4 del guion obligatorio se conserva en F aunque la exploración adicional haya cambiado roles en otro orden.

### Hallazgos principales

1. **P0 — Pedido real no completado:** el adaptador inserta pedido pendiente_confirmacion antes de sus ítems; la política admite ítems del cliente únicamente en borrador/rechazado. SQL01 devuelve 42501; puede quedar una cabecera vacía.
2. **P0 — Autorización y dinero:** el esquema local permite autoasignación sin metre, encuesta en estadía ajena, precio 0,01 para un producto de 100, premio 99 % en una derrota posterior, confirmación de cuenta por el cliente y confirmación de pedido por cocinero. Son pruebas locales, no ataques al proyecto remoto.
3. **P0 — Recepción desalineada:** recibido_en aparece en modelos/servicio, pero no en las migraciones; SQL08 da 42703. Aun añadiéndola, pedidos_actualizar no habilita al cliente a actualizar un pedido entregado. actualizar() no comprueba cuántas filas afectó.
4. **P0/P1 — Flujos incompletos:** alta real de cliente y anónimo ausentes; juegos son simuladores de victoria/derrota; opiniones no se guardan y gráficos son estáticos; no hay pipeline de push ni de correo en el alcance local.
5. **P1 — Fotos y experiencia:** alta de productos exige solo una foto; a 320 px se corta personal y no está visible todo el resumen del carrito. La cuenta presenta bien el total, pero la acción queda fuera del área inicial en teléfono angosto.
6. **P0 — Sesiones:** en la misma SPA, un cliente anónimo hereda el carrito de un registrado tras logout/login; los signals operativos no se limpian. No confundir con persistencia del token Auth, que se evalúa aparte.

### Métricas y reglas de recuento

Cada ID es un criterio del alcance conocido; CUMPLE acredita **solo el requisito exacto de esa fila**. Por ejemplo, un número visible no acredita persistencia ni push. El campo “Ejecución” distingue pruebas de comportamiento (incluidas las temporales/mock/SQL) de inspección estática. Un test mock contribuye a cobertura de ejecución, pero no promueve automáticamente un criterio a CUMPLE real.

Se identificaron 293 filas funcionales/de control: 5 son referencias sin segundo recuento y 20.15 documenta el anexo, sin sumarse a cumplimiento funcional. **Denominador funcional: 287 criterios únicos.** Los no verificables permanecen en él. No es un porcentaje de toda la consigna ampliada: excluye entregas 23–31 y requisitos transversales del anexo no descompuestos fuera del encargo 01–22/UI. Tampoco pondera severidad; un único P0 impide el recorrido.

| Estado | Criterios funcionales únicos |
| --- | --- |
| CUMPLE | 29 |
| IMPLEMENTADO SIN VERIFICAR | 104 |
| PARCIAL | 37 |
| NO CUMPLE | 64 |
| NO IMPLEMENTADO | 46 |
| NO VERIFICABLE | 7 |

- **Cumplimiento funcional verificado:** 29 / 287 = 10,1 %.
- **Cobertura funcional de ejecución:** 118 / 287 = 41,1 %. Alcance de cada ejecución en E; el resto tiene inspección de código o bloqueo documentado.
- Los criterios visuales se cuentan separadamente en D. Las recomendaciones adicionales de G no entran en ningún denominador obligatorio.

### Navegación y evidencias

[B. Matriz de 22 puntos](#b-matriz-general) · [C. Detalle](#c-matrices-detalladas) · [D. Visual](#d-auditoría-visual) · [E. Registros](#e-registros-transversales) · [F. Recorrido](#f-recorrido-de-punta-a-punta) · [G. Propuestas](#g-correcciones-propuestas-y-bloqueos).

Las abreviaturas siguientes se usan como **archivo:línea**; los rangos indican bloques revisados, no resultados inferidos de comentarios. Los símbolos mencionados permiten localizarlos aunque cambien las líneas. Todas corresponden al commit indicado.

| Alias | Archivo |
| --- | --- |
| OPS | [src/app/core/services/operacion.service.ts](../src/app/core/services/operacion.service.ts) |
| CMP | [src/app/features/operacion/operacion.component.ts](../src/app/features/operacion/operacion.component.ts) |
| TPL | [src/app/features/operacion/operacion.component.html](../src/app/features/operacion/operacion.component.html) |
| CSS | [src/app/features/operacion/operacion.component.scss](../src/app/features/operacion/operacion.component.scss) |
| NAV | [src/app/core/navegacion/secciones.ts](../src/app/core/navegacion/secciones.ts) |
| MOCK | [src/app/core/services/demo-restaurante.service.ts](../src/app/core/services/demo-restaurante.service.ts) |
| AUTH | [src/app/core/services/autenticacion-supabase.service.ts](../src/app/core/services/autenticacion-supabase.service.ts) |
| CAM | [src/app/core/dispositivo/camara.service.ts](../src/app/core/dispositivo/camara.service.ts) |
| DNI | [src/app/core/dispositivo/lector-de-dni.service.ts](../src/app/core/dispositivo/lector-de-dni.service.ts) |
| PARSER | [src/app/core/dni/codigo-de-dni.ts](../src/app/core/dni/codigo-de-dni.ts) |
| QR | [src/app/core/services/codigo-qr.service.ts](../src/app/core/services/codigo-qr.service.ts) |
| VAL | [src/app/core/validacion/validadores.ts](../src/app/core/validacion/validadores.ts) |
| ROUTES | [src/app/app.routes.ts](../src/app/app.routes.ts) |
| TYPES | [src/app/core/models/base-de-datos.ts](../src/app/core/models/base-de-datos.ts) |
| EDGE | [supabase/functions/crear-empleado/index.ts](../supabase/functions/crear-empleado/index.ts) |
| ENUM | [supabase/migrations/20260901000000_tipos_y_enums.sql](../supabase/migrations/20260901000000_tipos_y_enums.sql) |
| BASE | [supabase/migrations/20260901000100_tablas_base.sql](../supabase/migrations/20260901000100_tablas_base.sql) |
| OPER | [supabase/migrations/20260901000200_tablas_operacion.sql](../supabase/migrations/20260901000200_tablas_operacion.sql) |
| FUN | [supabase/migrations/20260901000300_funciones.sql](../supabase/migrations/20260901000300_funciones.sql) |
| RLS | [supabase/migrations/20260901000400_politicas_rls.sql](../supabase/migrations/20260901000400_politicas_rls.sql) |
| STORAGE | [supabase/migrations/20260901000500_storage.sql](../supabase/migrations/20260901000500_storage.sql) |
| LEN | [supabase/migrations/20260901000600_limites_de_longitud.sql](../supabase/migrations/20260901000600_limites_de_longitud.sql) |
| LEN7 | [supabase/migrations/20260901000700_correo_mas_corto.sql](../supabase/migrations/20260901000700_correo_mas_corto.sql) |
| PROTECT | [supabase/migrations/20260901000800_proteger_columnas_de_autorizacion.sql](../supabase/migrations/20260901000800_proteger_columnas_de_autorizacion.sql) |


U01 = suite original; AUD01–AUD12 = caracterizaciones temporales detalladas en E; SQL01–SQL13 = réplica local, sección E; V01 = matriz visual de cuatro tamaños; V02 = cuatro contextos y recorrido de cuenta; COM C01 = búsqueda de comunicaciones en E. Las evidencias y resultados relevantes están incorporados aquí, sin depender de archivos temporales.

## B. Matriz general

| Punto | Flujo y perfiles | Dictamen | Criterios cumplidos / total | Qué está hecho y principal faltante o bloqueo |
| --- | --- | --- | --- | --- |
| 01 | Alta de empleado · D1, dueño y supervisor | NO CUMPLE | 1 / 20 | Alta real conectada a crear-empleado, con validación extensa; cámara física y persistencia no verificadas, DNI propone datos no presentes. (01.01–01.20) |
| 02 | Alta de plato · D2, cocinero | NO CUMPLE | 0 / 15 | Formulario y persistencia compartidos, con tipo por rol; solo una foto y sin verificación del alta remota de plato. (02.01–02.15) |
| 03 | Alta de bebida · D3, cantinero | NO CUMPLE | 0 / 15 | Formulario y persistencia compartidos, con tipo por rol; solo una foto y sin verificación del alta remota de bebida. (03.01–03.15) |
| 04 | Alta y gestión de mesa · D4, dueño y supervisor | NO CUMPLE | 1 / 14 | QR dinámico y alta conectados; disponibilidad se cambia sin comprobar estadía activa y asignación no es atómica. (04.01–04.14) |
| 05 | Alta de cliente registrado · D2, cliente o metre | NO CUMPLE | 0 / 17 | El alta solo agrega un cliente a memoria; faltan contraseña, foto y vía pública, y no hay correo de resolución. (05.01–05.17) |
| 06 | Clientes pendientes · D1, dueño y supervisor | NO CUMPLE | 1 / 10 | Listado, foto y controles presentes; falta actualización tras cambios y no hay push implementada. (06.01–06.10) |
| 07 | Rechazo de cliente · D1 gerencia, D2 cliente | NO CUMPLE | 0 / 14 | Cambio de estado conectado; no existen plantillas ni envío de correo de resolución en el código inspeccionado. (07.01–07.14) |
| 08 | Aceptación de cliente · D1 gerencia, D2 cliente | PARCIAL | 0 / 14 | Cambio de estado conectado; no existen plantillas ni envío de correo de resolución en el código inspeccionado. (08.01–08.14) |
| 09 | Anónimo y espera · D3 cliente, D4 metre | NO CUMPLE | 0 / 11 | Entrada y espera son demostrativas; no hay alta anónima ni lectura del QR de ingreso; la BD permite autoasignarse mesa. (09.01–09.11) |
| 10 | Asignación y QR de mesa · D4 metre, D2 registrado, D3 segundo cliente | NO CUMPLE | 0 / 9 | Índices evitan dos estadías activas; el flujo consta de escrituras parciales, falla al actualizar mesa como metre y no lee QR. (10.01–10.09) |
| 11 | Carta y consulta · cliente asignado, todos los mozos | NO CUMPLE | 5 / 20 | Carta paginada y chat presentes; falta escaneo habilitante, nombre real del remitente y push; solo se selecciona una estadía. (11.01–11.20) |
| 12 | Realización del pedido · cliente | NO CUMPLE | 3 / 10 | Carrito y total funcionan en demo; el envío real crea pendiente antes de insertar ítems, que RLS rechaza. (12.01–12.10) |
| 13 | Rechazo y modificación · D4 mozo, cliente | NO CUMPLE | 0 / 11 | Rechazo conectado, pero carrito no recupera ítems; reenvío crea nuevo pedido y no corrige el problema de RLS. (13.01–13.11) |
| 14 | Confirmación, sectores y acceso a juegos · D4 mozo | NO CUMPLE | 0 / 10 | Confirmación cambia estado; derivación se basa en sector, pero los juegos no están implementados como juegos. (14.01–14.14) |
| 15 | Juegos y beneficio · cliente registrado | NO CUMPLE | 0 / 12 | Reglas parciales de demo y un índice único; falta juego real, persistencia de estado UI y validación de premio en servidor. (15.01–15.12) |
| 16 | Recepción en cocina · D1, cocinero | NO CUMPLE | 5 / 10 | Panel filtrado de cocina funciona en muestra demo; el servicio carga solo la primera estadía y su último pedido. (16.01–16.10) |
| 17 | Recepción en bar · D3, cantinero | NO CUMPLE | 5 / 10 | Panel filtrado de bar funciona en muestra demo; el servicio carga solo la primera estadía y su último pedido. (17.01–17.10) |
| 18 | Finalización por sectores | NO CUMPLE | 0 / 10 | El cálculo de todos los sectores pasa en demo; hay avisos locales duplicados al repetir y no existe push real. (18.01–18.10) |
| 19 | Entrega y recepción · mozo y cliente | NO CUMPLE | 1 / 8 | UI de recepción tiene protección contra doble clic; esquema versionado carece de recibido_en y RLS bloquea update de entregado. (19.01–19.08) |
| 20 | Encuesta y resultados | NO CUMPLE | 2 / 15 | Formulario con controles variados, pero las respuestas no se envían; los tres gráficos son estáticos. (20.01–20.16) |
| 21 | Cuenta, propina y pago simulado | NO CUMPLE | 5 / 20 | Presentación y cálculo demo existen; falta lectura QR y push, y el backend confía en importes/estados enviados por cliente. (21.01–21.21) |
| 22 | Confirmación de pago y liberación · mozo, dueño y supervisor | NO CUMPLE | 0 / 12 | Trigger cierra estadía y libera mesa; cualquier cliente propietario puede invocarlo al editar cuenta. Falta limpieza de estado UI y push. (22.01–22.12) |


## C. Matrices detalladas

No se implementó ninguna propuesta. “Ejecutada” en una fila remite al alcance local/mock que aparece en su evidencia. “Inspección” nunca significa prueba de recepción remota.

### 01. Alta de empleado · D1, dueño y supervisor

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 01.01 | Acceso del dueño al alta | CUMPLE | NAV:88, UI Personal, V01 — Prueba ejecutada, alcance E | Sin corrección necesaria en acceso de interfaz; autorización servidor se evalúa por separado. | P2 |
| 01.02 | Acceso del supervisor al alta | IMPLEMENTADO SIN VERIFICAR | NAV:25 y 28; EDGE:205 — Inspección; ejecución específica pendiente | Ruta y autorización previstas; ejecutar alta con supervisor en entorno seguro. | P1 |
| 01.03 | Denegación de altas a otros perfiles | IMPLEMENTADO SIN VERIFICAR | EDGE:192–218, NAV:128 — Inspección; ejecución específica pendiente | getUser y perfil/estado se verifican; probar peticiones con cliente, mozo y pendiente. | P0 |
| 01.04 | Persistencia de nombres, apellidos, DNI, CUIL, correo y perfil cocinero | IMPLEMENTADO SIN VERIFICAR | OPS:274–306; EDGE:274–326 — Inspección; ejecución específica pendiente | Alta Auth y perfil conectados; verificar filas y acceso posterior sin publicar datos personales. | P1 |
| 01.05 | Contraseña almacenada por Auth y utilizable para ingreso | IMPLEMENTADO SIN VERIFICAR | EDGE:281, AUTH:123 — Inspección; ejecución específica pendiente | Se usa admin.createUser; probar alta/login en proyecto de prueba. | P1 |
| 01.06 | Foto tomada exclusivamente por cámara nativa | IMPLEMENTADO SIN VERIFICAR | CAM:69–113, CMP:1447 — Inspección; ejecución específica pendiente | CameraSource.Camera; navegador usa archivo simulado. Requiere APK y permiso de cámara. | P1 |
| 01.07 | Foto personal subida y asociada persistentemente | IMPLEMENTADO SIN VERIFICAR | OPS:317–345 — Inspección; ejecución específica pendiente | Carga en fotos-usuarios y update foto_url separados; simular fallo de subida y recuperar foto faltante. | P1 |
| 01.08 | Lectura real de PDF417/QR de DNI | IMPLEMENTADO SIN VERIFICAR | DNI:44–83; PARSER:90; U01 — Prueba ejecutada, alcance E | Parser probado con cadenas; no hubo documento ni cámara física. Probar ambas variantes reales autorizadas. | P1 |
| 01.09 | Autocompletar únicamente datos presentes en el documento | NO CUMPLE | CMP:1347 y 1427; PARSER:113 — Inspección; ejecución específica pendiente | Se propone correo @tumbo.demo y se calcula CUIL ausente; dejar esos campos vacíos o pedir confirmación separada, sin presentarlos como leídos. | P1 |
| 01.10 | Cancelar/denegar cámara y recuperar el flujo | IMPLEMENTADO SIN VERIFICAR | CAM:91–149; CMP:1447 — Inspección; ejecución específica pendiente | Ramas diferenciadas localizadas; probar permiso denegado, cancelación y nuevo intento en Android. | P1 |
| 01.11 | Datos visibles de foto centrada y sin recortes | NO VERIFICABLE | UI alta Personal; CAM — Inspección; ejecución específica pendiente | Se inspeccionó el contenedor vacío; falta una foto autorizada y comparación de proporciones en dispositivo. | P2 |
| 01.12 | Mensajes fieles ante error de alta y carga parcial | IMPLEMENTADO SIN VERIFICAR | CMP:763–813; OPS:301 — Inspección; ejecución específica pendiente | Se devuelve aviso si cuenta existe sin foto; ejecutar errores de Auth/Storage y comprobar que no se anuncie éxito completo. | P1 |
| 01.13 | Validaciones de nombres | IMPLEMENTADO SIN VERIFICAR | CMP:349; VAL; EDGE:275; BASE:12; LEN:29; U01 — Prueba ejecutada, alcance E | Ver registro V-01-nombres: frontend probado; validar la misma entrada en endpoint real. | P1 |
| 01.14 | Validaciones de apellidos | IMPLEMENTADO SIN VERIFICAR | CMP:350; VAL; LEN:36; U01 — Prueba ejecutada, alcance E | Ver V-01-apellidos; confirmar errores servidor y nombres compuestos. | P1 |
| 01.15 | Validaciones de DNI | IMPLEMENTADO SIN VERIFICAR | CMP:351; OPS:67; BASE:38; U01 — Prueba ejecutada, alcance E | Ver V-01-dni; frontend normaliza separadores, falta petición real con tipos incorrectos. | P1 |
| 01.16 | Validaciones de CUIL | PARCIAL | CMP:352,370; BASE:39; U01 — Prueba ejecutada, alcance E | Frontend controla dígito y coincidencia DNI; CHECK servidor solo formato. Reforzar dígito y vínculo con DNI en capa confiable. | P1 |
| 01.17 | Validaciones de correo | IMPLEMENTADO SIN VERIFICAR | CMP:353; EDGE:233–271; BASE:35; LEN7:24; U01 — Prueba ejecutada, alcance E | Ver V-01-correo; probar error exacto y duplicado en alta real. | P1 |
| 01.18 | Validaciones de contraseña y repetición | IMPLEMENTADO SIN VERIFICAR | CMP:354–370; EDGE:234; U01 — Prueba ejecutada, alcance E | 6–72 y coincidencia en UI; Auth configura política separada. Verificar límites, espacios y tipos en endpoint. | P1 |
| 01.19 | Validación del perfil cocinero y enumeración | IMPLEMENTADO SIN VERIFICAR | CMP:356; EDGE:225–231 — Inspección; ejecución específica pendiente | Enum validado en Edge; ejecutar valor fuera de lista y perfil no autorizado. | P1 |
| 01.20 | Validación de foto requerida y archivo válido | PARCIAL | CMP:366; VAL:234; CAM:177; OPS:746 — Inspección; ejecución específica pendiente | Foto omitible en demo, truthiness en UI y nullable en BD. Exigir foto completa y validar contenido/MIME/tamaño confiablemente. | P1 |

### 02. Alta de plato · D2, cocinero

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 02.01 | Acceso del perfil cocinero | IMPLEMENTADO SIN VERIFICAR | NAV:30–38, CMP:556; RLS:69 — Inspección; ejecución específica pendiente | Existe acceso y tipo derivado; probar alta completa con cocinero, sin sustituirla por otro rol. | P1 |
| 02.02 | Denegación de alta a perfil no autorizado | IMPLEMENTADO SIN VERIFICAR | RLS:69–75 — Inspección; ejecución específica pendiente | Política distingue tipo; ejecutar insert directo fuera de sector y verificar rechazo remoto. | P0 |
| 02.03 | Persistencia de plato y aparición en carta | IMPLEMENTADO SIN VERIFICAR | OPS:436–496,202; U01 OperacionService — Prueba ejecutada, alcance E | Inserción y recarga conectadas; pruebas existentes usan mock. Crear plato con tres fotos y leer desde otra sesión. | P1 |
| 02.04 | Uso de cámara para imágenes | IMPLEMENTADO SIN VERIFICAR | CAM:85,110; CMP:974 — Inspección; ejecución específica pendiente | CameraSource.Prompt conectado; falta Android y foto autorizada. | P1 |
| 02.05 | Elección desde galería permitida | IMPLEMENTADO SIN VERIFICAR | CAM:85,161; CMP:974 — Inspección; ejecución específica pendiente | Selector nativo/web existe; probar galería, cancelación y archivo inválido por separado. | P1 |
| 02.06 | Exactamente tres fotos en alta | NO CUMPLE | CMP:408–412; TPL:455; AUD02 — Prueba ejecutada, alcance E | Solo posición 0; una foto vuelve válido el formulario. Exponer tres posiciones y conectar tresFotosRequeridas y validación confiable. | P1 |
| 02.07 | Imágenes individuales centradas y navegables | PARCIAL | CMP:414; TPL:1360; V01 — Prueba ejecutada, alcance E | Carta muestra una imagen a la vez; alta administra una sola. Ampliar alta sin fragmentos vecinos y verificar tres imágenes reales. | P1 |
| 02.08 | Reemplazo individual de las tres fotos | NO CUMPLE | CMP:412,974,1001; OPS:696 — Inspección; ejecución específica pendiente | Hay reemplazo de primera imagen, no controles para las otras dos. Incorporar selector de posición y probar persistencia. | P1 |
| 02.09 | Persistencia de las tres imágenes | IMPLEMENTADO SIN VERIFICAR | OPS:696–739; BASE:113 — Inspección; ejecución específica pendiente | Servicio admite array y upsert por orden; UI no lo completa. Verificar tres filas, objetos y recuperación parcial en entorno seguro. | P1 |
| 02.10 | Validación de nombre | IMPLEMENTADO SIN VERIFICAR | CMP:395; LEN:78; U01 — Prueba ejecutada, alcance E | 2–60 y no espacios en UI; CHECK con trim en BD. Probar casos del registro de validación en alta de plato. | P1 |
| 02.11 | Validación de descripción | IMPLEMENTADO SIN VERIFICAR | CMP:396; LEN:82 — Inspección; ejecución específica pendiente | 10–300 y no espacios; falta ejecutar límites y mensajes en ambos extremos. | P1 |
| 02.12 | Validación de minutos | IMPLEMENTADO SIN VERIFICAR | CMP:397–404; BASE:92 — Inspección; ejecución específica pendiente | Entero 1–600 en UI, BD entero >0. El máximo es política local, no consigna. Probar negativos, fracciones y tipos. | P1 |
| 02.13 | Validación de precio | IMPLEMENTADO SIN VERIFICAR | CMP:406; VAL:261; BASE:93 — Inspección; ejecución específica pendiente | UI mínimo 1 y dos decimales; BD >0 numeric(10,2). Alinear diferencias y probar límites/formatos. | P1 |
| 02.14 | Validación de tipo y coherencia de sector | IMPLEMENTADO SIN VERIFICAR | NAV:93; BASE:101; RLS:69 — Inspección; ejecución específica pendiente | La BD impone bebida/bar y plato/cocina. Probar manipulación y tipo fuera del enum. | P1 |
| 02.15 | Validación de fotos vacías, cantidad, formato y carga fallida | NO CUMPLE | CMP:409; VAL:284; CAM:177; AUD02 — Prueba ejecutada, alcance E | Validador de tres fotos existe pero no se usa. Exigir 3 y comprobar binario, extensión, cancelación y fallo de Storage. | P1 |

### 03. Alta de bebida · D3, cantinero

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 03.01 | Acceso del perfil cantinero | IMPLEMENTADO SIN VERIFICAR | NAV:30–38, CMP:556; RLS:69 — Inspección; ejecución específica pendiente | Existe acceso y tipo derivado; probar alta completa con cantinero, sin sustituirla por otro rol. | P1 |
| 03.02 | Denegación de alta a perfil no autorizado | IMPLEMENTADO SIN VERIFICAR | RLS:69–75 — Inspección; ejecución específica pendiente | Política distingue tipo; ejecutar insert directo fuera de sector y verificar rechazo remoto. | P0 |
| 03.03 | Persistencia de bebida y aparición en carta | IMPLEMENTADO SIN VERIFICAR | OPS:436–496,202; U01 OperacionService — Prueba ejecutada, alcance E | Inserción y recarga conectadas; pruebas existentes usan mock. Crear bebida con tres fotos y leer desde otra sesión. | P1 |
| 03.04 | Uso de cámara para imágenes | IMPLEMENTADO SIN VERIFICAR | CAM:85,110; CMP:974 — Inspección; ejecución específica pendiente | CameraSource.Prompt conectado; falta Android y foto autorizada. | P1 |
| 03.05 | Elección desde galería permitida | IMPLEMENTADO SIN VERIFICAR | CAM:85,161; CMP:974 — Inspección; ejecución específica pendiente | Selector nativo/web existe; probar galería, cancelación y archivo inválido por separado. | P1 |
| 03.06 | Exactamente tres fotos en alta | NO CUMPLE | CMP:408–412; TPL:455; AUD02 — Prueba ejecutada, alcance E | Solo posición 0; una foto vuelve válido el formulario. Exponer tres posiciones y conectar tresFotosRequeridas y validación confiable. | P1 |
| 03.07 | Imágenes individuales centradas y navegables | PARCIAL | CMP:414; TPL:1360; V01 — Prueba ejecutada, alcance E | Carta muestra una imagen a la vez; alta administra una sola. Ampliar alta sin fragmentos vecinos y verificar tres imágenes reales. | P1 |
| 03.08 | Reemplazo individual de las tres fotos | NO CUMPLE | CMP:412,974,1001; OPS:696 — Inspección; ejecución específica pendiente | Hay reemplazo de primera imagen, no controles para las otras dos. Incorporar selector de posición y probar persistencia. | P1 |
| 03.09 | Persistencia de las tres imágenes | IMPLEMENTADO SIN VERIFICAR | OPS:696–739; BASE:113 — Inspección; ejecución específica pendiente | Servicio admite array y upsert por orden; UI no lo completa. Verificar tres filas, objetos y recuperación parcial en entorno seguro. | P1 |
| 03.10 | Validación de nombre | IMPLEMENTADO SIN VERIFICAR | CMP:395; LEN:78; U01 — Prueba ejecutada, alcance E | 2–60 y no espacios en UI; CHECK con trim en BD. Probar casos del registro de validación en alta de bebida. | P1 |
| 03.11 | Validación de descripción | IMPLEMENTADO SIN VERIFICAR | CMP:396; LEN:82 — Inspección; ejecución específica pendiente | 10–300 y no espacios; falta ejecutar límites y mensajes en ambos extremos. | P1 |
| 03.12 | Validación de minutos | IMPLEMENTADO SIN VERIFICAR | CMP:397–404; BASE:92 — Inspección; ejecución específica pendiente | Entero 1–600 en UI, BD entero >0. El máximo es política local, no consigna. Probar negativos, fracciones y tipos. | P1 |
| 03.13 | Validación de precio | IMPLEMENTADO SIN VERIFICAR | CMP:406; VAL:261; BASE:93 — Inspección; ejecución específica pendiente | UI mínimo 1 y dos decimales; BD >0 numeric(10,2). Alinear diferencias y probar límites/formatos. | P1 |
| 03.14 | Validación de tipo y coherencia de sector | IMPLEMENTADO SIN VERIFICAR | NAV:93; BASE:101; RLS:69 — Inspección; ejecución específica pendiente | La BD impone bebida/bar y plato/cocina. Probar manipulación y tipo fuera del enum. | P1 |
| 03.15 | Validación de fotos vacías, cantidad, formato y carga fallida | NO CUMPLE | CMP:409; VAL:284; CAM:177; AUD02 — Prueba ejecutada, alcance E | Validador de tres fotos existe pero no se usa. Exigir 3 y comprobar binario, extensión, cancelación y fallo de Storage. | P1 |

### 04. Alta y gestión de mesa · D4, dueño y supervisor

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 04.01 | Acceso del dueño | CUMPLE | NAV:128; V01 Mesas — Prueba ejecutada, alcance E | Sin corrección necesaria para acceso UI; persistencia se evalúa aparte. | P2 |
| 04.02 | Acceso del supervisor | IMPLEMENTADO SIN VERIFICAR | NAV:39–43 — Inspección; ejecución específica pendiente | Ruta prevista; probar creación y gestión con supervisor real. | P1 |
| 04.03 | Denegación a perfiles no autorizados | IMPLEMENTADO SIN VERIFICAR | RLS:65; CMP:1093 — Inspección; ejecución específica pendiente | RLS gerencia para escritura; validar llamadas directas como cliente/metre. | P0 |
| 04.04 | Validación del número | IMPLEMENTADO SIN VERIFICAR | CMP:436; BASE:68; U01 — Prueba ejecutada, alcance E | Entero 1–999 en UI y UNIQUE en BD; BD no limita positividad de número. Alinear dominio y probar vacíos/decimales/duplicados. | P1 |
| 04.05 | Validación de comensales | IMPLEMENTADO SIN VERIFICAR | CMP:446; BASE:69 — Inspección; ejecución específica pendiente | Entero 1–20, probar inválidos y persistencia en ambos perfiles. | P1 |
| 04.06 | Validación de tipo VIP/estándar/movilidad reducida | IMPLEMENTADO SIN VERIFICAR | CMP:455; OPS:1506; ENUM — Inspección; ejecución específica pendiente | Opciones y enum presentes; probar valor adulterado, tipo nulo y traducción. | P1 |
| 04.07 | Estado libre por defecto persistido | IMPLEMENTADO SIN VERIFICAR | OPS:788–795; BASE:71 — Inspección; ejecución específica pendiente | Se omite estado y default libre lo completa; falta alta remota. | P1 |
| 04.08 | Foto desde cámara del dispositivo | IMPLEMENTADO SIN VERIFICAR | CMP:477; CAM:69 — Inspección; ejecución específica pendiente | Cámara nativa; web simula con archivo. Probar cámara y permisos. | P1 |
| 04.09 | Validación de foto y recuperación de carga fallida | PARCIAL | CMP:463; OPS:871–892 — Inspección; ejecución específica pendiente | UI exige objeto, BD permite NULL y alta puede quedar sin foto. Completar recuperación y validar archivo real. | P1 |
| 04.10 | Foto individual centrada y de tamaño adecuado | NO VERIFICABLE | V01 Mesas-alta; CMP:285 — Inspección; ejecución específica pendiente | Contenedor inspeccionado sin foto; verificar imagen real en 320–768 px. | P2 |
| 04.11 | Persistencia y aparición en listado | IMPLEMENTADO SIN VERIFICAR | OPS:780–802 — Inspección; ejecución específica pendiente | Insert, foto y cargar conectados; pruebas de servicio son mock. Verificar fila y segundo dispositivo. | P1 |
| 04.12 | Generación QR automática con token de mesa | IMPLEMENTADO SIN VERIFICAR | QR:53–70; CMP:1157; BASE:76; U01 — Prueba ejecutada, alcance E | Generador usa token de fila, no número fijo; probar alta+decodificación+lectura física. | P1 |
| 04.13 | Cambio de disponibilidad coherente con estadía activa | NO CUMPLE | OPS:1005–1031; RLS:65; FUN:246 — Inspección; ejecución específica pendiente | Toggle directo ocupado/libre sin verificar estadía; impedir liberar mesa con estadía activa por este camino. | P0 |
| 04.14 | Cambio reflejado en asignación de otros dispositivos | IMPLEMENTADO SIN VERIFICAR | OPS:1333,1054 — Inspección; ejecución específica pendiente | Suscripción a mesas conectada; falta publicación Realtime remota y sesiones compartidas reales. | P1 |

### 05. Alta de cliente registrado · D2, cliente o metre

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 05.01 | Registro accesible al cliente antes del ingreso | NO IMPLEMENTADO | ROUTES:6–21; TPL ingreso; NAV — Inspección; ejecución específica pendiente | Ingreso no ofrece alta pública y operacion exige sesión. Crear ruta/formulario público conectado a Auth. | P0 |
| 05.02 | Registro desde perfil metre | PARCIAL | NAV:44; CMP:1291; OPS:804 — Inspección; ejecución específica pendiente | Formulario disponible al metre; siempre escribe mock, incluso con Supabase. Conectar backend sin cambiar sesión del metre. | P0 |
| 05.03 | Nombres: validación y persistencia | NO CUMPLE | CMP:504; AUD01; OPS:804 — Prueba ejecutada, alcance E | Espacios solos aceptados y sin persistencia real. Aplicar validadores comunes y alta servidor. | P1 |
| 05.04 | Apellidos: validación y persistencia | NO CUMPLE | CMP:505; AUD01 — Prueba ejecutada, alcance E | Solo required acepta espacios. Validar letras Unicode, límites y almacenamiento real. | P1 |
| 05.05 | DNI: validación y persistencia | NO CUMPLE | CMP:506; AUD01 — Prueba ejecutada, alcance E | abcdefg es válido por longitud. Usar formato numérico y unicidad en servidor. | P1 |
| 05.06 | Correo: validación y persistencia | PARCIAL | CMP:507; OPS:804 — Inspección; ejecución específica pendiente | Required/email presentes; falta límite común y alta Auth. Probar espacios, dominio y tipos. | P1 |
| 05.07 | Contraseña: campo, validación y alta Auth | NO IMPLEMENTADO | CMP:503–508; TPL:998–1036 — Inspección; ejecución específica pendiente | No existe campo de contraseña ni signUp conectado; incorporarlos con política y validaciones. | P0 |
| 05.08 | Foto personal solo desde cámara | NO IMPLEMENTADO | CMP:503; TPL clientes; MOCK:175 — Inspección; ejecución específica pendiente | No hay control de foto cliente, mock usa logo. Conectar CameraSource.Camera. | P1 |
| 05.09 | Foto individual, centrada, reemplazable y persistida | NO IMPLEMENTADO | MOCK:182; OPS:804 — Inspección; ejecución específica pendiente | No hay foto real de alta; implementar contenedor y subida asociada a usuario. | P1 |
| 05.10 | Lectura real de DNI del cliente | IMPLEMENTADO SIN VERIFICAR | CMP:1357; DNI:44; U01 — Prueba ejecutada, alcance E | Lector se conecta al formulario; parser probado, cámara no. Probar documento autorizado. | P1 |
| 05.11 | Autocompletado solo con campos disponibles | NO CUMPLE | CMP:1362,1427; PARSER:113 — Inspección; ejecución específica pendiente | Rellena correo propuesto ausente del DNI; separar sugerencias de lectura y no inventar datos. | P1 |
| 05.12 | Registro pendiente persistente | NO CUMPLE | OPS:804–808; MOCK:175–186 — Inspección; ejecución específica pendiente | Se informa alta pendiente sin crear Auth ni fila remota. Implementar alta transaccional y mostrar resultado real. | P0 |
| 05.13 | Solo gerencia puede aprobar/rechazar | IMPLEMENTADO SIN VERIFICAR | CMP:1300; RLS:56; PROTECT:43 — Prueba ejecutada, alcance E | Restricción UI y trigger; SQL09 frena autopromoción. Probar roles y cuenta pendiente en backend desplegado. | P0 |
| 05.14 | Bloqueo de login y restauración para pendiente | IMPLEMENTADO SIN VERIFICAR | AUTH:85–97,143–153 — Inspección; ejecución específica pendiente | Consulta usuarios.estado y signOut; falta prueba con cuenta de prueba remota. | P1 |
| 05.15 | Bloqueo de funciones por acceso directo o sesión previa | NO CUMPLE | Inspección estática: RLS:100,109,206; AUTH:85. No se ejecutó este caso con perfil pendiente/rechazado. — Inspección; ejecución específica pendiente | Varias políticas no exigen aprobado y habilitan acciones por propiedad; aplicar estado aprobado en todas las transiciones pertinentes y revocación efectiva. | P0 |
| 05.16 | Correo automático de situación del registro | NO IMPLEMENTADO | COM búsqueda C01, OPS:810 — Inspección; ejecución específica pendiente | No hay disparador/plantilla/emisor. Ver 07 y 08; correo adicional de pendiente queda ambiguo, sin contarlo como obligación extra. | P1 |
| 05.17 | Anónimo exento de aprobación | PARCIAL | FUN:79; AUTH; COM búsqueda C01 — Inspección; ejecución específica pendiente | Trigger lo contempla; falta ingreso anónimo real. Implementar signInAnonymously con nombre/foto. | P1 |

### 06. Clientes pendientes · D1, dueño y supervisor

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 06.01 | Listado de pendientes para dueño | CUMPLE | NAV; TPL:1038; V01 Clientes — Prueba ejecutada, alcance E | Vista de pendientes disponible en demo; sin corrección necesaria para acceso UI. | P2 |
| 06.02 | Listado de pendientes para supervisor | IMPLEMENTADO SIN VERIFICAR | NAV:44; CMP:219 — Inspección; ejecución específica pendiente | Acceso previsto; recorrer sesión de supervisor con nueva alta real. | P1 |
| 06.03 | Alta nueva aparece sin intervención manual | NO CUMPLE | OPS:804,815,1329 — Inspección; ejecución específica pendiente | Registro es mock y Realtime no escucha usuarios; resolverCliente tampoco recarga. Conectar alta, suscripción y actualización local. | P1 |
| 06.04 | Apellidos y nombres correctamente asociados | IMPLEMENTADO SIN VERIFICAR | OPS:1383; TPL:1046 — Prueba ejecutada, alcance E | Campos enlazados a cada cliente; inspección demo no acredita nuevo registro persistido. | P2 |
| 06.05 | Foto personal identificable y tamaño suficiente | PARCIAL | TPL:1043; OPS:1396; V01 — Prueba ejecutada, alcance E | Imagen asociada existe; alta actual produce logo. Integrar foto real y probar legibilidad. | P1 |
| 06.06 | Control de aceptar autorizado y persistente | IMPLEMENTADO SIN VERIFICAR | CMP:1300; OPS:815; PROTECT — Inspección; ejecución específica pendiente | Update existe; manejar Resultado y refrescar antes de éxito. Probar dueño y supervisor. | P1 |
| 06.07 | Control de rechazar autorizado y persistente | IMPLEMENTADO SIN VERIFICAR | CMP:1300; OPS:815; PROTECT — Inspección; ejecución específica pendiente | Misma conexión; probar rechazo, restricciones y estado remoto. | P1 |
| 06.08 | Lista actualizada tras aceptación/rechazo | NO CUMPLE | CMP:1302; OPS:815,1329 — Inspección; ejecución específica pendiente | No se recarga usuarios ni se actualiza signal en camino real. Actualizar lista solo tras confirmación servidor. | P1 |
| 06.09 | Push de pendiente al dueño | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | Solo notificar en mock; implementar registro token, evento y envío real al dueño. | P1 |
| 06.10 | Push de pendiente al supervisor | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | Mismo faltante; comprobar destinatario supervisor separadamente en primer/segundo plano. | P1 |

### 07. Rechazo de cliente · D1 gerencia, D2 cliente

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 07.01 | Rechazo por dueño | IMPLEMENTADO SIN VERIFICAR | CMP:1300; OPS:810 — Inspección; ejecución específica pendiente | Update rechazado localizado; ejecutar con dueño y verificar retorno real. | P1 |
| 07.02 | Rechazo por supervisor | IMPLEMENTADO SIN VERIFICAR | NAV:44; RLS:56; PROTECT:43 — Inspección; ejecución específica pendiente | Permiso previsto; repetir con supervisor. | P1 |
| 07.03 | Estado rechazado persistido y listado actualizado | PARCIAL | OPS:815; CMP:1302 — Inspección; ejecución específica pendiente | Escritura remota prevista pero éxito se anuncia sin comprobar resultado ni recargar. Corregir manejo de respuesta y comprobar fila. | P1 |
| 07.04 | Correo disparado automáticamente por rechazo | NO IMPLEMENTADO | COM C01; OPS:810 — Inspección; ejecución específica pendiente | No hay emisor, trigger ni Edge de resolución; implementar evento transaccional y envío idempotente. | P1 |
| 07.05 | Logo de empresa en correo | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No existe plantilla de resolución. Añadir logo accesible y comprobar correo recibido. | P1 |
| 07.06 | Mensaje personalizado al cliente | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No hay plantilla ni datos de destinatario usados para envío. Personalizar sin divulgar datos ajenos. | P1 |
| 07.07 | Tipografía propia del correo | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | Crear plantilla HTML de rechazo y verificar render en cliente de correo. | P1 |
| 07.08 | Colores propios del correo | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No hay estilos de plantilla. Definir paleta con contraste y comparar con la otra resolución. | P1 |
| 07.09 | Tamaños propios del correo | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No existe diseño de resolución; fijar jerarquía legible y comprobar recepción. | P1 |
| 07.10 | Diferenciación visual entre aceptación y rechazo | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No hay dos plantillas; no basta sustituir una palabra. Probar ambas recibidas. | P1 |
| 07.11 | Remitente empresarial no personal | NO VERIFICABLE | Sin proveedor/SMTP inspeccionable; MCP bloqueado — Inspección; ejecución específica pendiente | No se conoce remitente remoto. Configurar/verificar identidad empresarial sin publicar credenciales. | P1 |
| 07.12 | Proveedor acepta envío y destinatario recibe | NO VERIFICABLE | Sin entorno/casilla de prueba autorizada; COM C01 — Inspección; ejecución específica pendiente | No se enviaron correos; comprobar por separado solicitud, aceptación y recepción cuando exista implementación. | P1 |
| 07.13 | Login rechazado muestra mensaje alusivo | IMPLEMENTADO SIN VERIFICAR | AUTH:143–153,289 — Inspección; ejecución específica pendiente | Hay mensaje por estado rechazado y signOut; probar cuenta real y distinguir verificación de email de aprobación gerencial. | P1 |
| 07.14 | Sesión anterior y acceso directo no eluden rechazo | NO CUMPLE | Inspección estática: RLS:100,109,206; AUTH:85. No se ejecutó este caso con perfil pendiente/rechazado. — Inspección; ejecución específica pendiente | RLS no exige aprobado en todas las acciones; bloquear operaciones también con JWT previo . | P0 |

### 08. Aceptación de cliente · D1 gerencia, D2 cliente

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 08.01 | Aceptación por dueño | IMPLEMENTADO SIN VERIFICAR | CMP:1300; OPS:810 — Inspección; ejecución específica pendiente | Update aprobado localizado; ejecutar con dueño y verificar retorno real. | P1 |
| 08.02 | Aceptación por supervisor | IMPLEMENTADO SIN VERIFICAR | NAV:44; RLS:56; PROTECT:43 — Inspección; ejecución específica pendiente | Permiso previsto; repetir con supervisor. | P1 |
| 08.03 | Estado aprobado persistido y listado actualizado | PARCIAL | OPS:815; CMP:1302 — Inspección; ejecución específica pendiente | Escritura remota prevista pero éxito se anuncia sin comprobar resultado ni recargar. Corregir manejo de respuesta y comprobar fila. | P1 |
| 08.04 | Correo disparado automáticamente por aceptación | NO IMPLEMENTADO | COM C01; OPS:810 — Inspección; ejecución específica pendiente | No hay emisor, trigger ni Edge de resolución; implementar evento transaccional y envío idempotente. | P1 |
| 08.05 | Logo de empresa en correo | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No existe plantilla de resolución. Añadir logo accesible y comprobar correo recibido. | P1 |
| 08.06 | Mensaje personalizado al cliente | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No hay plantilla ni datos de destinatario usados para envío. Personalizar sin divulgar datos ajenos. | P1 |
| 08.07 | Tipografía propia del correo | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | Crear plantilla HTML de aceptación y verificar render en cliente de correo. | P1 |
| 08.08 | Colores propios del correo | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No hay estilos de plantilla. Definir paleta con contraste y comparar con la otra resolución. | P1 |
| 08.09 | Tamaños propios del correo | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No existe diseño de resolución; fijar jerarquía legible y comprobar recepción. | P1 |
| 08.10 | Diferenciación visual entre aceptación y rechazo | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No hay dos plantillas; no basta sustituir una palabra. Probar ambas recibidas. | P1 |
| 08.11 | Remitente empresarial no personal | NO VERIFICABLE | Sin proveedor/SMTP inspeccionable; MCP bloqueado — Inspección; ejecución específica pendiente | No se conoce remitente remoto. Configurar/verificar identidad empresarial sin publicar credenciales. | P1 |
| 08.12 | Proveedor acepta envío y destinatario recibe | NO VERIFICABLE | Sin entorno/casilla de prueba autorizada; COM C01 — Inspección; ejecución específica pendiente | No se enviaron correos; comprobar por separado solicitud, aceptación y recepción cuando exista implementación. | P1 |
| 08.13 | Login permitido después de aprobación | IMPLEMENTADO SIN VERIFICAR | AUTH:143–153,289 — Inspección; ejecución específica pendiente | Estado aprobado permite iniciar sesión; probar cuenta real y distinguir verificación de email de aprobación gerencial. | P1 |
| 08.14 | Confirmación de identidad no sustituye aprobación gerencial | IMPLEMENTADO SIN VERIFICAR | AUTH:85; RLS:206; SQL07 — Inspección; ejecución específica pendiente | El login consulta usuarios.estado separadamente; probar email confirmado y estado pendiente . | P0 |

### 09. Anónimo y espera · D3 cliente, D4 metre

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 09.01 | Registro anónimo con nombre | PARCIAL | TPL:1337; CMP:1313; FUN:79 — Inspección; ejecución específica pendiente | Formulario anota espera pero no crea identidad anónima; implementar Auth anónimo y guardar nombre. | P1 |
| 09.02 | Foto personal del anónimo | NO IMPLEMENTADO | TPL:1315–1350; MOCK:209 — Inspección; ejecución específica pendiente | No hay captura/selector, se usa logo; añadir foto sin imponer prohibición de galería no exigida. | P1 |
| 09.03 | Registro sin campos del cliente completo ni aprobación | PARCIAL | FUN:79; TPL:1337 — Inspección; ejecución específica pendiente | UI pide solo nombre y trigger exime aprobación, pero no hay alta real conectada. | P1 |
| 09.04 | Lectura QR de ingreso habilita espera | NO IMPLEMENTADO | TPL:1322; CMP:1313; QR — Inspección; ejecución específica pendiente | Se muestra PNG y botón Anotarme, no escaneo. Implementar lector y validación token/entrada. | P1 |
| 09.05 | Resultados previos accesibles desde ingreso | NO CUMPLE | TPL:1555–1594; V01 — Prueba ejecutada, alcance E | Reportes accesibles pero son datos estáticos, no resultados de encuestas. Agregar consultas agregadas reales. | P1 |
| 09.06 | Inscripción persistente en lista de espera | IMPLEMENTADO SIN VERIFICAR | OPS:1033–1041 — Inspección; ejecución específica pendiente | Inserta usuario actual; comprobar identidad, unicidad y nueva fila en entorno de prueba. | P1 |
| 09.07 | Actualización automática del listado del metre | IMPLEMENTADO SIN VERIFICAR | OPS:1348; RLS:91 — Inspección; ejecución específica pendiente | Suscripción conectada; cuatro contextos demo no comparten backend. Probar Realtime remoto. | P1 |
| 09.08 | Push de ingreso a espera al metre | NO IMPLEMENTADO | COM C01; MOCK:219 — Inspección; ejecución específica pendiente | Aviso en signal no es push; implementar envío y recepción en ambos estados de app. | P1 |
| 09.09 | Metre elimina cada entrada | IMPLEMENTADO SIN VERIFICAR | OPS:1043; CMP:1534 — Inspección; ejecución específica pendiente | Update eliminado existe; probar refresco, permisos y no dejar mesa/estadía huérfanas. | P1 |
| 09.10 | Cliente no toma mesa sin espera y asignación | NO CUMPLE | RLS:104–109; SQL02 — Prueba ejecutada, alcance E | Cliente crea su propia sesiones_mesa sin espera. Encapsular asignación en operación autorizada del metre. | P0 |
| 09.11 | Sin nueva encuesta antes de una estadía válida | NO CUMPLE | RLS:184; SQL05; TPL:1482 — Prueba ejecutada, alcance E | Encuesta acepta identidad propia con estadía ajena y no valida recepción. Vincular propietario/estado en servidor. | P0 |

### 10. Asignación y QR de mesa · D4 metre, D2 registrado, D3 segundo cliente

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 10.01 | Metre asigna cliente de espera a mesa disponible | NO CUMPLE | OPS:1054–1073; RLS:65 — Inspección; ejecución específica pendiente | Actualiza espera, intenta update mesas reservado a gerencia e ignora errores posteriores. Usar transacción/RPC autorizada. | P0 |
| 10.02 | Push de asignación al cliente | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No emisor real ni token registrado; implementar destinatario de la estadía. | P1 |
| 10.03 | Lectura del QR correcto vincula mesa asignada | NO IMPLEMENTADO | OPS:1075; QR; TPL Entrada — Inspección; ejecución específica pendiente | vincularMesa solo compara número y no tiene llamada de escáner. Implementar lectura token y confirmación servidor. | P0 |
| 10.04 | Antes de escanear no se puede elegir otra mesa | NO CUMPLE | RLS:104–109; SQL02 — Prueba ejecutada, alcance E | Autoasignación directa permitida; imponer asignación previa del metre en capa confiable. | P0 |
| 10.05 | Después de escanear no se puede cambiar a otra | NO CUMPLE | RLS:109 — Inspección; ejecución específica pendiente | Cliente puede actualizar su sesión sin limitar mesa_id. Bloquear cambio libre de mesa y validar transición. | P0 |
| 10.06 | Mensaje indica cuál mesa corresponde ante QR ajeno | NO IMPLEMENTADO | OPS:1075; búsqueda vincularMesa — Inspección; ejecución específica pendiente | No hay flujo de lectura/resultado que muestre esa discrepancia. Añadir mensaje con número asignado. | P1 |
| 10.07 | Mesa no admite dos estadías abiertas | IMPLEMENTADO SIN VERIFICAR | OPER:42; SQL03 — Prueba ejecutada, alcance E | UNIQUE parcial rechazó segunda ocupación local con 23505; falta confirmar índice en servidor y concurrencia real. | P0 |
| 10.08 | Cliente no admite dos estadías abiertas | IMPLEMENTADO SIN VERIFICAR | OPER:47 — Inspección; ejecución específica pendiente | Índice parcial localizado; probar simultaneidad y despliegue real. | P0 |
| 10.09 | Asignación atómica sin esperas asignadas huérfanas | NO CUMPLE | OPS:1058–1073 — Inspección; ejecución específica pendiente | Tres escrituras y resultados ignorados; transacción con bloqueo/índice y respuesta única verificable. | P0 |

### 11. Carta y consulta · cliente asignado, todos los mozos

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 11.01 | QR de mesa válido habilita carta | NO IMPLEMENTADO | TPL:1354; OPS:1075; QR — Inspección; ejecución específica pendiente | La carta abre desde menú sin escanear. Agregar condición de vinculación confirmada. | P1 |
| 11.02 | Carta contiene comidas | IMPLEMENTADO SIN VERIFICAR | OPS:208; BASE:86; V01 — Prueba ejecutada, alcance E | Platos se muestran en demo; verificar catálogo real y altas. | P1 |
| 11.03 | Carta contiene bebidas | IMPLEMENTADO SIN VERIFICAR | OPS:208; NAV; V01 — Inspección; ejecución específica pendiente | Bebidas incluidas en fuente; falta recorrido remoto de alta y consulta. | P1 |
| 11.04 | Carta contiene postres | IMPLEMENTADO SIN VERIFICAR | ENUM; BASE:101; seed.sql — Inspección; ejecución específica pendiente | BD contempla postre; UI limita tipo de alta a plato/bebida. Verificar publicación real y etiqueta sin cast inválido. | P1 |
| 11.05 | Nombre visible por producto | CUMPLE | TPL:1371; V01 Menú — Prueba ejecutada, alcance E | Nombre renderizado en tarjeta inspeccionada; sin corrección necesaria para este dato visual. | P2 |
| 11.06 | Precio visible por producto | CUMPLE | TPL:1369; V01 — Prueba ejecutada, alcance E | Precio renderizado en demo; sin corrección necesaria para presentación, cálculo confiable se audita en 21. | P2 |
| 11.07 | Descripción visible por producto | CUMPLE | TPL:1372; V01 — Prueba ejecutada, alcance E | Descripción visible en muestra; sin corrección necesaria para esa presentación, textos largos pendientes en UI-D. | P2 |
| 11.08 | Tiempo estimado visible por producto | CUMPLE | TPL:1368; V01 — Prueba ejecutada, alcance E | Minutos visibles; sin corrección necesaria en dato presentado. | P2 |
| 11.09 | Tres fotos persistentes por producto | NO CUMPLE | CMP:412; BASE:113; OPS:1436 — Inspección; ejecución específica pendiente | Alta administra una, CHECK solo limita orden 1–3. Exigir completitud del catálogo. | P1 |
| 11.10 | Foto individual centrada sin fragmentos vecinos | CUMPLE | TPL:1360; V01 Menú 320–768 — Prueba ejecutada, alcance E | Una imagen por contenedor en muestra; sin corrección necesaria en separación de imágenes. | P2 |
| 11.11 | Consulta solo con mesa válida asignada | NO CUMPLE | NAV:73; OPS:1166; RLS:172 — Inspección; ejecución específica pendiente | UI no condiciona acceso y RLS admite sesión propia incluso cerrada. Validar vínculo y estado activo. | P0 |
| 11.12 | Consulta identifica número de mesa | NO CUMPLE | TPL:1597; OPS:1491 — Inspección; ejecución específica pendiente | Mensaje guarda sesion_mesa_id pero UI no muestra mesa en chat. Incluir número y separar salas. | P1 |
| 11.13 | Consulta muestra fecha, hora y minutos | IMPLEMENTADO SIN VERIFICAR | OPS:1496; TPL:1601 — Inspección; ejecución específica pendiente | Formato toLocaleString conectado; verificar consulta real entre sesiones. | P2 |
| 11.14 | Conversación cliente con todos los mozos | PARCIAL | RLS:162; OPS:1424,1166 — Inspección; ejecución específica pendiente | Todos los mozos tienen lectura, pero se mezclan mensajes y se elige primera estadía; implementar selección explícita por mesa. | P1 |
| 11.15 | Push de consulta a todos los mozos, D1 y D4 | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No hay envío ni fan-out real; probar dos mozos simultáneos, foreground/background. | P1 |
| 11.16 | Mozo D4 responde a la conversación correcta | NO CUMPLE | CMP:1609–1612; OPS:1170,1424 — Inspección; ejecución específica pendiente | Siempre envía propio=true y tipo consulta; mozo puede usar primera estadía ajena al mensaje. Enrutar por sesión y tipo respuesta. | P1 |
| 11.17 | Cliente visualiza nombre real de quien responde | NO CUMPLE | OPS:1494 — Inspección; ejecución específica pendiente | Autor ajeno se transforma en Equipo TUMBO. Resolver nombre autorizado del autor. | P1 |
| 11.18 | Cliente ve respuesta con fecha/hora/minutos | IMPLEMENTADO SIN VERIFICAR | OPS:1491; suscripción mensajes:1353 — Inspección; ejecución específica pendiente | Campos y refresco previstos; probar respuesta real aislada por mesa. | P1 |
| 11.19 | Cliente recibe push de respuesta | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No mecanismo; implementar evento al cliente de la estadía. | P1 |
| 11.20 | Alcance de lectura entre clientes documentado y validado | NO VERIFICABLE | RLS:162; consigna sala todos — Inspección; ejecución específica pendiente | RLS limita cliente a propia estadía y staff a todas; aclarar si se exige sala global sin publicar mensajes privados por defecto. | P1 |

### 12. Realización del pedido · cliente

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 12.01 | Elegir productos para toda la mesa | CUMPLE | OPS:1078; AUD03; V02 cliente-menu — Prueba ejecutada, alcance E | Carrito admite múltiples unidades sin límite por usuario; sin corrección necesaria en selección local. | P2 |
| 12.02 | Editar cantidades y quitar unidades | CUMPLE | OPS:1096; AUD03 — Prueba ejecutada, alcance E | Total cambia y elemento desaparece al llegar a cero; sin corrección necesaria en cálculo local. | P2 |
| 12.03 | Importe acumulado actualizado continuamente | CUMPLE | OPS:186; AUD03; V02 — Prueba ejecutada, alcance E | Computed refleja cantidad; sin corrección necesaria en valor local. | P2 |
| 12.04 | Importe grande y siempre visible al desplazarse/editar | NO CUMPLE | CSS:1057; V01 Menú 320×568 — Prueba ejecutada, alcance E | Resumen y envío quedan fuera del área útil; sacar total al footer persistente sin tapar contenido. | P1 |
| 12.05 | Tiempo estimado del pedido completo visible | PARCIAL | OPS:189; TPL:1403; V01 — Prueba ejecutada, alcance E | Se calcula máximo de minutos, ignora cantidades/sectores; fórmula no está fijada por consigna. Falta visibilidad en 320 y validar política con equipo. | P1 |
| 12.06 | Pedido persistido con productos y cantidades | NO CUMPLE | OPS:1115–1129; RLS:145; SQL01 — Prueba ejecutada, alcance E | Inserta pendiente_confirmacion y luego ítems: RLS solo acepta borrador/rechazado. Guardar borrador+ítems+envío en transacción. | P0 |
| 12.07 | Pedido queda esperando confirmación | PARCIAL | OPS:1117; SQL01; MOCK:284 — Prueba ejecutada, alcance E | Estado correcto se crea, pero puede quedar pedido vacío ante error. Corregir atomicidad y probar UI/backend. | P0 |
| 12.08 | No llega a sectores antes de confirmar mozo | NO CUMPLE | RLS:129,158; SQL11; FUN:189 — Prueba ejecutada, alcance E | Staff lee todo y actualiza sin transición validada; no basta botón disabled. Restringir flujo en servidor. | P0 |
| 12.09 | Push al mozo al enviar | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | Demo registra aviso local; falta entrega push real. | P1 |
| 12.10 | Cliente consulta estado desde envío | IMPLEMENTADO SIN VERIFICAR | TPL:1190; OPS:1291 — Inspección; ejecución específica pendiente | Pantalla de estado conectada; comprobar pedido real y errores anteriores resueltos. | P1 |

### 13. Rechazo y modificación · D4 mozo, cliente

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 13.01 | Mozo rechaza con motivo | IMPLEMENTADO SIN VERIFICAR | CMP:1553; OPS:1134; RLS:132 — Inspección; ejecución específica pendiente | Motivo fijo y cambio de estado; no se espera promesa en componente. Probar éxito/fallo, mostrar resultado real. | P1 |
| 13.02 | Solo rol autorizado puede rechazar | NO CUMPLE | RLS:132; SQL11 — Prueba ejecutada, alcance E | es_staff permite cocina/bar cambiar estados gerenciales. Limitar transición a mozo/roles acordados. | P0 |
| 13.03 | Push de rechazo al cliente | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | Falta envío real; destinatario debe ser cliente del pedido. | P1 |
| 13.04 | Pedido rechazado precarga productos para modificar | NO CUMPLE | MOCK:305; OPS:1134; AUD07 — Prueba ejecutada, alcance E | Carrito quedó vacío tras envío y no se repone; cargar versión rechazada conservando cantidades. | P1 |
| 13.05 | Cambiar cantidades de productos anteriores | PARCIAL | OPS:1078–1100; AUD03,AUD07 — Prueba ejecutada, alcance E | Controles sirven para nuevo carrito, no edición del rechazado. Restaurar pedido y editar esa versión. | P1 |
| 13.06 | Agregar productos durante modificación | IMPLEMENTADO SIN VERIFICAR | OPS:1078 — Inspección; ejecución específica pendiente | Carrito permite agregar; falta probar edición real del rechazado y persistencia de versión. | P1 |
| 13.07 | Quitar productos durante modificación | PARCIAL | OPS:1096; AUD07 — Prueba ejecutada, alcance E | Puede quitar del carrito existente, pero rechazado no se precarga. Implementar esa restauración. | P1 |
| 13.08 | Totales y tiempo se recalculan al modificar | IMPLEMENTADO SIN VERIFICAR | OPS:186–190; AUD03 — Prueba ejecutada, alcance E | Computeds locales probados; comprobar versión editada y política de tiempo. | P1 |
| 13.09 | Reenvío usa la nueva versión y espera confirmación | NO CUMPLE | OPS:1103–1132; SQL01 — Prueba ejecutada, alcance E | Siempre inserta nuevo pedido y falla en ítems; transacción de versión/reenvío sin órdenes duplicadas. | P0 |
| 13.10 | Push al mozo en reenvío | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No emisor real ni idempotencia; incorporar evento distinguible. | P1 |
| 13.11 | No quedan órdenes prematuras o duplicadas en cocina/bar | NO CUMPLE | OPS:1115; RLS:129; SQL01 — Prueba ejecutada, alcance E | Pedidos vacíos pueden acumularse; aplicar clave de idempotencia y no exponer antes de confirmar. | P0 |

### 14. Confirmación, sectores y acceso a juegos · D4 mozo

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 14.01 | Mozo confirma con autorización confiable | NO CUMPLE | OPS:1137; RLS:132; SQL11 — Prueba ejecutada, alcance E | Cocinero pudo confirmar en esquema local. Validar rol y transición en servidor. | P0 |
| 14.02 | Derivación de comidas/postres a cocina | IMPLEMENTADO SIN VERIFICAR | FUN:170; BASE:101; OPS:204; SQL04 — Prueba ejecutada, alcance E | Trigger corrige sector a cocina; probar pedido confirmado con postres en sesión real. | P1 |
| 14.03 | Derivación de bebidas a bar | IMPLEMENTADO SIN VERIFICAR | FUN:170; BASE:101; V02 barra — Prueba ejecutada, alcance E | Filtro de bar existe y muestra ítem demo correcto; probar flujo real separado. | P1 |
| 14.04 | Productos y cantidades correctos en cada sector | IMPLEMENTADO SIN VERIFICAR | OPS:1462; CMP:204; V02 — Prueba ejecutada, alcance E | Mock muestra ítems filtrados; falta comparación contra pedido persistido. | P1 |
| 14.05 | Push de derivación a cocina | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No transporte real; emitir una vez al confirmar. | P1 |
| 14.06 | Push de derivación a bar | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No transporte real; emitir solo si interviene bar. | P1 |
| 14.07 | Cliente ve estado tras confirmación | IMPLEMENTADO SIN VERIFICAR | OPS:1338; TPL:1190 — Inspección; ejecución específica pendiente | Suscripción existe; probar evento real y reconexión. | P1 |
| 14.08 | Juegos accesibles en etapa requerida | NO CUMPLE | NAV:54; V02 juego-sin-confirmacion — Prueba ejecutada, alcance E | Se puede pulsar ganar sin transición habilitante; condicionar acceso/beneficio al estado requerido. | P1 |
| 14.09 | Tres juegos simples funcionales | NO IMPLEMENTADO | TPL:1442,1456,1470; V02 — Prueba ejecutada, alcance E | Solo botones Ganar primer intento y Probar. Implementar mecánicas jugables, resultado verificable e intentos. | P0 |
| 14.10 | Descuento 10% del primer juego | PARCIAL | MOCK:357; AUD04 memoria; referencia a 15.01, sin segundo recuento — Prueba ejecutada, alcance E — no contado de nuevo | Asignación de 10 funciona en simulación; falta juego real y validación de victoria confiable. | P1 |
| 14.11 | Descuento 15% del segundo juego | PARCIAL | MOCK:357; AUD04 palabras; referencia a 15.02, sin segundo recuento — Prueba ejecutada, alcance E — no contado de nuevo | Asignación de 15 probada en mock; implementar juego real. | P1 |
| 14.12 | Descuento 20% del tercer juego | PARCIAL | MOCK:357; AUD04 rapidez; referencia a 15.03, sin segundo recuento — Prueba ejecutada, alcance E — no contado de nuevo | Asignación de 20 probada en mock; implementar juego real. | P1 |
| 14.13 | Beneficio exclusivo del registrado | IMPLEMENTADO SIN VERIFICAR | OPS:1183; RLS:195; NAV:58 — Inspección; ejecución específica pendiente | UI y RLS excluyen anónimo de partida premiada; probar API con anónimo y otra estadía. | P0 |
| 14.14 | Primera victoria y no acumulación protegidas | PARCIAL | OPS:1197; OPER:133; SQL06; referencia a 15.07, sin segundo recuento — Prueba ejecutada, alcance E — no contado de nuevo | Servidor acepta intento 2, derrota y descuento 99; validar resultado, porcentaje e intento en capa confiable. | P0 |

### 15. Juegos y beneficio · cliente registrado

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 15.01 | Primera victoria memoria otorga solo 10% | PARCIAL | AUD04 memoria; SQL06 — Prueba ejecutada, alcance E | Mock correcto; mecánica ausente y premio falsificable en BD. Implementar juego y regla servidor. | P0 |
| 15.02 | Primera victoria palabras otorga solo 15% | PARCIAL | AUD04 palabras; SQL06 — Prueba ejecutada, alcance E | Mock correcto; falta juego y validación confiable. | P0 |
| 15.03 | Primera victoria rapidez otorga solo 20% | PARCIAL | AUD04 rapidez; SQL06 — Prueba ejecutada, alcance E | Mock correcto; falta juego y validación confiable. | P0 |
| 15.04 | Derrota inicial y victoria posterior no premian memoria | PARCIAL | AUD05 memoria; SQL06 — Prueba ejecutada, alcance E | Mock no premia; servidor admite valores enviados. Derivar intentos y victoria en servidor. | P1 |
| 15.05 | Derrota inicial y victoria posterior no premian palabras | PARCIAL | AUD05 palabras; SQL06 — Prueba ejecutada, alcance E | Resultado mock correcto, validación real ausente. | P1 |
| 15.06 | Derrota inicial y victoria posterior no premian rapidez | PARCIAL | AUD05 rapidez; SQL06 — Prueba ejecutada, alcance E | Resultado mock correcto, validación real ausente. | P1 |
| 15.07 | Solo primer descuento válido, sin suma ni reemplazo | PARCIAL | OPER:147; U01 demo; OPS:1204 — Prueba ejecutada, alcance E | Índice limita una fila positiva y mock mantiene primero; no determina validez y segundo premio genera error. Registrar partidas posteriores con 0. | P0 |
| 15.08 | Todos los juegos siguen accesibles tras beneficio | PARCIAL | TPL:1420; V02; OPS:1197 — Prueba ejecutada, alcance E | Botones permanecen, pero no son juegos y una nueva victoria real puede chocar índice. Implementar juego libre sin segundo premio. | P1 |
| 15.09 | Repeticiones ilimitadas sin premios nuevos | NO CUMPLE | OPS:1197–1206 — Inspección; ejecución específica pendiente | Otro juego en primer intento intenta otorgar premio otra vez; diferenciar juego libre y elegibilidad transaccionalmente. | P1 |
| 15.10 | Intentos y premio sobreviven recarga/sesión/dispositivo | NO CUMPLE | OPS:173–176,1291; MOCK:58; AUD06 — Prueba ejecutada, alcance E | Filas remotas previstas, pero cargar no restaura partidas/descuento; demo mantiene datos entre usuarios y pierde al recargar. Restaurar por estadía y limpiar al salir. | P0 |
| 15.11 | Primer intento delimitado por juego y estadía | IMPLEMENTADO SIN VERIFICAR | OPS:1191–1196; OPER:143 — Inspección; ejecución específica pendiente | Implementación cuenta por juego+sesión; explicitar política y probar cambio de estadía/concurrencia. | P1 |
| 15.12 | Descuento válido se refleja en cuenta final | NO CUMPLE | MOCK:297,385; AUD10; FUN:218 — Prueba ejecutada, alcance E | Demo congela descuento al enviar antes de jugar, cuenta aplica 0. Backend calcula desde partidas pero permite premios arbitrarios. Unificar regla y probar cuenta. | P0 |

### 16. Recepción en cocina · D1, cocinero

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 16.01 | Perfil cocinero accede a sus pendientes | CUMPLE | NAV; V02 sesion3-cocina — Prueba ejecutada, alcance E | Acceso de interfaz probado en contexto independiente; sin corrección necesaria para navegación. | P2 |
| 16.02 | Lista completa de pedidos pendientes de cocina | NO CUMPLE | OPS:1424,1291–1299 — Inspección; ejecución específica pendiente | Elige primera sesión y limit(1), no colección de pedidos. Cargar todos los pendientes pertinentes. | P0 |
| 16.03 | Número de mesa visible | CUMPLE | TPL:1151; V02 — Prueba ejecutada, alcance E | Número mostrado en panel inspeccionado; sin corrección necesaria para presentación. | P2 |
| 16.04 | Fecha con hora y minutos visible | CUMPLE | TPL:1153; OPS:1475; V02 — Prueba ejecutada, alcance E | Fecha/hora visibles en demo; sin corrección necesaria para formato mostrado. | P2 |
| 16.05 | Nombre de cada ítem visible | CUMPLE | TPL:1156; V02 — Prueba ejecutada, alcance E | Nombre renderizado; sin corrección necesaria para dato visible. | P2 |
| 16.06 | Cantidad de cada ítem visible | CUMPLE | TPL:1156; V02 — Prueba ejecutada, alcance E | Cantidad renderizada en demo; sin corrección necesaria en presentación. | P2 |
| 16.07 | Agrupación de todos los pedidos por mesa | NO CUMPLE | OPS:1424; TPL:1147 — Inspección; ejecución específica pendiente | Solo pedidoActivo, imposible representar varias mesas simultáneas. Crear lista agrupada y paginación por pedido/mesa. | P1 |
| 16.08 | Separación y comodidad de operación | IMPLEMENTADO SIN VERIFICAR | V01 Cocina 320–768; V02 — Prueba ejecutada, alcance E | Muestra de un pedido legible; falta lista multi-mesa y contenido largo para acreditar todo el criterio. | P2 |
| 16.09 | No mezcla productos de bar | IMPLEMENTADO SIN VERIFICAR | CMP:204; V02 — Prueba ejecutada, alcance E | Filtro de UI probado en demo; RLS permite lectura staff global. Probar derivación real e integridad del sector. | P1 |
| 16.10 | Cliente ve los cambios de estado del sector | IMPLEMENTADO SIN VERIFICAR | OPS:1140,1338; FUN:189 — Inspección; ejecución específica pendiente | Update y trigger conectados; falta prueba multiusuario remota y publicación Realtime. | P1 |

### 17. Recepción en bar · D3, cantinero

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 17.01 | Perfil cantinero accede a sus pendientes | CUMPLE | NAV; V02 sesion3-barra — Prueba ejecutada, alcance E | Acceso de interfaz probado en contexto independiente; sin corrección necesaria para navegación. | P2 |
| 17.02 | Lista completa de pedidos pendientes de bar | NO CUMPLE | OPS:1424,1291–1299 — Inspección; ejecución específica pendiente | Elige primera sesión y limit(1), no colección de pedidos. Cargar todos los pendientes pertinentes. | P0 |
| 17.03 | Número de mesa visible | CUMPLE | TPL:1151; V02 — Prueba ejecutada, alcance E | Número mostrado en panel inspeccionado; sin corrección necesaria para presentación. | P2 |
| 17.04 | Fecha con hora y minutos visible | CUMPLE | TPL:1153; OPS:1475; V02 — Prueba ejecutada, alcance E | Fecha/hora visibles en demo; sin corrección necesaria para formato mostrado. | P2 |
| 17.05 | Nombre de cada ítem visible | CUMPLE | TPL:1156; V02 — Prueba ejecutada, alcance E | Nombre renderizado; sin corrección necesaria para dato visible. | P2 |
| 17.06 | Cantidad de cada ítem visible | CUMPLE | TPL:1156; V02 — Prueba ejecutada, alcance E | Cantidad renderizada en demo; sin corrección necesaria en presentación. | P2 |
| 17.07 | Agrupación de todos los pedidos por mesa | NO CUMPLE | OPS:1424; TPL:1147 — Inspección; ejecución específica pendiente | Solo pedidoActivo, imposible representar varias mesas simultáneas. Crear lista agrupada y paginación por pedido/mesa. | P1 |
| 17.08 | Separación y comodidad de operación | IMPLEMENTADO SIN VERIFICAR | V01 Barra 320–768; V02 — Prueba ejecutada, alcance E | Muestra de un pedido legible; falta lista multi-mesa y contenido largo para acreditar todo el criterio. | P2 |
| 17.09 | No mezcla productos de cocina | IMPLEMENTADO SIN VERIFICAR | CMP:204; V02 — Prueba ejecutada, alcance E | Filtro de UI probado en demo; RLS permite lectura staff global. Probar derivación real e integridad del sector. | P1 |
| 17.10 | Cliente ve los cambios de estado del sector | IMPLEMENTADO SIN VERIFICAR | OPS:1140,1338; FUN:189 — Inspección; ejecución específica pendiente | Update y trigger conectados; falta prueba multiusuario remota y publicación Realtime. | P1 |

### 18. Finalización por sectores

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 18.01 | Cocina marca solo sus productos listos | IMPLEMENTADO SIN VERIFICAR | OPS:1140; RLS:158; FUN:189 — Inspección; ejecución específica pendiente | Filtro y RLS por sector; verificar permisos/estado previo con cocinero real. | P1 |
| 18.02 | Bar marca solo sus productos listos | IMPLEMENTADO SIN VERIFICAR | OPS:1140; RLS:158 — Inspección; ejecución específica pendiente | Mismo adaptador, filtro bar; repetir prueba real separada. | P1 |
| 18.03 | Cocina primero mantiene parcial hasta terminar bar | IMPLEMENTADO SIN VERIFICAR | AUD08 cocina; FUN:189 — Prueba ejecutada, alcance E | Mock probado; ejecutar trigger real y recepción del mozo/cliente. | P1 |
| 18.04 | Bar primero mantiene parcial hasta terminar cocina | IMPLEMENTADO SIN VERIFICAR | AUD08 bar; FUN:189 — Prueba ejecutada, alcance E | Mock probado; falta verificación distribuida. | P1 |
| 18.05 | Pedido solo cocina no espera bar | IMPLEMENTADO SIN VERIFICAR | AUD09 cocina; FUN:189 — Prueba ejecutada, alcance E | Regla local correcta; repetir en servidor desplegado. | P1 |
| 18.06 | Pedido solo bar no espera cocina | IMPLEMENTADO SIN VERIFICAR | AUD09 bar; FUN:189 — Prueba ejecutada, alcance E | Regla local correcta; repetir caso independiente. | P1 |
| 18.07 | Mozo distingue preparación parcial de pedido completo | PARCIAL | MOCK:315; TPL:1253; OPS:1291 — Inspección; ejecución específica pendiente | Existe estado global, no cola completa por partes/mesas. Presentar progreso por sector y todos los pedidos. | P1 |
| 18.08 | Push al mozo únicamente cuando todos terminan | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No hay emisor; implementar evento de transición a listo, no por cada ítem. | P1 |
| 18.09 | Cliente recibe estado actualizado | IMPLEMENTADO SIN VERIFICAR | OPS:1338,1343 — Inspección; ejecución específica pendiente | Suscripciones a pedidos/items; falta Realtime verificado. | P1 |
| 18.10 | Reintentos no generan avisos duplicados/prematuros | NO CUMPLE | MOCK:325; AUD08 — Prueba ejecutada, alcance E | Repetir marcarSectorListo añade otra notificación local. Emitir solo al cambiar estado y deduplicar envío futuro. | P1 |

### 19. Entrega y recepción · mozo y cliente

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 19.01 | Mozo entrega pedido completo de sectores intervinientes | IMPLEMENTADO SIN VERIFICAR | TPL:1295; OPS:1155 — Inspección; ejecución específica pendiente | Botón exige listo, servidor no valida transición. Probar composición y autorización real. | P1 |
| 19.02 | Cliente confirma recepción persistente | NO CUMPLE | OPS:1269; TYPES:377; OPER:54; SQL08 — Prueba ejecutada, alcance E | El cliente usa recibido_en, columna ausente en migraciones. Agregar migración y operación autorizada; no basta tipo TypeScript. | P0 |
| 19.03 | Cambio de estado visible al cliente | PARCIAL | OPS:1463; U01 Operacion componente — Prueba ejecutada, alcance E | UI responde correctamente con servicio mock; persistencia real rota y error de cero filas puede parecer éxito. Probar estado remoto. | P1 |
| 19.04 | Recepción no se duplica durante petición | CUMPLE | CMP:1575–1601; U01 Operacion componente — Prueba ejecutada, alcance E | Pruebas verifican bloqueo, recuperación ante fallo y doble emisión; sin corrección necesaria en protección de UI. | P2 |
| 19.05 | Juegos accesibles en momento previsto | NO CUMPLE | NAV:54; V02 — Prueba ejecutada, alcance E | Acceso no depende del ciclo del pedido. Validar transición según 14/19 sin impedir juego libre posterior al premio. | P1 |
| 19.06 | Encuesta solo en etapa habilitada | NO CUMPLE | TPL:1482; RLS:184; SQL05 — Prueba ejecutada, alcance E | Formulario y backend no exigen recepción ni propiedad de estadía. Imponer precondición confiable. | P0 |
| 19.07 | Pedir cuenta solo en etapa habilitada | NO CUMPLE | TPL:1620; RLS:201; V02 cuenta — Prueba ejecutada, alcance E | Cuenta se genera sin completar recepción. Validar estado de estadía y pedidos. | P0 |
| 19.08 | Anónimo conserva restricción de descuentos | IMPLEMENTADO SIN VERIFICAR | NAV:58; OPS:1183; RLS:195 — Inspección; ejecución específica pendiente | Controles por perfil presentes; probar peticiones de anónimo y cambio de usuario. | P1 |

### 20. Encuesta y resultados

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 20.01 | Preguntas cubren varios temas de opinión | PARCIAL | TPL:1491–1516; CMP:512 — Inspección; ejecución específica pendiente | Experiencia/comentario/recomendación existen; respuestas se descartan. Acordar temas con consigna y persistir cada respuesta. | P1 |
| 20.02 | Variedad de controles exigida en anexo | CUMPLE | TPL:1491–1516; V01 Encuesta — Prueba ejecutada, alcance E | Rango, texto e interruptor presentes; sin corrección necesaria para variedad visual. | P2 |
| 20.03 | Validación de satisfacción | NO CUMPLE | CMP:513 — Inspección; ejecución específica pendiente | Solo mínimo 1, sin máximo confiable ni persistencia. Validar escala 1–5 UI/servidor y tipos. | P1 |
| 20.04 | Validación de comentario | NO CUMPLE | CMP:514; OPS:1212 — Inspección; ejecución específica pendiente | Solo required admite espacios y no se envía. Validar longitud/política y guardar valor. | P1 |
| 20.05 | Validación de recomendación booleana | PARCIAL | CMP:515 — Inspección; ejecución específica pendiente | Control booleano existe; falta guardado y validación de tipo confiable. | P1 |
| 20.06 | Persistencia de todas las respuestas | NO CUMPLE | CMP:1631; OPS:1217 — Inspección; ejecución específica pendiente | Inserta solo encuestas; no escribe respuestas_encuesta ni usa form.value. Guardar cabecera y respuestas atómicamente. | P0 |
| 20.07 | Una encuesta por estadía, aun desde otro dispositivo | IMPLEMENTADO SIN VERIFICAR | OPER:114; SQL10 — Prueba ejecutada, alcance E | UNIQUE rechazó duplicado local; verificar misma restricción remota y manejo del error de usuario. | P1 |
| 20.08 | Nueva estadía admite encuesta nueva | NO CUMPLE | MOCK:363,413; AUD12 — Prueba ejecutada, alcance E | Flag demo nunca se resetea al cerrar/abrir estadía; backend tiene entidad correcta pero UI no restaura estado. Derivar por sesión actual. | P1 |
| 20.09 | Resultados basados en encuestas previas reales | NO CUMPLE | TPL:1555–1594; V01 — Prueba ejecutada, alcance E | Porcentajes y barras hardcoded; consumir agregados reales y vacíos/errores. | P0 |
| 20.10 | Gráfico tipo torta funcional | PARCIAL | TPL:1555; V01 Reportes — Prueba ejecutada, alcance E | Visual existe pero dato estático. Conectar satisfacción real y texto alternativo. | P1 |
| 20.11 | Gráfico tipo barras funcional | PARCIAL | TPL:1564 — Inspección; ejecución específica pendiente | Barras fijas de platos pedidos, no respuestas de encuesta. Graficar una dimensión de encuesta. | P1 |
| 20.12 | Gráfico tipo líneas funcional | PARCIAL | TPL:1578 — Inspección; ejecución específica pendiente | Línea decorativa de consumo, sin datos de encuesta. Conectar serie temporal definida. | P1 |
| 20.13 | Un gráfico por pantalla, navegación individual | CUMPLE | TPL:1555–1594; V01 — Prueba ejecutada, alcance E | Ramas excluyentes y pestañas; sin corrección necesaria para mostrar uno a la vez en muestra. | P2 |
| 20.14 | Legibilidad de gráficos y ausencia de recortes | IMPLEMENTADO SIN VERIFICAR | V01 Reportes 320–768 — Prueba ejecutada, alcance E | Torta inicial inspeccionada; faltan barras/líneas con datos extremos, ejes y etiquetas largas. | P2 |
| 20.15 | Anexo excluyente identificado y contrastado | CUMPLE | docs/Trabajo-practico-2026-TFI.md:40, sección 3 — Inspección; ejecución específica pendiente — control documental fuera de métrica | Transcripción enumera variedad de controles y gráficos; sin corrección necesaria en identificación. PDF original no disponible. | P2 |
| 20.16 | Propiedad de estadía y etapa de encuesta protegidas | NO CUMPLE | RLS:184; SQL05 — Prueba ejecutada, alcance E | Cliente puede insertar encuesta en estadía ajena; relacionar cliente con sesión activa y recepción. | P0 |

### 21. Cuenta, propina y pago simulado

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 21.01 | Solicitud de cuenta genera evento al mozo | PARCIAL | OPS:1223; MOCK:397 — Inspección; ejecución específica pendiente | Generar cuenta crea entidad/aviso local; no transición separada de solicitud ni entrega remota. Definir evento y persistirlo. | P1 |
| 21.02 | Push de solicitud al mozo | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | Falta transporte; implementar envío una vez por solicitud. | P1 |
| 21.03 | Lectura QR habilita selección de propina | NO IMPLEMENTADO | CMP:1663; TPL:1633 — Inspección; ejecución específica pendiente | Click sobre imagen selecciona porcentaje, no hay lector. Agregar escaneo y validar token autorizado. | P1 |
| 21.04 | Sin selección no se genera cuenta | PARCIAL | OPS:1225; AUD11; SQL12 — Prueba ejecutada, alcance E | UI bloquea null pero BD acepta cuenta pendiente sin propina. Alinear regla en servidor. | P0 |
| 21.05 | 0% se distingue de no seleccionar | CUMPLE | OPS:1226; AUD11; V02 — Prueba ejecutada, alcance E | Null se rechaza y cero se acepta en UI/demo; sin corrección necesaria en distinción local. | P2 |
| 21.06 | Detalle muestra todos los pedidos de estadía | NO CUMPLE | OPS:1298; TPL:1671 — Inspección; ejecución específica pendiente | Solo último pedido; SQL calcula todos los confirmados. Cargar detalle completo consistente con total. | P1 |
| 21.07 | Ítems con cantidades | CUMPLE | TPL:1674; V02 cuenta — Prueba ejecutada, alcance E | Cantidad visible en ítem de demo; sin corrección necesaria en formato. | P2 |
| 21.08 | Precios unitarios visibles | CUMPLE | TPL:1675; V02 — Prueba ejecutada, alcance E | Precio unidad renderizado; sin corrección necesaria en presentación. | P2 |
| 21.09 | Importes por ítem visibles | CUMPLE | TPL:1677; V02 — Prueba ejecutada, alcance E | Multiplicación visible en muestra; sin corrección necesaria para ese dato. | P2 |
| 21.10 | Descuento válido incluido correctamente | NO CUMPLE | AUD10; SQL06; FUN:230; referencia a 15.12, sin segundo recuento — Prueba ejecutada, alcance E — no contado de nuevo | Demo pierde premio posterior y BD acepta monto arbitrario. Resolver premio confiable y reflejarlo en cuenta. | P0 |
| 21.11 | Grado de satisfacción y porcentaje de propina | PARCIAL | TPL:1690; V02 — Prueba ejecutada, alcance E | Se muestra porcentaje de satisfacción, no nombre del nivel. Añadir Excelente/Muy bueno/Bueno/Regular/Malo asociado al QR. | P1 |
| 21.12 | Total grande, claro y accesible | PARCIAL | V02 cuenta 320–768; TPL:1697 — Prueba ejecutada, alcance E | Total 24px/800 y buen contraste; en 320 el botón de pago queda cortado. Ajustar área útil y acciones. | P1 |
| 21.13 | Cálculo, bases y redondeo consistentes | NO CUMPLE | FUN:218; OPS:1233; MOCK:385; AUD10 — Prueba ejecutada, alcance E | SQL redondea descuento a 2 decimales, UI propina a entero y demo descuento a entero. Definir política y calcular cuenta confiablemente en un lugar. | P0 |
| 21.14 | Precios y cantidades protegidos de manipulación | NO CUMPLE | FUN:175; SQL04 — Prueba ejecutada, alcance E | Trigger conserva precio enviado con coalesce; se aceptó 0.01 para producto de 100. Tomar precio confiable y congelarlo en servidor. | P0 |
| 21.15 | Porcentaje e importe de propina protegidos | NO CUMPLE | OPER:154; RLS:201 — Inspección; ejecución específica pendiente | Cuenta admite valores arbitrarios enviados; no CHECK de niveles ni fórmula. Derivar porcentaje del nivel y recomputar total. | P0 |
| 21.16 | Pago es simulado, no cobro real | CUMPLE | TPL:1710; MOCK:401; OPS:1250 — Inspección; ejecución específica pendiente | Acción se etiqueta simulada y solo cambia estado; sin corrección necesaria sobre modalidad. | P2 |
| 21.17 | Pago deja estado esperando confirmación de mozo | IMPLEMENTADO SIN VERIFICAR | OPS:1275; TPL:1714 — Inspección; ejecución específica pendiente | Update pagada y pantalla prevista; probar rol cliente y retorno real. | P1 |
| 21.18 | Mesa no se libera al pagar antes de confirmar | IMPLEMENTADO SIN VERIFICAR | FUN:246; MOCK:401 — Inspección; ejecución específica pendiente | Trigger solo libera en confirmada; probar pago legítimo y notificación entre sesiones. | P0 |
| 21.19 | Push de pago simulado al mozo | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No envío real; implementar destinatario mozo y deduplicación. | P1 |
| 21.20 | Push de pago simulado al dueño | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | Demo lista rol, no dispositivo; implementar recepción dueño. | P1 |
| 21.21 | Push de pago simulado al supervisor | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | Implementar entrega supervisor independiente. | P1 |

### 22. Confirmación de pago y liberación · mozo, dueño y supervisor

| ID | Requisito y condición para aprobar | Estado | Evidencia y prueba realizada | Qué está hecho, qué falta y corrección concreta | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 22.01 | Solo mozo autorizado confirma pago pendiente de validación | NO CUMPLE | RLS:206; SQL07 — Prueba ejecutada, alcance E | Cliente confirmó su cuenta sin pago previo y cerró estadía. RPC/transición exclusiva de mozo y estado pagada requerido. | P0 |
| 22.02 | Confirmación persiste una sola vez | IMPLEMENTADO SIN VERIFICAR | FUN:249; OPS:1253 — Inspección; ejecución específica pendiente | Trigger compara old/new para no repetir cierre; falta prueba de concurrencia/doble confirmación real. | P1 |
| 22.03 | Push automática de confirmación al dueño | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | No emisor; implementar outbox/evento idempotente. | P1 |
| 22.04 | Push automática de confirmación al supervisor | NO IMPLEMENTADO | COM C01 — Inspección; ejecución específica pendiente | Mismo faltante, destinatario separado a verificar. | P1 |
| 22.05 | Cierre de estadía al confirmar válidamente | IMPLEMENTADO SIN VERIFICAR | FUN:250; SQL07 — Prueba ejecutada, alcance E | Cierre local ocurre, incluso indebidamente; restringir autorización y comprobar caso legítimo remoto. | P0 |
| 22.06 | Mesa queda disponible tras cierre | IMPLEMENTADO SIN VERIFICAR | FUN:254; MOCK:413 — Inspección; ejecución específica pendiente | Update libre conectado; verificar estado remoto y segunda sesión tras confirmación legítima. | P1 |
| 22.07 | Cliente desvinculado y estado local limpio | NO CUMPLE | OPS:1292,1305; MOCK:413; AUD06; V02 — Prueba ejecutada, alcance E | Al no haber sesión se retorna sin limpiar pedido/descuento; SPA hereda carrito entre usuarios. Limpiar signals y canal al cerrar/cambiar usuario. | P0 |
| 22.08 | QR de mesa anterior no reabre estadía terminada | NO IMPLEMENTADO | QR; OPS:1075; búsqueda escáner — Inspección; ejecución específica pendiente | No lector funcional; añadir validación de estadía vigente y nueva asignación obligatoria. | P0 |
| 22.09 | Mesa se reasigna a otro cliente correctamente | IMPLEMENTADO SIN VERIFICAR | OPER:42; FUN:246; OPS:1054 — Inspección; ejecución específica pendiente | Índice libera cupo al cerrar, pero asignación tiene escrituras parciales. Probar nuevo cliente con dos sesiones reales. | P0 |
| 22.10 | Cliente anterior vuelve a espera para nueva asignación | NO CUMPLE | RLS:104; SQL02 — Prueba ejecutada, alcance E | Puede autoasignarse por API; exigir nueva espera y asignación del metre. | P0 |
| 22.11 | QR de ingreso habilita resultados posteriores | NO IMPLEMENTADO | TPL:1322; QR — Inspección; ejecución específica pendiente | No lectura QR, solo PNG; conectar lector de ingreso sin reocupar mesa. | P1 |
| 22.12 | Resultados reales en gráficos distintos uno por pantalla | NO CUMPLE | TPL:1555–1594; V01 — Prueba ejecutada, alcance E | Solo ejemplos estáticos. Reutilizar consulta agregada del punto 20 y probar acceso sin estadía activa. | P1 |

## D. Auditoría visual

Las referencias originales no estaban disponibles; se siguió su descripción. Medición de estilos computados, composición de fondos planos y geometría DOM; revisión directa de capturas de Personal 320, Menú 320, alta de Producto 390 y Cuenta 320, entre otras muestras. No se trasladó una aprobación de escritorio a teléfono.

Fuentes: [WCAG 2.2, contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) y [contraste no textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Texto normal 4,5:1; grande 3:1 (24 CSS px normal o aproximadamente 18,67 px en negrita); información visual necesaria de controles/gráficos 3:1 en su alcance. Se compararon valores sin redondear; los redondeos siguientes son de presentación. Logos, decoración y controles inactivos tienen excepciones normativas; no se usaron para excusar texto activo.

AXE-core con etiquetas wcag2a/wcag2aa/wcag21aa/wcag22aa no reportó violaciones en las instantáneas de 390 px registradas. **No equivale a pasar todos los estados AXE ni a certificación WCAG**: no detectó el importe recortado ni sustituye pruebas de foco, teclado, zoom y movimiento.

| ID | Pantalla/componente | Estado | Dimensiones, medición y evidencia | Corrección o límite |
| --- | --- | --- | --- | --- |
| UI-L.01 | Personal, vista inicial | NO CUMPLE | 320×568: tercera tarjeta y=445,72, h=137,16, termina en 582,88; contenedor se corta antes del borde inferior. 360/390/768 también medidos. | Tarjetas incompletas en reposo, no captura durante scroll. Ajustar unidades por página/altura útil; permitir desplazamiento accesible de contenido largo. |
| UI-L.02 | Productos y carta | PARCIAL | V01 320/360/390/768: un producto por página; en 320 tarjeta menú x=25,y=184,19,w=260,h=276,28. | Unidad completa en muestra, pero datos largos y catálogo con tres fotos reales pendientes. No reducir letra para forzar encaje. |
| UI-L.03 | Clientes pendientes | IMPLEMENTADO SIN VERIFICAR | V01 Clientes a los cuatro tamaños, datos demo y logo. | Composición inspeccionada, falta foto real y varias altas nuevas con textos largos/estado actualizado. |
| UI-L.04 | Lista de espera | IMPLEMENTADO SIN VERIFICAR | V01 a cuatro tamaños y V02 con metre a 390×844: una persona y selector de mesa. | Verificar cola real, nombres largos, eliminación y todos los estados. |
| UI-L.05 | Mesas | IMPLEMENTADO SIN VERIFICAR | V01 Mesas a cuatro tamaños; paginación y QR localizado. | Faltan fotos reales, distintos tipos y consistencia de ocupación durante otras sesiones. |
| UI-L.06 | Pedidos de cocina | PARCIAL | V01 cuatro tamaños; V02 390×844 con cocinero: mesa, fecha y un ítem de cocina. | Tarjeta de muestra completa; la colección multi-mesa no existe. Crear lista agrupada y probar más de un pedido. |
| UI-L.07 | Pedidos de bar | PARCIAL | V01 cuatro tamaños; V02 390×844 cantinero, solo bebida visible. | Separación de sector en muestra; no acredita listado multi-mesa completo. |
| UI-L.08 | Pedidos de mozos | PARCIAL | V01 cuatro tamaños con acceso dueño a Pedidos; TPL:1253. | Pedido único y controles presentes; falta recorrido con mozo real y colección de mesas. |
| UI-L.09 | Contenedor de imagen en carta | CUMPLE | V01 Menú cuatro tamaños: una imagen centrada por tarjeta, sin fracción de imagen vecina. | Sin corrección necesaria en esta composición de muestra; cantidad/persistencia de fotos se cuenta en 02/03/11. |
| UI-D.01 | Importe acumulado del menú | NO CUMPLE | 320×568: cart-bar y=470,47,h=161,39, termina en 631,86; total/acción fuera del área útil. CSS:1057 position:static. | Mover resumen a región persistente respetando footer y áreas seguras. |
| UI-D.02 | Total final y cuenta | PARCIAL | V02 cuenta en 320×568,360×640,390×844,768×1024. Total 24px, peso 800; en 320 acción inferior cortada. | Mantener jerarquía del total; hacer pago accesible sin recorte por contenedor. |
| UI-D.03 | Alta de producto | IMPLEMENTADO SIN VERIFICAR | 390×844: el selector de imagen ocupa gran parte de la vista y confirmar queda fuera de la vista inicial; V01. Esto no demuestra que sea inaccesible mediante scroll. | Verificar acceso a todos los campos y confirmación mediante scroll, foco y teclado físico antes de declarar un fallo de distribución. |
| UI-D.04 | Ingreso y errores | CUMPLE | V01 ingreso/vacío cuatro tamaños; V02 mensajes Completá el correo y Completá la clave a 390×844. Sin overflow horizontal del documento. | Sin corrección necesaria para la distribución de esos estados probados; teclado real no acreditado. |
| UI-D.05 | Navegación horizontal global | CUMPLE | 88 estados medidos: scrollWidth del documento no excedió viewport en 320,360,390,768. | Sin corrección necesaria para ese control; no descarta recortes verticales o internos. |
| UI-D.06 | Altura reducida y teclado | PARCIAL | V02 390×480 simula menos espacio; no se abrió teclado Android ni se midieron barras nativas. | Probar teclado real, safe areas y foco de último campo. Reducción de viewport solo cubre una aproximación. |
| UI-D.07 | Zoom y textos variables | NO VERIFICABLE | No se ejecutó zoom real 200 %, lector de pantalla ni registros largos de todas las vistas. | Probar esos casos tras corregir alturas/overflow; no certificar accesibilidad completa. |
| UI-D.08 | Carruseles de tres fotos y reemplazo | NO CUMPLE | CMP:412: un solo slot; V01 alta de producto muestra selector único. | Completar tres posiciones; verificar reemplazo, persistencia y proporción de cada imagen. |
| UI-C.01 | Ingreso, etiquetas normales | CUMPLE | 390×844, Correo electrónico/Clave: #003592 sobre #FBF1D5, 13px/500, 9,6891:1 ≥4,5. | Sin corrección necesaria para esas etiquetas medidas. |
| UI-C.02 | Ingreso, texto de campos | CUMPLE | 390×844, input: #003592 sobre #F8FBFD, 15px/400, 10,5017:1 ≥4,5. | Sin corrección necesaria para texto normal de campo. |
| UI-C.03 | Ingreso, errores | CUMPLE | 390×844, errores vacíos: #A84402 sobre #FBF1D5, 12px/400, 5,3382:1 ≥4,5. | Sin corrección necesaria en mensajes medidos. |
| UI-C.04 | Carta, precio normal | CUMPLE | 390×844: #003592 sobre #F8FBFD, 13,12px/800, 10,5017:1 ≥4,5. | Sin corrección necesaria en precio medido. |
| UI-C.05 | Carta, metadatos | CUMPLE | 390×844, plato/minutos: #984000 sobre #F8FBFD, 9,92px/400, 6,5859:1 ≥4,5. | Sin corrección necesaria en contraste; tamaño pequeño puede mejorarse sin llamarlo fallo de contraste. |
| UI-C.06 | Carrito, etiqueta importe | CUMPLE | 390×844: #984000 sobre #FCEDBB, 9,92px/400, 5,8565:1 ≥4,5. | Sin corrección necesaria en color; visibilidad se evalúa en UI-D.01. |
| UI-C.07 | Cuenta, total grande | CUMPLE | 390×844: #006AE7 sobre #F8FBFD, 24px/800, 4,7938:1 ≥3. | Sin corrección necesaria para contraste de total grande. |
| UI-C.08 | Cuenta, precio unitario | CUMPLE | 390×844: #A84402 sobre #F8FBFD, 10,4px/400, 5,7859:1 ≥4,5. | Sin corrección necesaria en contraste; tamaño puede mejorarse como recomendación. |
| UI-C.09 | Personal, nombres | CUMPLE | 390×844: #003592 sobre #F8FBFD, 16px/600, 10,5017:1 ≥4,5. | Sin corrección necesaria para texto muestreado. |
| UI-C.10 | Contornos, focos, íconos y gráficos necesarios | NO VERIFICABLE | No se completó cálculo de todos los colores adyacentes, gradientes ni estados de foco/selección. | Medir 3:1 donde aplique 1.4.11; distinguir bordes decorativos y controles deshabilitados. |
| UI-C.11 | Resto de estados y pantallas | NO VERIFICABLE | AXE sin violaciones en instantáneas no cubre todos los errores de servidor, estados de pedido, fondos decorados y estados interactivos. | Completar matriz de estados reales antes de afirmar WCAG AA global. |
| UI-C.12 | Ingreso, placeholders de correo y clave | CUMPLE | 390×844: #526582 sobre #F8FBFD, opacidad 1; 5,7045:1 ≥4,5. | Sin corrección necesaria para ambos placeholders medidos. |
| UI-C.13 | Botón Ingresar, estado habilitado | CUMPLE | 390×844: #F8FBFD sobre #003592, 15px/600; 10,5017:1 ≥4,5. Fondo resuelto a través del slot y shadow DOM. | Sin corrección necesaria para texto del botón medido. |
| UI-C.14 | Estado Confirmado en cocina | CUMPLE | 390×844: #984000, fondo efectivo aproximado #F7E5CC tras composición alfa, 10,4px/700; relación sin redondeo 5,557965:1 ≥4,5. | Sin corrección necesaria para este estado; pendientes los demás estados reales. |


**Métrica visual separada:** 15 / 31 = 48,4 % CUMPLE; cobertura de ejecución 28 / 31 = 90,3 %. Conteos: CUMPLE: 15; IMPLEMENTADO SIN VERIFICAR: 4; PARCIAL: 6; NO CUMPLE: 3; NO IMPLEMENTADO: 0; NO VERIFICABLE: 3. No se suma a la métrica funcional porque hay pantallas compartidas y referencias de contexto.

**Conflicto de composición literal:** UI-L exige unidades completas en reposo, pero textos largos/zoom necesitan desplazamiento. La propuesta es paginar por unidad compleja y permitir scroll accesible dentro de esa unidad, con encabezado/resumen sin superposición. No reducir texto ni ocultar información para que una captura parezca correcta. Una tarjeta parcialmente visible durante un scroll intermedio no se confundió con el recorte inicial observado.

## E. Registros transversales

### E1. Pruebas realmente ejecutadas

Se creó una copia temporal mediante git archive del HEAD fuera del repositorio y una unión a node_modules existente. El build y todos sus prebuilds corrieron en esa copia, de modo que generar-entorno/generar-ilustraciones no tocaron los archivos originales. No se instalaron dependencias en el proyecto. Playwright, axe-core y PGlite se instalaron únicamente en el directorio temporal. La configuración demo tenía claves de Supabase vacías y el navegador bloqueó solicitudes externas.

| Código | Comando o ejecución | Resultado | Alcance y límite |
| --- | --- | --- | --- |
| B01 | npm run build, copia del commit | Exit 0; initial total 811,28 kB; salida dist/tumbo | Compila, no prueba flujos ni APK. Prebuild ejecutado en copia temporal. |
| U01 | npm test -- --watch=false, copia sin pruebas adicionales | 19 archivos, 173 tests aprobados | Vitest/JSDOM; servicios y pruebas de componente mayormente mock. Avisos de sourcemap native-audio y CSS no parseado. No se asume layout por JSDOM. |
| U02 | npm test -- --watch=false, copia con auditoria-temporal.spec.ts | 20 archivos, 191 tests aprobados: 18 casos adicionales | Caracterizaciones confirman conductas actuales, incluyendo fallos. No son 191 criterios funcionales aprobados. Archivo temporal fuera del repositorio. |
| SQL | node sql.cjs en herramienta temporal | 13 casos SQL ejecutados en PGlite; resultados abajo | No hay red ni base remota. Rollback tras cada caso; setup en memoria. Grants/auth simulados. |
| V01 | node visual.cjs, Playwright + Chrome contra copia compilada | 22 estados × 4 dimensiones; sin overflow horizontal documental | Inspección automatizada y capturas; no dispositivos físicos. Estados: ingreso, vacío, inicio, 15 secciones, 4 altas. |
| V02 | node flows.cjs, cuatro BrowserContexts | Roles independientes, cantidad de carrito, premio simulado, cuenta, logout/login y herencia de carrito | Contextos no sincronizados porque backend demo es memoria. Se midió cuenta en cuatro tamaños y menú a altura reducida. |
| MCP | resources/list para supabase, dos intentos | Falló renovación OAuth antes de leer recursos | No se pudieron ejecutar consultas remotas. No se considera prueba de ausencia de tablas o servicios externos. |
| C01 | rg de emisores y suscripciones sobre src, supabase, package.json y documentos | Dos Edge Functions administrativas; sin emisor push/correo ni registro de token conectado | Ausencia en este repositorio. No descarta servicio externo no accesible. |
| C02 | rg de recibido_en, signUp, signInAnonymously, tresFotosRequeridas, publicación Realtime y uso del lector | Columna solo en modelos/servicio, alta cliente mock, sin ingreso anónimo, validador de fotos sin uso, sin SQL de publicación | Resultados de búsqueda contrastados con llamadas usadas; comentarios/README no cuentan como implementación. |


**Pruebas temporales AUD:** se crearon controles/componentes con TestBed y los mismos servicios demo; cada caso partió de un contexto de test limpio. AUD04/05 tienen tres casos cada uno, AUD08/09 tienen dos: 18 en total.

| Código | Entrada/acción | Observado | IDs principales |
| --- | --- | --- | --- |
| AUD01 | clienteForm: nombres y apellidos con espacios; DNI alfabético de siete caracteres; correo de ejemplo sintético | Formulario válido. Confirma defecto de validación. | 05.03–05.05 |
| AUD02 | productoForm válido con exactamente un objeto File simulado | Formulario válido con una foto, no tres. | 02.06,03.06 |
| AUD03 | Agregar mismo producto dos veces y quitar una | Cantidad 2→1; total precio×cantidad; tiempo máximo sin multiplicar cantidad. | 12.01–12.05,13.08 |
| AUD04 | Primera victoria por botón/servicio en cada uno de los tres juegos | Descuentos 10,15,20 respectivamente en instancias demo separadas. | 15.01–15.03 |
| AUD05 | Primera derrota y luego victoria, por cada juego | Descuento 0 en las tres instancias demo. No hay motor jugable. | 15.04–15.06 |
| AUD06 | Carrito con un producto y premio 10; SesionService.cerrar() | Carrito y descuento permanecen en servicio. V02 confirma herencia visible tras logout/login en misma SPA. | 15.10,22.07 |
| AUD07 | Enviar producto y rechazar pedido | Pedido rechazado conserva ítem, carrito permanece vacío; no se precarga para editar. | 13.04–13.07 |
| AUD08 | Pedido mixto, terminar cocina→bar y bar→cocina; repetir última marca | Parcial hasta segundo sector, luego listo. Repetir genera una notificación local adicional. | 18.03,18.04,18.10 |
| AUD09 | Pedido solo cocina / solo bar, terminar ese sector | Listo sin esperar sector ausente. | 18.05,18.06 |
| AUD10 | Enviar pedido sin premio, confirmar, ganar memoria, elegir 0 %, generar cuenta | descuento signal=10, descuento cuenta=0. Premio posterior no llega a cuenta demo. | 15.12,21.10 |
| AUD11 | Generar con propina null y después con 0 | Null rechazado, 0 aceptado. | 21.04,21.05 |
| AUD12 | Encuestar, generar/pagar/confirmar cuenta, intentar encuestar de nuevo | Flag de encuesta sigue verdadero. No existe reinicio por nueva estadía en demo. | 20.08 |


**Alcance de U01 sobre validadores:** se ejecutaron pruebas de nombres (tildes, ñ, espacios, longitudes, apóstrofo/guion), correo, DNI, CUIL, coincidencia de claves, parseo de DNI y servicio QR. Algunas pruebas comparan regex de TS y SQL como cadenas; **eso no es ejecución de un CHECK PostgreSQL**. Para comprobar mensajes de formulario se ejecutó también envío vacío de login en navegador. Los casos no especificados abajo permanecen pendientes.

### E2. Reproducciones SQL locales y autorización

Precondición reproducible: cargar las diez migraciones en base desechable; crear roles anon y authenticated sin BYPASSRLS; auth.uid() lee request.jwt.claim.sub. Las tablas auth.users/storage se sustituyen por mínimas tablas compatibles y pgcrypto se omite porque se usa gen_random_uuid nativo. Crear identidades sintéticas A y B (clientes aprobados), M (mozo), T (metre) y K (cocinero); dos mesas libres; producto X de cocina precio 100; estadía S de A; pedidos P pendiente_confirmacion, Q borrador y R entregado de S; juego J del 10 %. Se usa nombre/apellido “Persona Prueba” y direcciones de example.invalid; no se depende de datos personales.

Cada caso corre dentro de BEGIN; SET LOCAL ROLE authenticated; configurar auth.uid() al actor; ejecutar consulta; capturar error/filas; ROLLBACK. Reemplazar A/B/S/P/Q/R/X/J por UUID sintéticos del fixture. Estos pasos **solo se ejecutaron en memoria**, no deben copiarse a producción para probar.

| Caso | Actor y consulta equivalente | Esperado por consigna | Observado local | Corrección / aceptación |
| --- | --- | --- | --- | --- |
| SQL01 | A: INSERT pedido_items(pedido_id,producto_id,cantidad,precio_unitario,sector) VALUES(P,X,1,100,cocina) | Envío de cliente guarda todos los ítems y espera mozo | 42501: new row violates row-level security policy for pedido_items | 12.06. Crear borrador, ítems y transición atómica; test sin cabeceras huérfanas. |
| SQL02 | B: INSERT sesiones_mesa(mesa_id,cliente_id) VALUES(mesa_libre,B) | Denegar: no hay espera ni asignación | Aceptado, estado activa | 09.10/10.04/22.10. RPC de asignación del metre verifica espera y disponibilidad. |
| SQL03 | B: INSERT sesiones_mesa(mesa_id,cliente_id) VALUES(mesa_de_S,B) | Denegar segunda estadía activa | 23505 idx_sesion_activa_por_mesa | Índice local correcto; verificar despliegue y concurrencia real. No se probó carrera con dos conexiones PGlite. |
| SQL04 | A: INSERT pedido_items VALUES(Q,X,1,0.01,bar) en columnas anteriores | Precio debe derivarse de catálogo; sector cocina | Aceptó precio 0.01 y corrigió sector a cocina | 21.14. Asignar siempre precio de fuente confiable; comprobar manipulación de precio y sector por separado. |
| SQL05 | B: INSERT encuestas(sesion_mesa_id,cliente_id) VALUES(S,B) | Denegar estadía de A y etapa no habilitada | Aceptado | 20.16. Comparar cliente de sesión y estado permitido dentro de policy/RPC. |
| SQL06 | A: INSERT partidas_juego(juego_id,sesion_mesa_id,cliente_id,intento,gano,descuento_otorgado) VALUES(J,S,A,2,false,99) | Sin premio por derrota/segundo intento | Aceptó 99.00 | 15.04–15.07. Premio calculado por servidor, no valor libre del cliente. |
| SQL07 | A: INSERT cuentas(S,nivel=malo,propina_pct=0,total=0); UPDATE cuentas SET estado=confirmada WHERE sesion_mesa_id=S | Cliente no confirma; exige pago previo y mozo | Aceptado; SELECT sesiones_mesa muestra cerrada | 22.01. Transición privilegiada de mozo de pagada a confirmada; verificar mesa no liberada antes. |
| SQL08 | A: UPDATE pedidos SET recibido_en=now() WHERE id=R | Confirmación de recepción persistente | 42703: columna recibido_en no existe | 19.02. Migración más permiso específico de recepción; comprobar también cero filas de RLS. |
| SQL09 | A: UPDATE usuarios SET perfil=dueno WHERE id=A | Denegar escalada propia | 42501: No podés cambiar tu propio perfil | Trigger PROTECT local funcionó; verificar versión remota. No garantiza seguridad de todas las altas/INSERT. |
| SQL10 | A: INSERT encuestas(S,A); repetir INSERT encuestas(S,A) | Rechazar segunda encuesta de misma estadía | 23505 encuestas_sesion_mesa_id_key | Índice local correcto; UI debe reconocer conflicto y permitir estadía nueva. |
| SQL11 | K: UPDATE pedidos SET estado=confirmado WHERE id=P | Denegar: cocinero no reemplaza al mozo | Aceptado, confirmado | 14.01. Sustituir permiso genérico es_staff por transición/actor concretos. |
| SQL12 | A: INSERT cuentas(sesion_mesa_id) VALUES(S) | Denegar generación sin seleccionar propina | Aceptado con nivel_propina null | 21.04. Exigir selección incluso en pendiente; cero es válido y distinto de null. |
| SQL13 | B: SELECT * FROM calcular_cuenta(S) | No consultar cuenta de otra estadía | Función devolvió subtotal 0 y resto 0, sin denegar | Revisar ownership dentro de SECURITY DEFINER y grants EXECUTE; con fixture sin ítems confirmó acceso, no se midió exposición de datos reales. |


PGlite no reemplaza prueba de PostgREST/Auth con JWT real. Los errores SQL01/08 demuestran incompatibilidad del código con el esquema versionado. Los permisos demasiado amplios se demostraron bajo los grants del fixture; si el servidor tiene una migración externa que los corrige, hay que recuperarla/versionarla y repetir. La ausencia de recibido_en en SQL frente a su presencia en TYPES es evidencia concreta de desalineación, **no prueba de que la columna falte remotamente**.

### E3. Registro por campo

Los límites siguientes son **política implementada**, no límites inventados de la consigna. “Pendiente” significa no ejecutado en esa capa/caso. Para todos los campos con implementación, falta prueba de endpoint con null, objeto/array en vez de escalar y límites sobrepasados cuando no se indique ejecución concreta. Los mensajes de servidor deben mostrarse sin éxito falso; mensajeDeError de EDGE y mensajes.ts son las fuentes localizadas, no recepción probada.

| ID funcional | Campo | Regla esperada/política actual | Interfaz | Capa confiable | Casos ejecutados y pendientes | Mensaje y acción concreta |
| --- | --- | --- | --- | --- | --- | --- |
| 01.13 | Nombres | 2–50; Unicode, compuestos; no vacío/espacios | validadoresDeNombre | CHECK trim/largo y formato, Edge trim | U01: tildes, ñ, 1/2/50/51, números/símbolos/espacios; endpoint pendiente | mensajes.ts traduce requerido/largo/letras; no verificar solo maxlength |
| 01.14 | Apellidos | 2–50; compuestos, guion/apóstrofo | validadoresDeNombre | CHECK formato/largo | U01 apóstrofo/guion y conjunto nombre; endpoint pendiente | Mensaje por control; probar apellido vacío y error servidor |
| 01.15 | DNI | 7–8 dígitos; normalización de puntos/espacios | dniValido | CHECK regex y UNIQUE | U01 formato; tipos JSON y duplicado endpoint pendientes | No aceptar letras como dígitos; mensaje de DNI localizado |
| 01.16 | CUIL | 11 dígitos, formato, verificador y coincidencia DNI | cuilValido+cuilConDigitoValido+grupo | Solo regex/CUIL no nulo para empleados | U01 verificador y vínculo; backend acepta formato sin checksum por inspección | Rechazar dígito o DNI discordante también en servidor |
| 01.17 | Correo | Requerido, formato, 5–80; normalización | correoValido+limites | CHECK formato/largo, UNIQUE; Edge preconsulta | U01 inválidos/formato; endpoint pendiente | mensajes.ts correo válido; Edge duplicado; no publicar direcciones |
| 01.18 | Contraseña | 6–72 según UI; confirmar igualdad | required, longitud; repetirClave | Auth valida según configuración remota no leída; Edge solo requerido | U01 coincidencia; probar vacío/espacios/5/6/72/73 y tipos en endpoint | Mensaje de mínimo/máximo y coincidencia; no registrar contraseña |
| 01.19 | Perfil | Enum de empleado, caso obligatorio cocinero | required y selector | Edge enum metre/mozo/cocinero/cantinero y gerencia aprobada | Inspección; inválido/rol manipulados pendientes | Edge indica lista admitida y 403 para no gerencia |
| 01.20 | Foto | Requerida, cámara real, archivo válido | fotoRequerida solo fuera de demo, truthiness | foto_url nullable; subida Storage posterior | Permisos/cancelación/archivo vacío/MIME falso/subida fallida pendientes | CAM y OPS devuelven error o aviso parcial; no decir alta completa si falta foto |
| 02.10 | Plato: nombre | 2–60; no espacios solos | required/sinEspacios/conLimite | CHECK trim/largo; unique(tipo,nombre) | U01 normalización/duplicados del servicio mock; límites del flujo específico pendientes | No confundir duplicados con requisito de aparecer en carta |
| 02.11 | Plato: descripción | 10–300; no vacío/espacios | required/sinEspacios/conLimite | CHECK trim/largo | Casos 9/10/300/301 y Unicode pendientes por flujo | mensajeCampo requerido/largo; probar visualización |
| 02.12 | Plato: minutos | Entero positivo; UI 1–600 | enteroValido+min/max | integer y >0, sin máximo600 | Negativo/cero/1/600/601/1.5/NaN pendientes | Distinguir entero de límite; 600 es decisión local |
| 02.13 | Plato: precio | UI ≥1, ≤2 decimales, <100000000 | precioValido+min1 | numeric(10,2), >0; SQL redondea fracciones extra | Límites/0.01/1.001/exponente pendientes | Alinear 0.01 válido BD vs UI y explicar formato monetario |
| 02.14 | Plato: tipo/sector | Cocinero→plato/cocina; cantinero→bebida/bar | Derivado por rol; required | Enum+sector_coherente+policy alta | SQL04 prueba sector ítem corregido; alta de producto adulterada pendiente | Error de permisos no debe anunciar éxito |
| 02.15 | Plato: fotos | Exactamente 3; archivos válidos y reemplazables | required de array, solo slot0; tresFotosRequeridas no conectado | orden1–3+unique; no exige 3 filas ni MIME/tamaño en bucket | AUD02 una foto aceptada; 0/2/4, extensión falsa, fallo/reemplazo real pendientes | Completar validación numérica, binario y recuperación; duplicar prueba para bebida |
| 03.10 | Bebida: nombre | 2–60; no espacios solos | required/sinEspacios/conLimite | CHECK trim/largo; unique(tipo,nombre) | U01 normalización/duplicados del servicio mock; límites del flujo específico pendientes | No confundir duplicados con requisito de aparecer en carta |
| 03.11 | Bebida: descripción | 10–300; no vacío/espacios | required/sinEspacios/conLimite | CHECK trim/largo | Casos 9/10/300/301 y Unicode pendientes por flujo | mensajeCampo requerido/largo; probar visualización |
| 03.12 | Bebida: minutos | Entero positivo; UI 1–600 | enteroValido+min/max | integer y >0, sin máximo600 | Negativo/cero/1/600/601/1.5/NaN pendientes | Distinguir entero de límite; 600 es decisión local |
| 03.13 | Bebida: precio | UI ≥1, ≤2 decimales, <100000000 | precioValido+min1 | numeric(10,2), >0; SQL redondea fracciones extra | Límites/0.01/1.001/exponente pendientes | Alinear 0.01 válido BD vs UI y explicar formato monetario |
| 03.14 | Bebida: tipo/sector | Cocinero→plato/cocina; cantinero→bebida/bar | Derivado por rol; required | Enum+sector_coherente+policy alta | SQL04 prueba sector ítem corregido; alta de producto adulterada pendiente | Error de permisos no debe anunciar éxito |
| 03.15 | Bebida: fotos | Exactamente 3; archivos válidos y reemplazables | required de array, solo slot0; tresFotosRequeridas no conectado | orden1–3+unique; no exige 3 filas ni MIME/tamaño en bucket | AUD02 una foto aceptada; 0/2/4, extensión falsa, fallo/reemplazo real pendientes | Completar validación numérica, binario y recuperación; duplicar prueba para bebida |
| 04.04 | Mesa: número | Entero 1–999 según UI; único | required/entero/min/max | integer UNIQUE, sin CHECK >0 | U01 duplicado en mock; 0/negativo/fracción/tipo API pendientes | Servicio mensaje de mesa repetida; alineación de rango servidor pendiente |
| 04.05 | Mesa: comensales | Entero 1–20 | required/entero/min/max | integer CHECK1–20 | 0,21,1.5,null y tipo pendientes | mensajeCampo entero/rango, comprobar render |
| 04.06 | Mesa: tipo | VIP, estándar, movilidad reducida | required+selector | Enum; traductor de tipo | Enum inválido/nulo pendiente | No mapear silenciosamente valor desconocido a movilidad reducida |
| 04.07 | Mesa: disponibilidad | Libre por defecto; transición coherente | No se pide al alta; toggle luego | default libre; falta verificación estadía activa | Inspección, carrera y toggle con estadía pendientes | No permitir liberar por toggle una mesa en uso |
| 04.09 | Mesa: foto | Requerida en alta y archivo válido | fotoRequerida, opcional al editar | foto_url nullable, Storage posterior | Archivo/cancelación/subida/reintento pendientes | OPS devuelve aviso parcial; mostrar y permitir reparación |
| 05.03 | Cliente: nombres | Misma política de nombre necesaria | Solo required | Alta mock, no llamada confiable | AUD01 espacios aceptados | Validadores comunes y mensajes por campo faltantes |
| 05.04 | Cliente: apellidos | Nombre compuesto/Unicode, no vacío | Solo required | Alta mock | AUD01 espacios aceptados | Rechazar con mensaje asociado al control |
| 05.05 | Cliente: DNI | Formato 7–8 dígitos | required/minLength7 | Alta mock; CHECK de usuarios no se alcanza | AUD01 abcdefg aceptado | Usar dniValido; probar tildes en nombre no en DNI |
| 05.06 | Cliente: correo | Formato y límite consistente | required/Validators.email sin límite80 | Alta mock | Vacío y formato por inspección; extremos/endpoint pendientes | Integrar con reglas comunes y error claro |
| 05.07 | Cliente: contraseña | Requerida para Auth; política definida | Campo ausente | No signUp conectado | No ejecutable porque falta campo | Crear campo y confirmación accesibles |
| 05.08–05.09 | Cliente: foto | Solo cámara, requerida, válida | Control ausente | Mock fija logo | No ejecutable con implementación actual | Implementar cámara, preview, persistencia y errores |
| 09.01 | Anónimo: nombre | Solo nombre requerido sin datos extra | trim y comprobación no vacío | anotarEnEspera ignora nombre y usa usuario actual | Inspección, alta anónima pendiente | Nombre no debe perderse al crear identidad anónima |
| 09.02 | Anónimo: foto | Foto requerida; no se inventa prohibición de galería | Ausente | Logo mock | No ejecutable | Crear selector/captura y persistencia |
| 20.03 | Encuesta: satisfacción | Escala de UI1–5 | required/min1 sin max5 | No se guardan respuestas | Inspección; fuera de rango pendiente | Agregar validación y guardar valor |
| 20.04 | Encuesta: comentario | No espacios; política de largo a definir | required | No se guarda | Inspección; espacios y límites pendientes | Validar y asociar mensaje |
| 20.05 | Encuesta: recomendación | Booleano; false debe ser válido | Toggle con required | No se guarda | Inspección; false/petición adulterada pendiente | Aceptar ambas opiniones, rechazar tipos inválidos |

La cámara web abre un input de archivos con accept, que no valida por sí solo el binario. comprimirImagen decodifica y convierte a WebP; falta prueba con archivo corrupto, archivo no imagen renombrado, gran tamaño y fallo de red. Storage tiene buckets públicos y políticas insert/update para **todo authenticated**, sin propiedad de ruta ni rol específico (STORAGE:24–38). Esto debe verificarse remotamente y limitarse; no se descargaron fotos privadas para esta auditoría.

El lector solicita PDF417 y QR, parsea variantes de DNI y distingue cancelado/otro-codigo/error. En navegador **inventa una persona**: no es una lectura real. El parser calcula CUIL faltante y el componente propone correo no contenido en DNI; esto contradice el pedido de autocompletar únicamente la información disponible. Los códigos PNG de prueba y los tests del parser no demuestran lectura óptica ni permiso de cámara en teléfono.

### E4. Eventos y comunicaciones

**COM C01:** búsquedas de PushNotifications, FirebaseMessaging, registro de dispositivos_push, sendEmail, Resend, SMTP, nodemailer y triggers; lectura de package.json, src/app/core/services, supabase/functions y todas las migraciones. Solo aparecen definición/borrado del token, tablas de bitácora, documentación de arquitectura y notificar() del mock. No se encontró registro de tokens conectado ni emisor de push/correo en este alcance. No se inspeccionó otro repositorio. Las búsquedas de Realtime localizaron suscripciones a mesas, pedidos, pedido_items, lista_espera y mensajes; faltan usuarios, sesiones_mesa, cuentas, encuestas y partidas. No se encontró migración de publicación Realtime; configuración remota NO VERIFICABLE.

En todos los eventos siguientes: **destinatarios observados en dispositivos: ninguno verificado**; recepción push primer/segundo plano y app cerrada: pendiente. Los perfiles de un array mock son destinatarios declarados, no dispositivos notificados. Ningún evento se probó enviando a personas reales.

| Origen | Evento | Disparador | Destinatarios esperados | Mecanismo real localizado | Datos y diferencia |
| --- | --- | --- | --- | --- | --- |
| 06.09–06.10 | Cliente pendiente | Alta de cliente | Dueño + supervisor | MOCK:185 notificar; OPS:804 mock incondicional | Nombre/estado en texto local; backend debe transportar id de cliente mínimo |
| 09.08 | Ingreso a espera | Anotarse | Metre | MOCK:219; OPS:1040 insert sin emisor | Id de espera/cliente y fecha; solo texto demo observado |
| 10.02 | Asignación | Metre asigna | Cliente asignado | MOCK:240; OPS:1054 sin emisor | Mesa/estadía; demo notifica rol registrado, no usuario puntual |
| 11.15 | Consulta | Cliente envía mensaje | Todos los mozos, D1 y D4 | OPS:1161 insert; MOCK:345 solo mensajes | Id conversación/mesa/autor/hora; push no implementada |
| 11.19 | Respuesta | Mozo responde | Cliente de esa mesa | CMP:1612 manda propio=true; sin emisor | Id conversación y remitente; corregir tipo respuesta y aislamiento |
| 12.09 | Pedido enviado | Cliente termina pedido | Mozo | MOCK:302; OPS:1115 falla ítems | Id pedido/mesa/estado; no usar cuerpo libre como única fuente |
| 13.03 | Pedido rechazado | Mozo rechaza | Cliente del pedido | MOCK:307; OPS:1134 sin emisor | Motivo y versión; solo aviso de memoria |
| 13.10 | Pedido reenviado | Cliente modifica | Mozo | Reutiliza enviarPedido; sin evento remoto | Pedido y versión; deduplicar reenvíos |
| 14.05 | Derivación cocina | Mozo confirma | Cocineros intervinientes | MOCK:312; OPS:1137 update | Ítems/cantidades o identificador seguro; no envío real |
| 14.06 | Derivación bar | Mozo confirma | Cantineros intervinientes | Mismo evento local para ambos sectores | Filtrar sectores realmente presentes |
| 18.08 | Pedido completo | Último sector termina | Mozo | MOCK:326; FUN:189 solo cambia estado | Id pedido listo; AUD08 muestra duplicados locales |
| 21.02 | Solicitud de cuenta | Cliente pide cuenta | Mozo | MOCK:397 al generar, incluye otros roles; OPS:1237 | Id cuenta/mesa; acordar si solicitar y generar son eventos distintos |
| 21.19–21.21 | Pago simulado | Cliente paga | Mozo + dueño + supervisor | MOCK:405; OPS:1275 sin emisor | Id cuenta y estado pagada; no liberar aún |
| 22.03–22.04 | Confirmación de pago | Mozo confirma | Dueño + supervisor | MOCK:422; trigger solo libera | Id cuenta, cierre/mesa; una notificación por transición |

**Correos 07/08:** plantilla creada: no localizada; disparador automático: no localizado; remitente: no verificable; aceptación del proveedor: no verificada; recepción: no verificada. Las filas correos_enviados no acreditan envío. Auth email_confirm:true en crear-empleado evita confirmación de identidad para ese alta; no es correo de aceptación de cliente por gerencia. No se evaluaron diseños de correos inexistentes ni se tomó el logo de la app como prueba del logo en un email.

### E5. Roles, estados y consistencia

| Entidad/transición | Actor esperado | Dónde se valida actualmente | Hallazgo y prueba de aceptación |
| --- | --- | --- | --- |
| Registro pendiente→aprobado/rechazado | Dueño/supervisor | CMP gestiona + usuarios_actualizar + trigger PROTECT | Cambiar estado no dispara correo ni recarga lista; probar ambos perfiles y rechazo con sesión ya abierta. |
| Anónimo→aprobado | Alta anónima | manejar_usuario_nuevo lo contempla | No hay signInAnonymously conectado; implementar sin pedir DNI/correo/clave. |
| Espera→asignado/eliminado | Metre; baja propia según política | RLS espera_actualizar también permite cliente | Cliente puede cambiar columnas de asignación de su fila; limitar columnas/transiciones y resolver RPC. |
| Mesa libre→estadía activa | Metre tras espera | Tres peticiones; sesiones_crear permite propietario | SQL02: autoasignación; SQL03: índice sí bloquea segunda estadía. Operación atómica y carrera remota pendientes. |
| Mesa ocupada→libre manual | Gerencia con coherencia de estadía | RLS gerencia, toggle sin condición | No proteger solo listado. Rechazar si existe estadía abierta. |
| Borrador→pendiente_confirmacion | Cliente propietario | Adaptador inserta directamente pendiente | SQL01: ítems rechazados; guardado/transición atómicos. |
| Pendiente→rechazado/confirmado | Mozo | RLS es_staff genérico | SQL11: cocinero confirma; imponer actor y estado previo. |
| Rechazado→reenviado | Cliente propietario | Nuevo pedido + carrito vacío | AUD07; restaurar versión, evitar duplicados y cambio de precio/sector. |
| Ítems pendientes→preparación/listos | Cocina/bar respectivos | RLS sector; trigger evalúa todos los ítems | Falta validar pedido confirmado; no permitir marcar antes de confirmación ni después de cierre. |
| Listo→entregado | Mozo | Botón estado listo; servidor staff genérico | Aplicar transición del lado confiable y comprobar todos los sectores. |
| Entregado→recepción confirmada | Cliente de mesa | Componente protegido; update recibido_en | Columna falta en migración y RLS de cliente no permite ese estado. SQL08. |
| Estadía→encuesta | Cliente propietario tras habilitación | CHECK único y cliente_id propio solamente | SQL05 inserta en estadía ajena; SQL10 evita duplicado. Agregar propiedad y estado. |
| Partida→descuento | Registrado, victoria elegible | UI calcula, BD solo índice único de premio | SQL06 falsa derrota obtiene99; contar intentos/premio en operación confiable e idempotente. |
| Estadía→cuenta | Cliente tras recepción y propina seleccionada | RPC calcula subtotal; cliente manda números finales | SQL12 null admitido; precio/premio manipulables. Calcular total y nivel en servidor. |
| Cuenta pendiente→pagada | Cliente, simulación | update sin precondición estado | Probar reenvío/porcentajes/cambio de totales tras pagar y denegar alteraciones. |
| Cuenta pagada→confirmada→mesa libre | Mozo; push gerencia | cuentas_actualizar permite propietario; trigger libera | SQL07 cliente confirma sin pago; restringir columnas/transiciones, conservar trigger bajo autorización correcta. |
| Logout/cambio usuario | Usuario activo | SesionService limpia solo usuario; Auth limpia almacenamiento | AUD06/V02 carrito heredado; limpiar estado operativo/canal, no solo credenciales. |


Los índices UNIQUE son protección efectiva local para estadía activa por mesa/cliente, encuesta por estadía y un premio positivo; no prueban que la operación completa sea válida ni atómica. **Concurrencia simultánea** no se ejecutó: PGlite se usó secuencialmente; carreras de asignación, pago, reenvío y encuesta en dos conexiones reales siguen pendientes. Tampoco se confirmó publicación Realtime, recuperación de desconexión ni app cerrada.

### E6. Búsquedas de ausencia y límites

- Cliente registrado: se revisaron rutas, ingreso, clienteForm, registrarCliente y Edge Functions. La ausencia de contraseña/foto/alta Auth conectada es local, no inferida de un README.
- Juegos: se revisaron todos los archivos de features y llamadas jugar; tres tarjetas invocan true/false desde botones. No se localizaron componentes/mecánicas jugables adicionales.
- Lectura QR de restaurante: CodigoQrService genera; el único BarcodeScanner.scan localizado está en LectorDeDni. Los QR de mesa/entrada/propina no tienen lectura conectada. No se confundió PDF417 con QR óptico.
- Gráficos: texto “Datos simulados de semanas 1 a 4”, CSS y constantes del template, sin agregación de respuestas_encuesta. El seed histórico no prueba sincronización del gráfico.
- Supabase remoto: no pudo leerse; no se afirma que todas las migraciones estén aplicadas ni que las tablas bitácora estén vacías. No se accedió a registros personales.
- APK/cámara/push/haptics/sonidos/splash nativos: no se ejecutó APK ni hubo teléfonos físicos. Estos bloqueos no se convierten en ausencia de los plugins instalados.

## F. Recorrido de punta a punta

**Guion reproducible pendiente de integración real.** Precondiciones: proyecto de prueba explícitamente separado de producción, migraciones verificadas, cuatro teléfonos con el mismo APK, cuentas de prueba por rol, buzones de prueba controlados, permisos de cámara/push y códigos impresos autorizados. Reservar dos clientes registrados de prueba para aceptación/rechazo y uno anónimo. No reutilizar registros personales ni enviar notificaciones reales fuera de ese entorno.

Las exploraciones V02 sí usaron cuatro BrowserContexts independientes, pero no siguieron un ciclo distribuido completo porque el backend demo reside en memoria. D1 exploró dueño; D2 registrado y luego anónimo **sin recargar la SPA** para probar herencia; D3 cantinero, logout, cocinero; D4 metre. Los cambios de rol del guion de abajo deben respetarse en la demostración, no fijar un rol único por teléfono.

| Paso/dispositivo y rol | Precondición / acción | Resultado esperado | Resultado observado en esta auditoría | IDs |
| --- | --- | --- | --- | --- |
| F01 · D1 dueño; luego supervisor | Login, alta empleado cocinero con foto y DNI; repetir permisos con ambos | Empleado persistido, campos correctos; otros roles denegados | Solo acceso UI/validadores inspeccionados y U01; alta real/cámara pendiente | 01.01–01.20 |
| F02 · D2 cocinero | Alta plato con 3 fotos, reemplazar segunda, confirmar | 3 imágenes persistidas y plato en carta | Formulario expone 1; AUD02 lo acepta. No alta remota | 02.01–02.15 |
| F03 · D3 cantinero | Alta bebida independiente, 3 fotos y reemplazo | Bebida en carta y solo bar puede crearla | Mismo defecto de 1 foto, camino de bebidas localizado; alta real pendiente | 03.01–03.15 |
| F04 · D4 dueño; repetir supervisor | Alta mesa, comprobar foto, QR, libre y cambiar disponibilidad sin estadía | Mesa/QR correctos, estado consistente | Generación QR cubierta por tests de servicio; cámara/alta real pendientes | 04.01–04.14 |
| F05 · D2 logout cocinero→cliente nuevo; variante metre | Registrar cliente A con cámara y DNI | Cuenta pendiente, sin funciones de cliente aún | No vía pública ni contraseña/foto; método siempre mock | 05.01–05.17 |
| F06 · D1 dueño/supervisor | Recibir alta A y abrir pendientes | Foto/nombres/apellidos, push a ambos roles | Vista demo inspeccionada; push ausente, alta real no disponible | 06.01–06.10 |
| F07 · D1 gerencia; D2 cliente A | Rechazar; abrir correo de prueba; intentar login/acceso directo y JWT previo | Correo de rechazo diseñado y bloqueo completo | No correo; bloqueo login por estado localizado; RLS incompleta. No envío realizado | 07.01–07.14 |
| F08 · D2 registra B; D1 cambia dueño→supervisor con logout | Aprobar B; comparar correo con rechazo; D2 ingresar | Estado aprobado y correo distinguible; login funcional | Cambio de estado localizado sin pruebas remotas; plantillas ausentes | 08.01–08.14 |
| F09 · D3 logout cantinero→anónimo; D4 logout gerencia→metre | Nombre/foto, leer QR ingreso, ver resultados y anotarse | Anónimo aprobado automáticamente, espera actualizada y push metre | Solo acceso rápido demo y PNG; alta/escaneo/push ausentes; gráficos estáticos | 09.01–09.11 |
| F10 · D4 metre | Eliminar una entrada de prueba; conservar B y anónimo | Eliminación individual coherente sin afectar otros | Método update localizado; ejecución distribuida pendiente | 09.09 |
| F11 · D4 metre; D2 B; D3 anónimo | Asignar mesa a B, intentar QR ajeno antes/después del correcto; intentar misma mesa con anónimo | Mensaje mesa correcta, escaneo real y exclusividad | SQL02 autoasignación aceptada y SQL03 doble ocupación bloqueada; falta escáner y prueba simultánea | 10.01–10.09 |
| F12 · D2 B; D1 logout gerencia→mozo; D4 logout metre→mozo | Abrir carta con QR, consultar y responder desde D4 | Carta completa; ambos mozos reciben push; B recibe respuesta con nombre/hora | Carta demo inspeccionada; autor real se reemplaza por Equipo TUMBO; push ausente | 11.01–11.20 |
| F13 · D2 B | Agregar comidas, postres y bebidas con cantidades para mesa; desplazar | Total/tiempo siempre visibles; enviar y consultar estado | Cantidad/total local correctos; 320 recorta resumen; SQL01 impide ítems reales | 12.01–12.10 |
| F14 · D4 mozo; D2 B | Rechazar, editar cantidades/agregar/quitar, reenviar | Versión corregida sin órdenes prematuras y push en ambos sentidos | AUD07 carrito vacío, real inserta pedido nuevo y falla RLS; no push | 13.01–13.11 |
| F15 · D4 mozo; D1 logout mozo→cocinero; D3 logout anónimo→cantinero | Confirmar pedido mixto y verificar cada sector | Ítems correctos, push sectorial, juegos habilitados para B | V02 filtrado demo correcto por rol; SQL11 permite confirmación a cocinero; push ausente | 14.01–14.14,16,17 |
| F16 · D2 B | Tres estadías de prueba separadas: cada juego gana primero; otras pierden y ganan después; repetir tras premio | 10/15/20, no acumulación/reemplazo, libre repetición y persistencia al recargar | AUD04/05 reglas mock; no juegos reales, SQL06 premio adulterado aceptado y AUD10 cuenta sin beneficio | 15.01–15.12 |
| F17 · D1 cocina; D3 bar; D4 mozo; D2 cliente | Cocina primero→bar; luego caso inverso; observar cuatro sesiones | Parcial hasta ambos listos, solo entonces aviso al mozo | AUD08 pasó cálculo mock y detectó aviso local duplicado. Multiusuario remoto pendiente | 18.01–18.04,18.07–18.10 |
| F18 · D1/D3 sectores | Repetir pedido solo cocina y solo bar; reintentar marca | No espera sector ausente ni duplica aviso | AUD09 ambos casos listos; no push real | 18.05–18.06,18.10 |
| F19 · D4 mozo; D2 cliente | Entregar y confirmar recepción; doble clic y falla de red | Solo transición válida, estado recibido y acciones siguientes | U01 protección del componente pasa; SQL08 columna faltante; permisos requieren corrección | 19.01–19.08 |
| F20 · D2 cliente; segunda sesión del mismo cliente en D3 tras logout bar | Encuestar, reenviar, recargar y repetir; después nueva estadía | Una encuesta por estadía; respuestas y resultados persistidos | SQL10 bloquea duplicado, SQL05 acepta estadía ajena; respuestas descartadas; demo no reinicia flag | 20.01–20.16 |
| F21 · D2 cliente; D4 mozo | Solicitar cuenta, intentar sin propina, escanear 0 y otro porcentaje | Push; null bloqueado y 0 válido; total consistente | AUD11 y V02 validan null/0 en UI; SQL12 permite null; selección es click sin lectura | 21.01–21.05 |
| F22 · D2 cliente | Revisar todos los ítems, premio, propina y total; pagar simulado | Cuenta coherente, estado pagada, mesa aún ocupada | V02 muestra cuenta demo precargada de 20.400; no prueba cuenta del carrito recién editado. AUD10 falla beneficio posterior | 21.06–21.18 |
| F23 · D1 logout cocina→dueño; D3 logout cliente→supervisor; D4 mozo | Observar pago y confirmar desde mozo; intentar confirmar desde cliente | Push a mozo/dueño/supervisor al pagar; dueño/supervisor al confirmar | No recepción push; SQL07 cliente confirma sin pago. Caso legítimo remoto pendiente | 21.19–21.21,22.01–22.06 |
| F24 · D2 cliente anterior; D3 logout supervisor→otro cliente; D4 logout mozo→metre | Escanear mesa anterior; nueva espera/asignación para otro; ver encuestas desde ingreso | Sin acceso a estadía cerrada, mesa reasignable, resultados reales | No lector; SQL02 evita espera; V02/AUD06 herencia de carrito; gráficos estáticos | 22.07–22.12 |


En cada cambio real de usuario: cerrar sesión, verificar retorno a ingreso y acceso directo denegado, comprobar ausencia de credenciales previas sin copiarlas al informe, ingresar nuevo perfil y comprobar mesa/carrito/pedido/chat/descuento/encuesta/cuenta y destinatarios push limpios. V02 detectó **carrito 1×producto y total 7.800 heredados** por anónimo tras salir de registrado, sin una recarga. Una recarga ocultaba ese defecto reiniciando todo el mock; por eso no se usó como sustituto de logout.

Pruebas de dinero a realizar después de acordar política: ítems con centavos, múltiples pedidos, descuento antes de propina o la regla que el equipo defina, propina 0/5/10/15/20, redondeo final/intermedio, intento de enviar precio/total/porcentaje distinto, doble pago y doble confirmación. No se impone una fórmula nueva de la consigna; se exige consistencia entre UI, persistencia y decisión documentada.

## G. Correcciones propuestas y bloqueos

### Orden por dependencia y efecto

| Prioridad | IDs y componentes | Cambio concreto propuesto | Prueba para darlo por resuelto |
| --- | --- | --- | --- |
| P0 · 1 | 09.10,10.01–10.09,14.01,19.02,20.16,21.14–21.15,22.01; RLS/FUN/OPER/OPS | Diseñar operaciones confiables para asignar, enviar/rechazar/confirmar, recibir y pagar. Verificar rol, propietario, estado previo, aprobación, precio, premio y propina. Restringir columnas y EXECUTE; no resolver con RLS permisiva. | Repetir SQL01–13 como JWT reales en staging; casos autorizados funcionan, manipulaciones devuelven error sin efectos parciales. |
| P0 · 2 | 12.06–12.08,13.04–13.11; OPS:1103 | Guardar pedido e ítems como unidad; estado borrador antes de envío, preprecio servidor; restaurar rechazado y reenviar misma versión controlada/idempotente. | Crear, rechazar, editar y reenviar desde dos sesiones; cantidades/precios correctos, ningún pedido vacío/duplicado ni ítem prematuro. |
| P0 · 3 | 19.02–19.03; TYPES:377, OPER:54, OPS:1269 | Recuperar/versionar migración recibido_en si existe externamente o diseñar una nueva; dar al cliente solo permiso de confirmar recepción propia en entregado. Comprobar filas afectadas. | Base vacía migrada compila contrato y recepción real; doble clic/estado inválido/otra mesa no alteran datos. |
| P0 · 4 | 05.01–05.17,09.01–09.03; clienteForm, AUTH, Edge | Implementar alta de cliente propia y del metre sin reemplazar sesión de este; contraseña/foto/DNI y aprobación. Conectar Auth anónimo con nombre y foto. | Alta real desde ambos perfiles; pendiente/rechazado no opera ni por API; anónimo sin datos extra ni aprobación. |
| P0 · 5 | 14.09,15.01–15.12,21.10; TPL juegos, partidas_juego, calcular_cuenta | Reemplazar botones de resultado por tres juegos; persistir intentos/premio por estadía; otorgar una sola vez con porcentaje del juego; juego libre posterior no intenta insertar premio nuevo. | Ganar primero/perder primero/ganar después para cada juego; recarga y segundo dispositivo; cuenta usa premio válido sin reemplazo. |
| P0 · 6 | 20.06,20.09–20.12; registrarEncuesta, respuestas_encuesta, gráficos | Guardar cabecera y valores atómicamente, validar pertenencia/etapa; agregar resultados reales a torta/barras/línea y no consumo ajeno a encuesta. | Cambiar respuestas modifica agregado y gráfica correspondiente; segundo envío denegado, nueva estadía habilitada. |
| P0 · 7 | 15.10,22.07; SesionService, OperacionService, DemoRestauranteService | Limpiar signals/carrito/sesiones/cuenta/partidas y suscripciones al cerrar/cambiar usuario; cargar estado actual por estadía sin fallback de sesión ajena. | Repetir logout/login en misma SPA y APK sin recarga: no hereda ningún dato ni destinatario. |
| P1 · 8 | 06.09–06.10 y todos los eventos COM; dispositivos_push/Edge Functions | Crear registro/baja de token por dispositivo, emisor seguro, destinatarios por entidad/rol, idempotencia, manejo de permisos y recepción foreground/background/cerrada. Separarlo de Realtime. | Matriz de E4 completa con evidencia en cuatro teléfonos; no duplicados, no destinatario de sesión anterior. |
| P1 · 9 | 07/08; Edge de resolución, correos_enviados y proveedor | Plantillas de aceptación/rechazo con logo/personalización/tipografía/color/tamaño propios y distintos; remitente empresarial; cola/evento automático y reintentos idempotentes. | Dos correos en casillas de prueba, aceptación del proveedor y recepción, sin acción manual de envío. |
| P1 · 10 | 02.06–02.09,03.06–03.09,11.09; productoForm/Storage | Tres slots, validación exacta de cantidad, archivos, reemplazo y reparación tras fallo; asegurar que catálogo publicado esté completo. | Alta de plato y bebida independientes; reemplazar cada posición, recargar y ver tres fotos en otra sesión. |
| P1 · 11 | 09.04,10.03/10.06,11.01,21.03,22.08/22.11; QR/lector | Lectura efectiva de QR entrada/mesa/propina con tokens; mensaje de mesa asignada; rechazar QR ajeno/estadía cerrada. No sustituir escaneo por click a imagen. | Códigos impresos y cámara real; válidos/ajenos/malformados, cancelación y permiso denegado. |
| P1 · 12 | 11.12–11.19,16.02/16.07,17.02/17.07; OPS cargar/elegirSesion, chat | Cargar colección de pedidos por mesa/sector y seleccionar conversación explícita. Mostrar nombre de autor/mesa/fecha y tipo consulta/respuesta correctos. | Dos mesas, dos mozos y cliente aislado; ninguna respuesta llega a sala equivocada. |
| P1 · 13 | UI-L.01,UI-D.01–UI-D.03,12.04,21.12; SCSS/template | Corregir alturas/overflow y paginación por unidad; resumen y acción siempre alcanzables. Mantener jerarquía y texto legible. | 320/360/390/768, zoom200, teclado abierto, nombres/descripciones largos y estados de error; sin recorte inicial ni superposición. |
| P1 · 14 | 01.09,05.11 y E3; parser/lector/formularios | No poblar correo/CUIL no presente como lectura; unificar validaciones por campo y capa, controlar tipos JSON antes de trim, recuperación de cámara/Storage. | Documento de prueba autorizado, campos ausentes quedan vacíos; matriz de E3 con inválidos y mensajes legibles. |
| P2 | UI-C pendientes y todas las vistas; CSS/semántica | Completar contraste no textual, foco/teclado, lectores, placeholders de restantes formularios y estados de servidor; corregir únicamente fallos medidos. | AXE en todos los estados más revisión manual WCAG AA, sin denominar certificación a una sola corrida. |


### Recomendaciones adicionales, fuera de métricas

- **P2, exposición y Storage:** accesos_rapidos selecciona todas las cuentas aprobadas con correo, no solo una lista de cuentas de demo; es vista con privilegios del propietario. Limitar a cuentas sintéticas expresamente habilitadas para demostración. Fotos de usuarios en bucket público y escritura para cualquier autenticado requieren una decisión de privacidad/propiedad y reglas más específicas. No se inspeccionaron imágenes personales.
- **P2, reproducibilidad:** recuperar diferencias entre esquema real y migraciones, mantener contratos generados coherentes; documentar grants/publicación Realtime y separar entorno demo de staging. Las dependencias Supabase/Angular declaradas con rangos difieren de una política estricta de fijación; lockfile sí está presente.
- **P2, precisión de resultados UI:** asignarMesa trata un objeto Resultado como booleano en CMP:1309; resolverCliente y varias acciones ignoran resultado y anuncian éxito. Corregir cada consumidor para mirar ok y filas afectadas; no generalizar éxito por ausencia de excepción.
- **P3, legibilidad:** aun con buen contraste, etiquetas de 9,92–10,4px son pequeñas. Mejorar tamaño conforme a espacio y pruebas de lectura; no se presentó esto como incumplimiento automático de 1.4.3.
- **P3, estructura:** Operacion agrupa múltiples formularios y flujos; dividir por responsabilidad luego de estabilizar contratos. Esta refactorización no es requisito atómico del enunciado y no mejora el porcentaje por sí sola.

### Decisiones y documentación pendientes

1. Restablecer conexión MCP OAuth y verificar solo lectura de esquema real, grants, funciones/triggers, historial de migraciones, configuración Auth, buckets/policies y publicación Realtime. Autenticación CLI exitosa no demuestra que todas esas lecturas funcionen en esta sesión.
2. Identificar formalmente un proyecto de staging y cuentas/buzones/dispositivos de prueba. Hasta entonces no ejecutar altas, estados, envíos o pruebas de carrera en el proyecto compartido.
3. Aportar PDF original del TFI y las tres imágenes de evaluación. Existe transcripción y listado excluyente; no se inventan preguntas exactas, cantidades extra de gráficos ni diseño de referencia no disponible.
4. Aclarar alcance de “todos los mozos y todos los clientes”: sala global o conversaciones por estadía con acceso de todos los mozos. La implementación RLS actual elige lo segundo, UI no organiza correctamente esas salas.
5. Acordar fórmula de tiempo (actual máximo de minutos por ítem, sin cantidad), primer intento por juego/estadía, bases/redondeo de descuento y propina, y si se envía correo adicional al quedar pendiente. La consigna no resuelve todas esas políticas.
6. Resolver contradicción documental sobre anónimo: CONTEXTO-PROYECTO.md prohíbe juegos; prompt solo prohíbe beneficio. No se penalizó como obligación adicional el no permitirle jugar sin premio; sí se exige impedir descuentos.
7. Probar con cuatro teléfonos físicos: cámara exclusiva, selección galería para productos, PDF417 real, QR impresos, vibración/sonido, permisos, safe areas, teclado, push abierta/cerrada y recepción de correo empresarial. No hay evidencia de esas pruebas en esta auditoría.

### Control de cierre

Se representaron los **22 puntos**, con criterios por campo y flujos separados de plato/bebida, dueño/supervisor, cocina/bar; tres áreas visuales; todos los eventos mínimos de comunicación; escenarios de aprobación/rechazo, anónimo/registrado y liberación final. Las métricas derivan de las filas únicas y no suman las referencias duplicadas de juegos/beneficio. Los tests de caracterización no se contabilizan como cumplimiento de flujos remotos.

El único archivo persistente creado por la auditoría dentro del repositorio es **docs/AUDITORIA_CUMPLIMIENTO.md**. Build, scripts, dependencias auxiliares, capturas y pruebas adicionales quedaron fuera del repositorio, en un directorio temporal. No se modificaron código, estilos, migraciones, configuración ni pruebas versionadas; no hubo commits, push ni despliegues. El estado inicial era limpio y el control final debe mostrar únicamente este documento.

**Dictamen final:** existe cumplimiento verificado de controles y presentaciones acotadas, pero hay incumplimientos comprobados que bloquean el circuito y faltan implementaciones obligatorias. **No puede asegurarse cumplimiento total**, tanto por esos fallos como por la inspección remota y las pruebas físicas pendientes. No se recomienda presentar la demo local como evidencia de funcionamiento integral con Supabase.
