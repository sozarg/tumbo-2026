You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection

## Proyecto TUMBO

TUMBO es una aplicación móvil de gestión de restaurante para el Trabajo Final Integrador 2026. La implementación debe priorizar una experiencia mobile first, accesible, clara y responsive.

## Skills de referencia

Estas skills fueron instaladas y deben consultarse antes de realizar el tipo de trabajo correspondiente:

- `angular-new-app`: creación y configuración inicial de aplicaciones Angular. Fuente: `https://github.com/angular/angular`.
- `angular`: buenas prácticas de Angular y TypeScript. Fuente: `https://github.com/mindrally/skills`.
- `ionic`: arquitectura mobile first, componentes Ionic, navegación, estilos responsive y capacidades nativas. Fuente: `https://github.com/mindrally/skills`.

## Stack y arquitectura

- Angular con standalone components.
- Ionic para la interfaz móvil.
- Capacitor para las capacidades nativas.
- Supabase como backend previsto.
- Usar @supabase/supabase-js detrás de un adaptador; environment.ts solo admite URL y clave anon pública.
- Mientras Supabase no esté configurado, usar servicios mock desacoplados mediante interfaces. El mock es temporal y no debe mezclarse con la lógica visual.
- Organizar el código por funcionalidades: `core`, `shared` y `features`.
- Mantener la integración de Supabase detrás de una interfaz para poder reemplazar el mock sin reescribir los componentes.

## Reglas de implementación del proyecto

- Mantener TypeScript estricto y no usar `any`.
- Usar interfaces para modelos y tipos explícitos en servicios.
- Preferir `signals`, funciones puras e inmutabilidad para el estado local.
- Usar SCSS por componente y variables globales para la identidad visual.
- Usar formularios reactivos o Signal Forms con validaciones visibles y accesibles.
- Usar rutas lazy para funcionalidades independientes.
- Usar HTML semántico, etiquetas asociadas a sus campos, estados de foco visibles y atributos ARIA cuando correspondan.
- No manipular directamente el DOM salvo que exista una razón técnica documentada.
- No usar `alert()`; los errores y confirmaciones deben mostrarse mediante controles de Ionic.
- Todo texto visible, mensaje, etiqueta y error debe estar en español correcto, con tildes.
- No guardar contraseñas, claves de servicio, tokens ni archivos `.env` en el repositorio.

## Mobile first y responsive

- Diseñar primero para teléfonos en orientación vertical.
- Usar `ion-header`, `ion-content` e `ion-footer` respetando las áreas seguras del dispositivo.
- Evitar anchos y alturas fijas que provoquen desplazamiento horizontal o contenido cortado.
- Usar CSS Grid/Flexbox y `clamp()` para adaptar espacios y tipografías.
- Probar como mínimo anchos de 320 px, 360 px, 390 px y 768 px.
- Los botones táctiles deben tener un área cómoda y estados visibles de pulsación, foco y deshabilitado.
- Las imágenes deben conservar su proporción, centrarse y tener `object-fit` definido según su uso.
- Las pantallas de espera, error y contenido vacío deben ocupar el espacio disponible con una composición intencional.

## Identidad visual TUMBO

La paleta parte del logo aprobado:

```scss
$amarillo-marca: #FBB103;
$crema-brillante: #FCEDBB;
$naranja-sombra: #DC5B02;
$crema-fondo: #FBF1D5;
$azul-acento: #006AE7;
$azul-brillante: #F8FBFD;
$azul-sombra: #003592;
```

- Usar `$crema-fondo` como fondo principal.
- Usar `$amarillo-marca` y `$naranja-sombra` para marca, acciones principales y estados destacados.
- Usar `$azul-sombra` para texto corriente cuando se necesite mayor contraste.
- Usar `$azul-acento` para títulos, enlaces y acciones destacadas, verificando contraste según el tamaño del texto.
- Usar `$crema-brillante` y `$azul-brillante` como superficies de contraste y detalles.
- No introducir modo oscuro, fondos blancos puros ni fondos negros puros en la aplicación.
- No aplicar degradados o sombras que oculten el contraste del texto.

## Requerimientos de la primera entrega

- Listado preliminar de tareas con los cuatro integrantes.
- Ícono de la aplicación.
- Splash estático y splash dinámico con el ícono centrado y los apellidos y nombres de los cuatro integrantes.
- Página principal de ingreso.
- Validación de correo electrónico y clave.
- Ingreso funcional con Supabase cuando esté configurado; mientras tanto, mock explícito.
- Accesos rápidos.
- Cierre de sesión.

## Verificación mínima

```text
[ ] npm run build termina correctamente
[ ] La vista funciona en teléfono angosto sin scroll horizontal
[ ] Correo vacío y correo inválido muestran validación
[ ] Clave vacía y clave inválida muestran validación
[ ] El ingreso válido funciona con el mock actual
[ ] Los accesos rápidos llevan al perfil correcto
[ ] El cierre de sesión limpia el estado y vuelve al ingreso
[ ] El splash muestra el ícono centrado y los cuatro nombres
[ ] No existe alert() en el código
[ ] No hay secretos versionados
```
