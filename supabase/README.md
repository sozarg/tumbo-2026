# Supabase — puesta en marcha

Todo lo que hace falta para pasar del modo demostración a la base real.
Los pasos van en orden y no se saltean.

Responsable del módulo: **Ferrari, Matías Gabriel**.

---

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
|---|---|
| `migrations/` | El esquema completo: tablas, funciones, triggers y RLS. Es la fuente de verdad de la base |
| `seed.sql` | Datos de referencia: 5 mesas, 5 platos, 5 bebidas, propinas, juegos y encuesta |
| `crear-usuarios.mjs` | Crea las cuentas de demostración en Supabase Auth |
| `verificar-esquema.sql` | 13 controles para confirmar que la base quedó bien. Se pega en el SQL Editor |

Las cuentas no están en `seed.sql` a propósito: viven en el esquema
`auth`, que es de Supabase y cambia entre versiones. Insertarlas a mano
funciona hasta que una actualización agrega una columna y rompe el seed.
El script usa la API de administración, que sí está soportada.

---

## 1. Crear el proyecto

1. Entrar a [supabase.com](https://supabase.com) e iniciar sesión con GitHub.
2. **New project**. Nombre `tumbo`, organización la del equipo.
3. Región: **South America (São Paulo)** — es la más cercana y baja la latencia de las demostraciones.
4. Anotar la contraseña de la base que genera. Se necesita en el paso 3 y **no se puede volver a ver**.
5. Esperar a que termine de aprovisionar, un par de minutos.

> El plan gratuito permite **dos proyectos activos** por organización.
> Alcanza para uno de trabajo y uno de pruebas.

---

## 2. Instalar el CLI

**No uses `npm install -g supabase`**: no está soportado y el propio CLI
lo rechaza con "Installing Supabase CLI as a global module is not
supported". Se instala como dependencia de desarrollo del proyecto:

```bash
npm install supabase --save-dev
npx supabase --version
```

Así queda anclado en `package.json` y todo el equipo usa exactamente la
misma versión. A partir de acá, todos los comandos del CLI van con
`npx supabase` adelante.

Alternativa si preferís tenerlo global en Windows: `scoop install supabase`.

---

## 3. Enlazar el repositorio con el proyecto

Desde la raíz del repositorio:

```bash
npx supabase init          # genera supabase/config.toml para tu versión del CLI
npx supabase login         # abre el navegador para autorizar
npx supabase link --project-ref <REF-DEL-PROYECTO>
```

La referencia del proyecto es lo que aparece en la URL del panel:
`https://supabase.com/dashboard/project/AQUI-VA-LA-REF`.

`npx supabase link` pide la contraseña de la base del paso 1.

> `npx supabase init` no pisa las migraciones ni el seed que ya están en la
> carpeta: solo agrega `config.toml`. Después de generarlo, abrilo y
> poné `enable_confirmations = false` en la sección `[auth]`, para no
> depender del envío de correos mientras Resend todavía no está.

---

## 4. Aplicar el esquema

```bash
npx supabase db push
```

Esto corre las ocho migraciones en orden. Tiene que terminar sin
errores. Si alguna falla, **no** se edita una migración ya aplicada: se
crea una nueva con `npx supabase migration new arreglar_lo_que_sea`.

| Migración | Qué hace |
|---|---|
| `000000_tipos_y_enums` | Los 15 tipos enumerados |
| `000100_tablas_base` | Personas, catálogo y datos de referencia |
| `000200_tablas_operacion` | Estadías, pedidos, mensajes, encuestas, cuentas |
| `000300_funciones` | Funciones de dominio, triggers y la vista de accesos rápidos |
| `000400_politicas_rls` | RLS en las 19 tablas, 43 políticas |
| `000500_storage` | Los 3 buckets de imágenes |
| `000600_limites_de_longitud` | Topes de caracteres y formato en todos los campos de texto |
| `000700_correo_mas_corto` | Baja el tope del correo de 254 a 80 |

---

## 5. Cargar los datos de referencia

```bash
npx supabase db push --include-seed
```

Si esa opción no existe en tu versión del CLI, se pega el contenido de
`seed.sql` en el SQL Editor del panel y se ejecuta. Es idempotente: se
puede correr las veces que haga falta sin duplicar nada.

Verificación rápida, en el SQL Editor:

```sql
select
  (select count(*) from mesas)      as mesas,        -- 5
  (select count(*) from productos)  as productos,    -- 12
  (select count(*) from juegos)     as juegos,       -- 3
  (select count(*) from niveles_propina) as propinas;-- 5
```

---

## 6. Crear las cuentas de demostración

Hace falta la clave **service_role**, que está en
Project Settings › API. Es la clave que salta todas las políticas de
seguridad: **no se guarda en ningún archivo del repositorio, no se pega
en el chat del grupo y no se comparte por WhatsApp.** Se usa solo en la
terminal, en el momento.

```bash
# Windows PowerShell
$env:SUPABASE_URL="https://TU-PROYECTO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="ey..."
node supabase/crear-usuarios.mjs
```

```bash
# Linux o macOS
SUPABASE_URL="https://TU-PROYECTO.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="ey..." \
node supabase/crear-usuarios.mjs
```

Crea ocho cuentas, todas con la clave `Tumbo2026`:

| Correo | Perfil | Estado |
|---|---|---|
| mateo@tumbo.demo | Dueño | aprobado |
| ramiro@tumbo.demo | Supervisor | aprobado |
| ignacio@tumbo.demo | Maitre | aprobado |
| matias@tumbo.demo | Mozo | aprobado |
| alicia@tumbo.demo | Cocinero | aprobado |
| bruno@tumbo.demo | Cantinero | aprobado |
| camila@tumbo.demo | Cliente registrado | aprobado |
| pendiente@tumbo.demo | Cliente registrado | **pendiente** |

La última queda sin aprobar a propósito: es la que permite demostrar los
puntos 6, 7 y 8 (listado de pendientes, rechazo y aprobación) sin tener
que registrar a alguien en el momento de la revisión.

---

## 7. Configurar la aplicación

```bash
cp src/environments/environment.example.ts src/environments/environment.local.ts
```

Completar los dos valores con lo que figura en Project Settings › API:

- `supabaseUrl` → **Project URL**
- `supabaseAnonKey` → **anon public**

La clave `anon` sí puede ir en ese archivo: es pública por diseño y
viaja en el paquete de la aplicación. Lo que protege los datos es RLS,
no el secreto de esa clave. La que nunca va es la `service_role`.

`environment.local.ts` está en `.gitignore` y no se commitea.

Arrancar apuntando a Supabase:

```bash
npm run start:local
```

`npm start` sigue levantando el modo demostración, para que el resto del
equipo pueda trabajar sin configurar nada.

---

## 8. Los límites de caracteres

Las migraciones `000600` y `000700` le ponen tope a todos los campos de texto. Los
mismos números están en `src/app/core/validacion/limites.ts`, y hay un
test que compara los dos archivos: si alguien cambia uno y se olvida del
otro, `npm test` falla.

**Están duplicados a propósito.** El formulario es la primera línea: le
muestra el error al usuario antes de que apriete el botón. La base es la
última: nadie la puede saltear, ni siquiera pegándole directo a la API
con la clave anon, que es pública. Si el límite estuviera solo en el
formulario no serviría de nada.

Los principales:

| Campo | Rango |
|---|---|
| Nombres y apellidos | 2 a 50, solo letras (con tildes, ñ, apóstrofo y guión) |
| Correo | hasta 80 |
| Clave | 6 a 72 |
| Nombre de producto | 2 a 60 |
| Descripción de producto | 10 a 300 |
| Motivo de rechazo | 5 a 300 |
| Mensaje de la sala | hasta 500 |

Para armar un formulario nuevo (las altas de los puntos 1 a 4) **no hay
que reescribir estas reglas**:

```ts
import { conLimite, soloLetras, validadoresDeNombre } from '../../core/validacion/validadores';
import { mensajeDeError } from '../../core/validacion/mensajes';

formulario = this.fb.nonNullable.group({
  nombres: ['', validadoresDeNombre('nombres')],
  descripcion: ['', [Validators.required, ...conLimite('descripcionProducto')]],
});

// en el componente
mensajeCampo(campo: string) {
  return mensajeDeError(this.formulario.controls[campo], 'descripción');
}
```

Así todos los formularios dicen los errores igual y coinciden con lo que
acepta la base.

> Ojo con una consecuencia: el trigger de alta ahora **exige** que el
> nombre venga en `user_metadata`. Antes, si no venía, lo sacaba de la
> parte del correo anterior a la arroba, y eso rompía con las reglas
> nuevas (un correo como `m.ferrari@bna.com.ar` daba el nombre
> `m.ferrari`, que tiene un punto). El formulario de registro tiene que
> mandar `nombres`, `apellidos` y `dni`.

---

## 9. Regenerar los tipos cuando cambie el esquema

```bash
npm run supabase:tipos
```

Reescribe `src/app/core/models/base-de-datos.ts`. **Hay que correrlo
cada vez que alguien agregue o cambie una tabla**: ese archivo es lo que
le da tipos reales a las consultas y lo que evita tener que usar `any`,
que `AGENTS.md` prohíbe.

---

## 10. El deploy de Vercel

El repositorio está conectado a Vercel, que compila desde `main`. Como
`environment.ts` va versionado con los valores vacíos, **el deploy
arranca en modo demostración**: no falla, simplemente nunca se conecta a
Supabase y muestra los usuarios del mock.

Para que el deploy use la base real, las credenciales se cargan como
variables de entorno en Vercel, no en el repositorio.

**En Vercel:** Project Settings › Environment Variables

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` |
| `SUPABASE_ANON_KEY` | la clave **publishable / anon** |

Cargalas para los tres entornos (Production, Preview y Development) si
querés que las ramas de los PR también apunten a la base.

**Cómo funciona.** `package.json` tiene un script `prebuild` que npm
ejecuta solo antes de `npm run build`. Ese script
(`tools/generar-entorno.mjs`) lee las variables y escribe
`environment.ts` con los valores reales, dentro del sandbox de Vercel.
Ese archivo modificado nunca vuelve al repositorio.

Si las variables no están, el script no toca nada y la aplicación queda
en modo demostración. Por eso quien clona el repositorio puede levantarlo
sin configurar nada.

Además, el script se niega a escribir si detecta que le cargaron la clave
**secret** en lugar de la publishable, porque esa clave salta todas las
políticas de seguridad y jamás debe viajar dentro de la aplicación.

> **Esto no vuelve secreta la clave.** TUMBO es una aplicación de
> navegador: cualquier valor que use termina dentro del JavaScript que se
> descarga el usuario. Está comprobado — después de compilar, la clave
> aparece en `dist/tumbo/browser/main-*.js`. La clave publishable está
> diseñada para ser pública y lo que protege los datos es RLS. Lo que se
> gana con las variables de entorno es mantenerla fuera del historial de
> git, que es lo que pide el `AGENTS.md`, y poder rotarla sin reescribir
> commits.

**Decisión para el equipo:** hoy la URL de Vercel muestra el mock, lo que
es cómodo para enseñar avances sin tocar la base. Conectarla a Supabase
significa que cualquiera con el link entra a los datos reales. Con RLS
puesto no es peligroso, pero conviene decidirlo entre los cuatro.

---

## Cómo comprobar que quedó bien

Con `npm run start:local` andando:

- [ ] La pantalla de ingreso muestra los accesos rápidos con los nombres de la base, no los del mock
- [ ] `mateo@tumbo.demo` + `Tumbo2026` entra y el panel lo saluda como Dueño
- [ ] `pendiente@tumbo.demo` **no** entra, y explica que su cuenta está pendiente de aprobación
- [ ] Al recargar la página (F5) estando adentro, la sesión se mantiene
- [ ] Cerrar sesión vuelve al ingreso, y el botón "atrás" del navegador no reabre el panel
- [ ] En Application › Local Storage del navegador, después de cerrar sesión no queda ningún token de Supabase
- [ ] Ir a `/inicio` escribiendo la URL a mano, sin sesión, redirige al ingreso
- [ ] En el campo de correo, el navegador no deja escribir más de 80 caracteres
- [ ] Escribir una clave de 3 caracteres muestra "La clave tiene que tener al menos 6 caracteres."
- [ ] `verificar-esquema.sql` devuelve OK en los 13 controles

---

## Trampas conocidas

**El proyecto se pausa solo.** En el plan gratuito, después de **7 días
de baja actividad** Supabase suspende el proyecto y la primera consulta
falla mientras despierta. Con revisiones semanales es perfectamente
posible llegar a la revisión con la base dormida. Conviene entrar al
panel la noche anterior a cada revisión.

**Los QR ya generados sí coinciden con el seed.** Se verificó
decodificando los PNG de `docs/imagenes/`: la entrada codifica
`TUMBO://ingreso`, las mesas `TUMBO://mesa/tumbo-mesa-1` a `-5` y las
propinas `TUMBO://propina/0` a `/20`. El `seed.sql` usa exactamente esos
tokens, así que no hay que regenerar ninguna imagen. Si alguien cambia
los tokens del seed, hay que regenerar los PNG.

**No editar migraciones ya aplicadas.** Una vez que `npx supabase db push` corrió, esa
migración quedó registrada. Cambiar el archivo hace que el historial del
repositorio y el de la base digan cosas distintas. Todo cambio va en una
migración nueva.

**No tocar tablas desde el panel web.** Es cómodo y rompe el esquema
versionado: el repositorio deja de reflejar la base y el próximo
`npx supabase db push` de otro integrante puede fallar o pisar algo.
