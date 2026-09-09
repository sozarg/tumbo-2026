# Menú de operación por rol

Las consignas de la primera fecha definen el trabajo de cada perfil. El dueño conserva acceso a todas las secciones por decisión del usuario para realizar pruebas.

| Perfil | Secciones visibles, en orden |
|---|---|
| Dueño | Pedidos, Personal, Productos, Mesas, Clientes, Espera, Cocina, Barra, Entrada, Menú, Juegos, Encuesta, Reportes, Consultas, Cuenta |
| Supervisor | Pedidos, Personal, Productos, Mesas, Clientes, Espera, Reportes, Cuenta |
| Metre | Espera, Mesas, Clientes |
| Mozo | Pedidos, Mesas, Consultas, Cuenta |
| Cocinero | Cocina, Platos |
| Cantinero | Barra, Bebidas |
| Cliente registrado | Entrada, Pedidos, Menú, Juegos, Encuesta, Reportes, Consultas, Cuenta |
| Cliente anónimo | Entrada, Pedidos, Menú, Encuesta, Reportes, Consultas, Cuenta |

## Criterios

- Puntos 2–3: el cocinero carga platos y el cantinero bebidas. Comparten la sección de productos con título, listado y tipo de alta adaptados. Se fuerza el tipo al guardar, además de ocultar el selector.
- QR de mesa: metre y mozo consultan mesas. Crear y cambiar disponibilidad queda reservado a dueño/supervisor.
- Puntos 5–8: el metre registra clientes; aprobar y rechazar queda reservado a dueño/supervisor tanto en botones como en manejadores.
- Puntos 9–10: el metre gestiona espera; se elimina su acceso a confirmación de pedidos, que corresponde al mozo.
- Puntos 16–18: cada sector recibe únicamente su área de trabajo.
- Puntos 20–22: ambos tipos de cliente pueden consultar gráficos de encuestas; esto no les da acceso a gestión interna. Las restricciones por estado del pedido siguen en las pantallas existentes.
- El acceso a Juegos del anónimo continúa excluido; el beneficio de descuentos corresponde al registrado.

## Presentación

La home combina filas de operación, un grupo compacto de gestión y herramientas secundarias sin tarjetas individuales. Con hasta cuatro accesos utiliza filas horizontales con descripción breve. El encabezado equilibra marca y rol con una salida discreta; la actividad ocupa su altura natural. En pantallas cortas el contenido puede desplazarse verticalmente, sin recortes ni botones estirados. La revisión visual posterior conserva exactamente los permisos existentes.

Se mantiene la autorización de navegación centralizada en `src/app/core/navegacion/secciones.ts`. Esto organiza la interfaz; las políticas RLS de Supabase permanecen como control del servidor.

## Verificación

Pruebas unitarias de permisos y navegador para los ocho roles en 320, 360, 390 y 768 px. Se verifica el catálogo sectorial, ausencia del sector ajeno, alta sin selector de otro tipo, aprobación oculta al metre y cierre de sesión. No se ejecutan escrituras contra Supabase durante esta verificación.
