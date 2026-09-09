# Trabajo Final Integrador 2026

Transcripción estructurada de `Trabajo-practico-2026-TFI.pdf`.

- Fuente: documento oficial de la cátedra.
- PDF original: 22 páginas, A4, creado el 21/08/2026.
- Equipo que figura en el PDF: Maximiliano Neiner, Alejandro Constanzo, Octavio Villegas, Nicolás Ferrero, Augusto Morelli y Alejandro Loredo.
- Esta versión conserva las consignas y elimina encabezados, pies de página y saltos de página repetidos para facilitar la consulta.

## 1. Grupo, fechas y repositorio

El trabajo se realiza en grupos de cuatro personas. El líder debe inscribir a todos en el formulario de la cátedra. La inscripción cierra el **29/08/2026**; el **05/09/2026** se asignan alumnos sin grupo.

Fechas de entrega:

| Fecha | Entrega |
|---|---|
| 17/10/2026 | Primera |
| 07/11/2026 | Segunda |
| 28/11/2026 | Tercera |

El líder debe crear un repositorio privado en GitHub con el formato `nombre-del-grupo-2026`, agregar a los colaboradores indicados por la cátedra y mantener actualizado el README. El README debe incluir, por integrante, apellidos y nombres, módulos, fecha de inicio, fecha de finalización y branch. También debe contener un índice con **todas** las imágenes del proyecto.

Para presentarse a las entregas definitivas se requieren 14 puntos aprobados en revisiones preliminares para las dos primeras fechas y 23 puntos para la tercera. Todos los integrantes deben asistir a las revisiones, todos los dispositivos deben tener la misma versión y cada grupo dispone de 30 minutos.

## 2. Objetivo y preparación

El objetivo es desarrollar, implementar y documentar una aplicación móvil funcional para la gestión de un restaurante, usando capacidades del dispositivo y cuidando la experiencia de clientes y empleados.

Debe existir una base externa con interacciones simuladas de al menos cuatro semanas. Deben estar cargados usuarios con:

- apellidos;
- nombres;
- DNI o CUIL;
- correo electrónico;
- clave;
- perfil.

Perfiles requeridos: dueño, supervisor, metre, mozo, cocinero, cantinero, cliente registrado y cliente anónimo.

La preparación debe incluir al menos un dueño, un supervisor, un metre, un mozo, un cocinero, un cantinero, un cliente registrado, cinco platos, cinco bebidas y cinco mesas.

## 3. Requerimientos excluyentes de la primera fecha

Para promocionar en la primera fecha se exige:

1. Splash estático y animado con ícono, nombre del grupo y apellidos y nombres de los integrantes.
2. Todo texto y mensaje en español, con tildes.
3. Mostrar errores e información mediante controles; no usar `alert`.
4. Sonidos distintos al iniciar y cerrar la aplicación.
5. Validar todos los campos de todos los formularios.
6. Mostrar spinners con el logo en todas las esperas.
7. Vibrar ante todos los errores.
8. Botones de ingreso rápido para perfiles distintos; no botones fijos, combos ni controles equivalentes.
9. Botón de cierre de sesión y verificación de borrado de credenciales.
10. Ocupar toda la superficie de cada pantalla con elementos de la aplicación.
11. Contraste nítido; no fondos blancos o negros ni modo oscuro.
12. No dejar textos o imágenes cortados, descentrados, ilegibles o abreviados.
13. Encuestas con variedad de controles.
14. Notificaciones push con la aplicación abierta y cerrada.
15. Correos automáticos desde una cuenta empresarial, nunca desde una cuenta personal.
16. Lectura y generación de distintos códigos QR.
17. Al menos tres juegos simples completamente funcionales.
18. Gráficos estadísticos de los datos de encuestas: torta, barra, lineal u otros; cada gráfico en una pantalla distinta.
19. Completar los puntos funcionales 1 al 22.

## 4. Códigos QR

Todos los QR deben estar disponibles en README, pantalla y soporte físico cuando corresponda.

### QR de ingreso al local

Permite al cliente anunciarse en la lista de espera y consultar encuestas anteriores.

### QR de mesa

Para metre, mozo, dueño o supervisor muestra número, capacidad, tipo —VIP, estándar o movilidad reducida— y disponibilidad.

Para clientes registrados o anónimos permite ver la mesa, verificar disponibilidad y vincularse. Luego habilita consultas al mozo, menú, estado del pedido, encuesta, juegos y pago.

### QR de propina

Debe haber cinco QR:

| Nivel | Propina |
|---|---:|
| Excelente | 20 % |
| Muy bueno | 15 % |
| Bueno | 10 % |
| Regular | 5 % |
| Malo | 0 % |

## 5. Funcionalidades de la primera fecha

### 1. Agregar empleado

Dispositivo 1; perfiles dueño o supervisor. Cargar nombres, apellidos, DNI, CUIL, correo, clave, perfil cocinero y foto tomada desde el dispositivo. Validar todos los campos y permitir lectura del código del DNI para completar datos.

### 2. Agregar plato

Dispositivo 2; perfil cocinero. Cargar nombre, descripción, tiempo en minutos, precio y tres fotos. Las fotos pueden salir de la galería, deben verse individualmente, centradas, completas y reemplazables. Validar todo y verificar que el plato aparezca en el menú.

### 3. Agregar bebida

Dispositivo 3; perfil cantinero. Mismos requisitos del plato: datos completos, tiempo, precio, tres imágenes individuales, validaciones y presencia en el menú.

### 4. Agregar mesa

Dispositivo 4; perfiles dueño o supervisor. Cargar número, capacidad, tipo, disponibilidad vacía por defecto y foto tomada desde el dispositivo. Validar, mostrar en el listado, generar QR automáticamente y permitir cambiar disponibilidad.

### 5. Crear cliente registrado

Dispositivo 2; perfiles cliente o metre. Cargar nombres, apellidos, DNI, correo, clave y foto tomada desde el dispositivo. Permitir lectura del código del DNI. El registro queda pendiente de aprobación; dueño o supervisor puede aprobarlo o rechazarlo. Se envía correo automático con el resultado. El cliente no ingresa hasta ser aprobado; el anónimo no requiere aprobación.

### 6. Verificar ingreso del cliente

Dispositivo 1; dueño o supervisor. Mostrar clientes pendientes con apellidos, nombres y foto. La llegada debe poder notificarse por push y debe existir un control para aceptar o rechazar.

### 7. Rechazar cliente

Enviar correo automático personalizado, con logo y diseño propio, desde cuenta empresarial. El cliente rechazado no puede ingresar y debe recibir un mensaje alusivo.

### 8. Aceptar cliente

Enviar correo automático personalizado, con logo y diseño propio, desde cuenta empresarial. Verificar que el cliente aprobado pueda ingresar.

### 9. Ingreso de cliente anónimo

Dispositivo 3. El cliente carga nombre y foto, escanea el QR de ingreso y solicita mesa. El metre recibe la actualización por push. Debe poder eliminar personas de la lista. Nadie toma mesa sin estar en la lista de espera. El anónimo solo puede consultar resultados de encuestas previas.

### 10. Asignar mesa

El metre asigna una mesa a un cliente registrado. El cliente escanea el QR de la mesa asignada. No puede vincularse con otra mesa y la mesa asignada no puede entregarse a otro cliente. Usar push para informar los cambios.

### 11. Menú y consulta al mozo

Al escanear el QR de mesa, mostrar comidas, bebidas y postres con tres fotos por producto, nombre, precio, descripción y tiempo estimado. Las imágenes deben verse completas e individualmente.

Con mesa asignada se habilita una consulta rápida al mozo, con mesa, fecha, hora y minutos. Debe existir una sala de conversación entre mozos y clientes. Todos los mozos reciben la consulta y la respuesta del mozo llega al cliente por push.

### 12. Realizar pedido

El cliente elige productos y cantidades para todos los comensales. El importe acumulado y el tiempo total estimado deben estar siempre visibles. Al finalizar, el pedido espera confirmación del mozo y no se deriva a cocina o bar antes de confirmarse. El cliente puede consultar el estado.

### 13. Rechazar pedido

El mozo puede rechazarlo para que el cliente modifique, agregue o quite productos. El cliente vuelve a enviarlo y recibe las notificaciones correspondientes.

### 14. Confirmar pedido

El mozo confirma y deriva cada parte a cocina y bar mediante push. El cliente ve el estado y puede acceder a juegos.

Los juegos entregan descuentos no acumulativos únicamente si se gana en el primer intento: 10 %, 15 % y 20 %.

### 15. Juegos y descuento

El cliente registrado puede jugar para obtener descuentos. Solo se aplica el primer beneficio ganado en el primer intento. Una vez obtenido, puede acceder libremente a todos los juegos.

### 16. Sector cocina

Mostrar pedidos pendientes agrupados por mesa, con número de mesa, fecha y hora, nombre y cantidad de cada ítem. Debe haber espacio suficiente para manipulación. El cliente ve los cambios de estado.

### 17. Sector bar

Mismos datos y condiciones del punto 16, adaptados al cantinero y a los productos del bar.

### 18. Pedido completo

Cada sector marca sus tareas. El mozo recibe cada parte y una notificación cuando todas están completas. El cliente ve el cambio de estado.

### 19. Entrega del pedido

El mozo entrega comidas, bebidas y postres. El cliente confirma recepción, ve el cambio de estado y obtiene acceso a juegos, encuesta y solicitud de cuenta.

### 20. Encuesta y gráficos

El cliente puede completar una encuesta una sola vez por estadía. Los resultados se muestran en distintos gráficos estadísticos, uno por pantalla.

### 21. Solicitar y pagar cuenta

El cliente solicita la cuenta y el mozo recibe push. Antes de generar la cuenta se debe leer un QR de propina y elegir el porcentaje.

El detalle debe mostrar pedidos con precios unitarios e importes, descuentos de juegos, propina y total grande y claro. El cliente realiza un pago simulado y espera confirmación. La notificación llega al mozo, dueño y supervisor. La presentación de la cuenta debe tomar como referencia Mercado Pago.

### 22. Confirmar pago y liberar mesa

El mozo confirma el pago. Dueño y supervisor reciben push. La mesa vuelve a estar libre y se verifica escaneando nuevamente su QR. Desde el QR de ingreso, el cliente puede consultar resultados de encuestas en gráficos separados por pantalla.

## 6. Segunda fecha

Para la segunda fecha se debe completar lo anterior, agregar autenticación por redes sociales y utilizar archivos PDF para envío por correo o descarga.

### Punto 22 extendido: factura PDF

Al confirmar el pago se genera una factura PDF con nombre, logo y dirección del restaurante, fecha, número, datos del cliente, número de pedido y detalle facturado. El cliente registrado la recibe por correo empresarial. El anónimo recibe push con un enlace de descarga. La mesa se libera y el QR de ingreso sigue permitiendo consultar encuestas.

### Punto 23: ingreso por redes sociales

Clientes, empleados, supervisor y dueño deben poder ingresar mediante al menos una red social.

## 7. Tercera fecha

Se debe completar hasta el punto 23, adaptar los ingresos y el punto 22, usar mapas y sensores, y completar los puntos 1 al 31.

### 24. Reservas

Dos clientes registrados realizan reservas futuras en días y horarios distintos. Solo clientes registrados pueden reservar.

### 25. Aprobar o rechazar reservas

Dueño o supervisor reciben la reserva por push. El dueño rechaza una indicando motivo y el supervisor aprueba otra. Ambos casos envían correo empresarial personalizado.

### 26. Reserva confirmada

La mesa no se asigna a otro cliente. Pasados 45 minutos de espera se libera. Mientras la reserva sea válida, el cliente puede escanear directamente el QR de mesa sin pasar por el QR de ingreso.

### 27. Pedidos a domicilio

Dos clientes registrados realizan pedidos a domicilio. Cada uno ingresa una dirección como texto o la marca en un mapa. Se reutiliza el flujo del punto 12.

### 28. Gestión de pedidos a domicilio

Dueño o supervisor reciben los pedidos por push. Rechazan uno con motivo por push y correo, y confirman otro informando el tiempo estimado de preparación más traslado. Se repiten los pasos de confirmación y recepción de cocina y bar.

### 29. Repartidor recibe pedido

El repartidor ve el pedido por push, consulta el mapa con la ruta, conversa con el cliente y visualiza fecha, hora y dirección en lugar del número de mesa.

### 30. Entrega a domicilio

Se adaptan los puntos 19, 20 y 21. Se genera factura PDF y se envía por correo empresarial personalizado.

### 31. Menú con sensores

Con acelerómetro y giroscopio: izquierda muestra la siguiente foto, derecha la anterior, adelante el siguiente producto y atrás el anterior. Movimientos repetidos izquierda-derecha regresan al primer producto.

## 8. Alcance vigente del proyecto

El PDF oficial define los puntos 1 a 22 para la primera fecha, 23 para la segunda y 24 a 31 para la tercera. Las decisiones internas del repositorio, responsables, arquitectura, tablas y estado de avance viven en [CONTEXTO-PROYECTO.md](../CONTEXTO-PROYECTO.md); este archivo debe consultarse como transcripción de consignas, no como sustituto de ese contexto técnico.
