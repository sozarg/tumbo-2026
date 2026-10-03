# Cómo se opera Tumbito, módulo por módulo

Guía para operar la aplicación en la revisión: qué hay en cada módulo,
quién lo usa, qué pasos se siguen y qué ocurre detrás de cada acción
(push, correos, cambios en vivo). Cubre los puntos 1 a 22 de la primera
entrega.

Escrita el 02/10/2026 sobre la aplicación publicada
(`tumbito.vercel.app`) y la base de producción. Los textos entre
comillas son los que se ven en pantalla.

---

## 0. Antes de empezar

### Entrar

1. Al abrir, el **splash** muestra el ícono, «Grupo Tumbito» y los
   cuatro integrantes.
2. Se llega a **«Ingresá a tu cuenta»**. Se puede escribir correo y
   clave, o usar el **acceso rápido**: un carrusel con un botón por
   perfil («Perfil anterior» / «Perfil siguiente»). El botón completa el
   formulario y se entra con «Ingresar».
3. Correo o clave vacíos o inválidos muestran el error debajo del
   campo, y el teléfono vibra.

Cuentas de demostración (todas con la misma clave):

| Perfil             | Cuenta                                               |
| ------------------ | ---------------------------------------------------- |
| Dueño              | `mateo@tumbo.demo`                                   |
| Supervisor         | `ramiro@tumbo.demo`                                  |
| Metre              | `ignacio@tumbo.demo`                                 |
| Mozo               | `matias@tumbo.demo`                                  |
| Cocinero           | `alicia@tumbo.demo`                                  |
| Cantinero          | `bruno@tumbo.demo`                                   |
| Cliente registrado | `camila@tumbo.demo`                                  |
| Cliente anónimo    | sin cuenta: «Entrar sin cuenta con el QR de ingreso» |

### Salir

«Cerrar sesión» borra la sesión y vuelve al ingreso. **En el teléfono
también borra su registro de push**: ese teléfono deja de recibir avisos
de esa cuenta. Para que lleguen las push con la aplicación cerrada, hay
que cerrar la aplicación, **no la sesión**.

### Los módulos de la pantalla principal

Después de entrar, la pantalla principal agrupa las secciones en
módulos. Cada perfil ve solo lo suyo:

| Módulo                      | Secciones                     | Lo ven                                                                                       |
| --------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------- |
| **Gestión**                 | Personal, Productos, Clientes | Dueño y supervisor (todas); cocinero y cantinero (Productos); metre (Clientes)               |
| **Operación**               | Pedidos, Mesas, Espera        | Dueño y supervisor (todas); metre (Mesas, Espera); mozo (Pedidos, Mesas); clientes (Pedidos) |
| **Servicio**                | Cocina, Barra, Entrada        | Dueño (todas); cocinero (Cocina); cantinero (Barra); clientes (Entrada)                      |
| **Experiencia del cliente** | Menú, Juegos, Encuesta        | Dueño (todas); clientes (Menú; Juegos y Encuesta, solo el registrado)                        |
| **Seguimiento**             | Reportes, Consultas, Cuenta   | Dueño (todas); supervisor (Reportes, Cuenta); mozo (Consultas, Cuenta); clientes (todas)     |

El dueño puede entrar a todas las secciones. Los demás perfiles ven su
sección principal arriba y el resto agrupado:

| Perfil             | Título principal    | Lo que ve                                                                                                                 |
| ------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Dueño / supervisor | «Gestión»           | Personal, Productos y Clientes arriba; después Operación y Seguimiento                                                    |
| Metre              | «Recepción»         | Espera arriba; Mesas y Clientes                                                                                           |
| Mozo               | «Atención de mesas» | Pedidos arriba; «Servicio»: Mesas, Consultas, Cuenta                                                                      |
| Cocinero           | —                   | Cocina arriba; Platos                                                                                                     |
| Cantinero          | —                   | Barra arriba; Bebidas                                                                                                     |
| Cliente            | «Tu visita»         | Entrada, Menú y Pedidos; «Atención»: Consultas y Cuenta; «Experiencia»: Juegos y Encuesta (solo el registrado) y Reportes |

---

## 1. Gestión

Lo usan el dueño y el supervisor. Es la carga de todo lo que el
restaurante necesita antes de abrir: personal, carta y clientes.

### 1.1 Personal · Agregar empleado (punto 1)

**Dispositivo 1 · dueño o supervisor.**

1. Personal → **«Alta de empleado»**.
2. Completar «Nombres», «Apellidos», «DNI», «CUIL», «Correo»,
   «Perfil» (Metre, Mozo, Cocinero o Cantinero), «Contraseña» y
   «Repetir contraseña».
   - En Android, el DNI se puede leer con la cámara y completa los datos.
3. Sacar la foto con la cámara: **«La foto personal es obligatoria.»**
4. Guardar.

Qué valida: todos los campos; el CUIL tiene que corresponder al DNI y
tener el dígito verificador correcto, y las dos contraseñas tienen que
coincidir. Si algo falla, el error aparece en el campo.

Qué pasa detrás: la función `crear-empleado` crea la cuenta y sube la
foto. El empleado ya puede entrar y aparece en los accesos rápidos si
su correo es de demostración.

**Baja:** desde la lista de personal, con confirmación. Se borran la
cuenta y la foto.

### 1.2 Productos · Agregar plato y bebida (puntos 2 y 3)

**Plato: Dispositivo 2 · cocinero (sección «Platos»). Bebida:
Dispositivo 3 · cantinero (sección «Bebidas»).** El dueño y el
supervisor lo hacen desde «Productos» eligiendo el «Tipo» (Plato · cocina
o Bebida · bar).

1. «＋ Nuevo producto».
2. «Nombre», «Descripción», «Minutos» (tiempo de elaboración) y
   «Precio».
3. **«Tres fotos del producto»**: exactamente tres, una por posición,
   sacadas con la cámara.
4. Guardar.

Qué valida: datos completos, tiempo y precio válidos, y que no se repita
el nombre dentro del mismo tipo. Sin las tres fotos no se guarda.

Qué ve el cliente: el producto entra al menú **solo si está activo y
tiene sus tres fotos**. Hoy hay 6 platos, 5 bebidas y 2 postres, todos
con tres fotos.

La lista está paginada de a 4 («1 / 2»): para ver el resto se usan
«Página anterior» y «Página siguiente».

### 1.3 Clientes · Registro, aprobación y rechazo (puntos 5 a 8)

**El registro: Dispositivo 2 · el propio cliente** (o el metre desde
«Clientes» → «Alta de cliente»).

1. En el ingreso, «¿No tenés cuenta? Registrate».
2. «Nombres», «Apellidos», «DNI» («Leer el código del DNI» en Android),
   «Correo electrónico», «Clave» y «Repetir clave».
3. «Sacar tu foto»: obligatoria.
4. «Crear mi cuenta» → **«Tu registro quedó pendiente de aprobación.»**

El cliente pendiente **no puede entrar**: al intentarlo ve «Tu cuenta
todavía está pendiente de aprobación.»

**Push a gerencia (punto 6):** al registrarse, el dueño y el supervisor
reciben una push.

**La aprobación: Dispositivo 1 · dueño o supervisor.**

1. Clientes → **«Clientes pendientes»**: nombre, apellido y foto de
   cada uno, con «Pendiente de aprobación».
2. Para rechazar: «Rechazar» → escribir el **«Motivo del rechazo»**
   («Contale por qué no se aprueba su registro.») → «Confirmar rechazo»
   → «Confirmar».
3. Para aprobar: «Aprobar» → «Confirmar».

Qué pasa detrás:

- **Rechazo (punto 7):** le llega un correo con el logo, el motivo y
  tipografía y colores propios. Si intenta entrar, ve «Tu registro fue
  rechazado. Motivo: …».
- **Aprobación (punto 8):** le llega el correo de bienvenida y ya puede
  entrar.
- La lista de pendientes se actualiza sola en todas las pantallas
  abiertas.

---

## 2. Operación

Es el salón: quién espera, qué mesa ocupa cada uno y en qué estado
están los pedidos.

### 2.1 Mesas · Agregar mesa y ver el salón (punto 4)

**Alta: Dispositivo 1 · dueño o supervisor.** Mesas → «Gestión de
mesas».

1. «Número», «Comensales» y «Tipo de mesa» (Estándar, VIP o Movilidad
   reducida).
2. Foto de la mesa con la cámara.
3. Guardar: la mesa queda con su **código QR**, que se ve en su tarjeta
   («Código QR de la mesa») para imprimirlo.

**Consulta: metre y mozo.** Ven cada mesa como disponible u ocupada,
en vivo.

**Verificación (punto 22):** después de que el mozo confirma el pago,
la mesa vuelve a estar libre; se comprueba escaneando de nuevo su QR.

Hoy hay mesas 1 a 5 y 26, todas libres.

### 2.2 Espera · Lista de espera y asignación de mesa (puntos 9 y 10)

**Dispositivo 3 · metre.** Es su pantalla principal.

1. Cuando un cliente se anota (ver 3.3 Entrada), el metre **recibe una
   push** y la persona aparece sola en «Lista de espera», con foto,
   nombre y hora.
2. Para asignarle una mesa: tocar el botón **«Mesa N»** de una mesa
   disponible. Solo se ofrecen las mesas libres.
3. La fila pasa a mostrar «Mesa N» y el cliente **recibe una push**.
4. Para sacar a alguien de la lista: el ícono de la papelera
   («Eliminar de la lista») → confirmar.

Reglas (punto 10):

- Nadie se sienta sin estar en la lista.
- La mesa asignada no se le ofrece a nadie más.
- El cliente solo puede vincularse **escaneando el QR de esa mesa**:
  cualquier otro QR se rechaza.
- La asignación es una sola operación en la base: dos metres no pueden
  dar la misma mesa a la vez.

### 2.3 Pedidos · Confirmar, rechazar y entregar (puntos 12, 13, 14 y 19)

**Dispositivo 4 · mozo.** Es su pantalla principal: **«Pedidos de las
mesas»**.

1. Cuando un cliente envía un pedido, todos los mozos **reciben una
   push** y aparece «Pedido nuevo: espera tu confirmación.»
2. **Rechazar (punto 13):** «Rechazar» → escribir el motivo →
   confirmar. El cliente recibe una push y ve «El mozo rechazó tu
   pedido» con el motivo; lo corrige con «Modificar y reenviar».
3. **Confirmar (punto 14):** «Confirmar» → confirmar. Cada parte va a
   su sector: **push a cocina con sus platos, push al bar con sus
   bebidas y push al cliente**. Al cliente se le habilitan los juegos.
4. Cuando cocina y bar terminan, el mozo **recibe una push** y el
   pedido pasa a «Pedido completo: listo para entregar.»
5. **Entregar (punto 19):** marcar como entregado → confirmar. El
   cliente confirma desde su teléfono con «Confirmar recepción», y eso le
   habilita la encuesta y la cuenta.

**Lo que ve el cliente (en su sección «Pedidos»):** «Estado del pedido»
con tres pasos, «Pedido», «Cocina y bar» y «Entrega», que avanzan en
vivo.

---

## 3. Servicio

La cocina, la barra y la puerta del restaurante.

### 3.1 Cocina y Barra (puntos 16, 17 y 18)

**Cocina: Dispositivo 2 · cocinero. Barra: Dispositivo 3 · cantinero.**
Es su pantalla principal.

1. Al confirmar el mozo, el sector **recibe una push** y el pedido
   aparece solo, **agrupado por mesa y con la más antigua primero**.
   Cada sector ve únicamente sus productos: la cocina, los platos; la
   barra, las bebidas.
2. Al terminar su parte de una mesa, el sector la marca como lista →
   confirmar.
3. Sin pendientes, la pantalla muestra «No hay pedidos pendientes. Los
   nuevos aparecen acá solos.»

Punto 18: cuando **los dos sectores** marcaron su parte, el mozo recibe
la push de pedido completo. Si el pedido no tiene platos o no tiene
bebidas, alcanza con el sector que tenga productos.

### 3.2 Entrada · Ingreso del cliente (puntos 9 y 10)

**Dispositivo 3 · cliente (registrado o anónimo).**

1. «Entrada al restaurante» → **«Escanear QR de ingreso»** (el cartel de
   la puerta, `tumbo://ingreso`).
2. «QR validado. Completá tus datos para anotarte.»
   - **Anónimo (punto 9):** «Nombre para la lista de espera» y foto,
     obligatoria → «Anotarme». No necesita aprobación.
   - **Registrado:** se anota con sus datos.
3. Queda en la lista de espera: «Esperá la asignación del maître para
   vincular una mesa.» El metre recibe la push.
4. Cuando el metre le asigna la mesa, recibe la push → **«Escanear QR de
   mi mesa»** («Escaneá el QR de esa mesa para vincular tu estadía.»).
   Solo sirve el QR de la mesa asignada.

Desde la entrada, **sin cuenta**, también se puede ir a «Ver resultados
de encuestas previas» (punto 22).

---

## 4. Experiencia del cliente

Todo lo que el cliente hace sentado a la mesa.

### 4.1 Menú · Ver la carta y pedir (puntos 11 y 12)

**Cliente con mesa vinculada.**

1. «Menú Tumbito»: la mesa vinculada aparece arriba.
2. Filtrar por categoría (todos, platos, bebidas o postres).
3. Cada producto tiene **tres fotos**: se pasan con «Ver siguiente
   imagen».
4. Elegir cantidades con ＋ y −. Abajo están siempre a la vista el
   **«Importe acumulado»** y el **«Tiempo estimado»**: el del producto
   que más tarda.
5. «Enviar» → confirmar.

Qué pasa: el pedido queda **esperando la confirmación del mozo** (no va a
cocina ni a bar antes) y todos los mozos reciben una push. El cliente
sigue el estado en «Pedidos».

### 4.2 Juegos · Descuentos (punto 15)

**Solo cliente registrado**, y recién cuando el mozo confirmó el pedido
(antes ve «Los juegos se habilitan con tu pedido»).

| Juego                       | Descuento | Cómo se gana                                                |
| --------------------------- | --------- | ----------------------------------------------------------- |
| 01 · Recolección tumbito    | 10 %      | Juntar 50 puntos en 10 segundos                             |
| 02 · Adivinanza del número  | 15 %      | Adivinar el número del 1 al 50 en seis intentos, con pistas |
| 03 · Piedra, papel o tijera | 20 %      | Ganarle una mano a Tumbito (si empatan, se juega de nuevo)  |

Reglas, que **decide la base** y no la pantalla:

- Solo da descuento **el primer intento** de cada juego.
- **No se acumulan**: queda el primero que se ganó. Si después gana otro
  juego, ve «Ya tenías 15 % de descuento: no se acumula.»
- El descuento ganado se ve en un chip («15% ganado») y se descuenta en
  la cuenta.
- El anónimo ve «Función exclusiva para clientes registrados».

### 4.3 Encuesta (punto 20)

**Cliente registrado**, después de confirmar que recibió el pedido
(antes ve «La encuesta se habilita con tu pedido»).

1. «Encuesta de satisfacción»: siete preguntas, cada una con un control
   distinto: estrellas (atención), opción única (tiempo de espera),
   casillas (qué disfrutó), lista desplegable (cómo nos conoció),
   deslizador (limpieza), interruptor (si volvería) y texto libre.
2. «Siguiente» entre preguntas y «Enviar encuesta» al final. Las
   opcionales dicen «(opcional)».
3. «¡Gracias por responder!» Se puede responder **una sola vez por
   estadía**.

---

## 5. Seguimiento

Cómo va el servicio: lo que opinan los clientes, las consultas y la
plata.

### 5.1 Reportes · Gráficos de encuestas (puntos 20 y 22)

**Dueño, supervisor y clientes; también sin cuenta, desde el QR de
ingreso.**

«Resultados de las encuestas», con **cada gráfico en su propia
pantalla**:

- **Torta:** el tiempo de espera.
- **Barras:** qué aspectos disfrutaron.
- **Línea:** el promedio de la atención en las últimas 4 semanas.

Se alimentan del historial de 4 semanas (135 encuestas) y de cada
encuesta nueva.

### 5.2 Consultas · Sala con el mozo (punto 11)

**Cliente con mesa ↔ mozo.**

1. **Cliente:** «Sala de consulta al mozo» → escribe y envía. Sin mesa
   ve «La consulta se habilita con tu mesa».
2. **Todos los mozos** reciben una push con la mesa, la fecha y la hora.
3. **Mozo:** en «Conversación con» elige la mesa y responde.
4. El cliente recibe la respuesta por push y la ve en la sala.

Cada mensaje muestra mesa, fecha, hora y minutos. Sin consultas, el
mozo ve «Todavía no hay consultas de las mesas.»

### 5.3 Cuenta · Pedir, pagar y confirmar (puntos 21 y 22)

**Cliente (Dispositivo 3) ↔ mozo (Dispositivo 4).**

Del lado del cliente, en «Tu cuenta»:

1. Se habilita después de confirmar la recepción del pedido.
2. «¿Terminaste?» → **«Pedir la cuenta»**. El mozo recibe la push.
3. «Le avisamos al mozo. Escaneá el QR de propina.» El mozo muestra el
   **QR de propina** según el grado de satisfacción:

   | Nivel     | Propina |
   | --------- | ------- |
   | Excelente | 20 %    |
   | Muy bueno | 15 %    |
   | Bueno     | 10 %    |
   | Regular   | 5 %     |
   | Malo      | 0 %     |

4. Ve el **detalle**: cada producto, subtotal, descuento de los juegos,
   propina y **«Total a pagar»**, calculado por la base.
5. Paga: el pago es simulado. Ve «Pago realizado. Esperá a que el mozo lo
   confirme.»

Del lado del mozo, en «Cuentas de las mesas»:

1. Ve el estado de cada mesa: «Pidió la cuenta» → «Eligió la propina» →
   «Pagó: falta confirmar» → «Confirmada». Desde ahí muestra el QR de
   propina.
2. Confirma el pago → confirmar.

Qué pasa al confirmar (punto 22):

- El cliente ve **«¡Pago confirmado!»** y «Gracias por venir. Tu mesa
  quedó libre.»
- Se cierra la estadía y la **mesa queda libre**; se verifica escaneando
  de nuevo su QR.
- El **dueño y el supervisor reciben una push**.
- El pedido queda pagado y la entrada de la lista de espera, finalizada.

---

## 6. Una visita completa, de punta a punta

El orden para la demostración, con quién hace qué y en qué teléfono:

| #   | Quién                | Dónde                   | Acción                               | Push a                     |
| --- | -------------------- | ----------------------- | ------------------------------------ | -------------------------- |
| 1   | Cliente              | Ingreso                 | Se registra con foto y DNI           | Dueño y supervisor         |
| 2   | Dueño                | Gestión › Clientes      | Aprueba (o rechaza con motivo)       | — (correo al cliente)      |
| 3   | Cliente              | Servicio › Entrada      | Escanea el QR de ingreso y se anota  | Metre                      |
| 4   | Metre                | Operación › Espera      | Le asigna una mesa                   | Cliente                    |
| 5   | Cliente              | Entrada                 | Escanea el QR de su mesa             | —                          |
| 6   | Cliente              | Seguimiento › Consultas | Consulta al mozo                     | Todos los mozos            |
| 7   | Mozo                 | Consultas               | Responde                             | Cliente                    |
| 8   | Cliente              | Experiencia › Menú      | Arma el pedido y lo envía            | Mozos                      |
| 9   | Mozo                 | Operación › Pedidos     | Confirma (o rechaza con motivo)      | Cocina, bar y cliente      |
| 10  | Cliente              | Experiencia › Juegos    | Juega y gana un descuento            | —                          |
| 11  | Cocinero / cantinero | Cocina / Barra          | Marcan su parte lista                | Mozo, cuando están las dos |
| 12  | Mozo                 | Pedidos                 | Entrega                              | —                          |
| 13  | Cliente              | Pedidos                 | «Confirmar recepción»                | —                          |
| 14  | Cliente              | Experiencia › Encuesta  | Responde la encuesta                 | —                          |
| 15  | Cliente              | Seguimiento › Cuenta    | Pide la cuenta                       | Mozo                       |
| 16  | Cliente              | Cuenta                  | Escanea el QR de propina y paga      | Mozo                       |
| 17  | Mozo                 | Cuenta                  | Confirma el pago                     | Dueño y supervisor         |
| 18  | Cualquiera           | Entrada                 | Escanea el QR de la mesa: está libre | —                          |
| 19  | Sin cuenta           | Entrada                 | Ve los gráficos de las encuestas     | —                          |

### Cómo repartir los cuatro teléfonos

El enunciado habla de «Dispositivo 1, 2, 3…». Una forma de cubrir la
visita sin cerrar sesiones en medio de un aviso:

| Teléfono | Perfil durante la visita                                     | Recibe                                                     |
| -------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| 1        | Dueño (o supervisor)                                         | Registro de clientes y pago confirmado                     |
| 2        | Cocinero (y después cantinero)                               | Pedidos de cocina (y de bar)                               |
| 3        | Cliente                                                      | Mesa asignada, respuestas, pedido rechazado o confirmado   |
| 4        | Mozo, con el metre en el mismo teléfono para asignar la mesa | Consultas, pedidos nuevos, pedido completo y cuenta pedida |

Si un teléfono cambia de perfil, las push pasan al último perfil que
inició sesión en él. Conviene ensayar el orden antes de la revisión.

---

## 7. Lo que solo se comprueba con un Android

El código está y funciona en producción, pero estas partes dependen
del teléfono y hay que probarlas con el APK instalado:

- Push con la aplicación **abierta y cerrada** (requisito 14).
- Cámara: fotos de empleados, clientes, productos y mesas; lectura del
  DNI; escaneo de los QR de ingreso, de mesa y de propina.
- Sonido al abrir y al cerrar la aplicación, y vibración ante cada
  error.

Cómo generar e instalar el APK: [`docs/apk.md`](apk.md).
