**Perfil:** cantinero. Dispositivo 3.

### Lo que pide el enunciado
- [x] Campos: nombre, descripción, tiempo de elaboración en minutos, precio
- [x] **Tres (3) fotos** tomadas del dispositivo (acá sí se admite la galería)
- [x] Las fotos en contenedores individuales, con buen tamaño, centradas, sin mostrar partes de otras, con posibilidad de elegir otra
- [x] Validar TODOS los campos
- [x] Se verifica la existencia en la carta (menú)

---

### Por qué quedó hecho junto con el punto 2

El enunciado pide para la bebida exactamente lo mismo que para el plato, y el proyecto lo resuelve con **el mismo formulario**. Lo que cambia es quién entra:

- `tipoProductoDelPerfil` le fija `tipo: 'bebida'` al cantinero, así que el selector de Tipo **ni aparece**: no hay forma de cargar un plato por error desde la barra.
- `productosDelSector` filtra el listado, así que el cantinero ve **solo bebidas**.
- La sección se llama **«Bebidas»** para él y «Productos» para la gerencia — es la misma pantalla con otro título.
- El sector sale del tipo (`bebida → bar`), que es lo que exige el `check (sector_coherente)` de la base.
- El control de duplicados es por `(tipo, nombre)`, igual que el único de PostgreSQL: una *Limonada* plato y una *Limonada* bebida son dos cosas distintas y las dos pueden estar en la carta.

Todo el detalle de cómo funcionan las validaciones, las tres fotos y la verificación en la carta está en el **punto 2** y no se repite acá.

---

### El bug que encontró esta verificación

Probando el alta como cantinero apareció esto:

> Ya hay **un** bebida con ese nombre en la carta.

El código guardaba el sustantivo (`'plato'` / `'bebida'`) y escribía el artículo a mano en cada mensaje. La rama del plato se leía perfecta y la de la bebida no, en los cinco mensajes que nombran el tipo.

Ahora las formas se guardan enteras y con su género (`un plato` / `una bebida`, `otro plato` / `otra bebida`, `Ese plato` / `Esa bebida`), en un solo lugar. **Es el tipo de detalle que ninguna prueba del punto 2 podía atrapar**, porque solo recorrían la rama del plato — por eso el punto 3 tiene ahora pruebas propias.

---

### Probado

**Automático:** 8 pruebas nuevas en `operacion.service.spec.ts` que recorren la rama de la bebida de punta a punta — alta, sector `bar`, rechazo por nombre repetido, mayúsculas y espacios, el artículo correcto en los dos géneros, el filtrado del listado y la baja. 150 pruebas en total, todas en verde.

**En el navegador, como cantinero (Bruno Sosa):**

- [x] La sección «Bebidas» aparece en sus accesos
- [x] El listado le muestra solo bebidas
- [x] El selector de Tipo no aparece: queda fijo en bebida
- [x] Alta con las tres fotos → entra como `Bebida · 4 min · $3.600`
- [x] Nombre repetido escrito distinto (`  tónica   DE   pomelo  `) → rechazado, con el artículo correcto

### Falta

Nada del enunciado en la web. Queda la corrida en el **dispositivo 3** con el APK, que es donde se ve el menú de cámara/galería del sistema operativo.
