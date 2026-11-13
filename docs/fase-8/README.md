# Fase 8 — Pruebas, pulido y lanzamiento

**Estado:** la parte que se puede hacer desde el código quedó implementada el 13 de noviembre de 2026 y se probó con pruebas automáticas, con el validador SQL y en el navegador, contra una base PostgreSQL local con las migraciones reales. El 13 de noviembre de 2026 se validó además contra el proyecto real de Supabase (154/154 comprobaciones de API/RLS, Storage y pantallas principales; ver [`04-validacion-real.md`](./04-validacion-real.md)). La implementación y la validación de las fases 3 a 8 y la decisión D29 fueron **aprobadas por el usuario el 13 de noviembre de 2026**. **Faltan las tareas de lanzamiento que necesitan personas, cuentas o datos reales:** el envío de recordatorios con Resend, las pruebas con estudiantes, los datos del responsable, la revisión legal profesional y la publicación.

**Alcance (documento maestro):** pruebas con 5 a 10 estudiantes reales y ajustes de usabilidad; corrección de errores y optimización; política de privacidad y términos («son datos de estudiantes, posiblemente menores»); publicación y plan de mejoras futuras (logros, niveles y puntos de experiencia). Es la última fase del plan.

| Tarea del documento maestro | Estado |
|---|---|
| Pruebas con 5 a 10 estudiantes | Plan listo: [`01-plan-de-pruebas.md`](./01-plan-de-pruebas.md). Las sesiones faltan. |
| Corrección de errores y optimización | Hecho: carga inicial −25 %, etiquetas de fase fuera de la interfaz. |
| Política de privacidad y términos | Hecho, con versiones y aceptación. Falta completar el responsable y la revisión profesional. |
| Publicación | Lista de pasos: [`02-lanzamiento.md`](./02-lanzamiento.md). No se publicó. |
| Plan de mejoras futuras | Hecho: [`03-mejoras-futuras.md`](./03-mejoras-futuras.md). |

---

## 1. Qué se agregó

| Área | Qué hace |
|---|---|
| Términos de uso y política de privacidad | Textos completos (15 y 13 secciones) que describen lo que la app hace de verdad: proveedores (Supabase y Resend), datos en el dispositivo, recordatorios, biblioteca, límites, menores, plazos y derechos de la Ley 25.326 y la leyenda de la Agencia de Acceso a la Información Pública. Cada uno con resumen «Lo esencial», índice y fecha de vigencia. |
| Datos del responsable | Nombre, correo y domicilio salen de `VITE_LEGAL_OWNER`, `VITE_LEGAL_CONTACT_EMAIL` y `VITE_LEGAL_LOCATION`, así el repositorio no guarda datos personales. Si faltan, la página lo avisa y el texto muestra «[dato pendiente]». |
| Versiones y aceptación | Cada perfil guarda qué versión aceptó. Si la versión vigente cambia, al ingresar aparece una pantalla con qué cambió y hay que aceptar para seguir (o descargar los datos, eliminar la cuenta o cerrar sesión). Las cuentas creadas antes quedan registradas con el borrador del 10/11 y se les pide aceptar. |
| Descargar mis datos | En Configuración → Cuenta y en la pantalla de aceptación: un JSON con el perfil, las preferencias y las 13 tablas del usuario, más la lista de sus archivos. Es el derecho de acceso de la política de privacidad. |
| Configuración → Cuenta | Muestra cuándo se aceptó la versión vigente, con enlaces a los dos textos. |
| Carga inicial | Todas las pantallas se cargan aparte. Además, la campana de avisos arrastraba zod sin necesidad; se corrigió. |
| Etiquetas | La interfaz ya no muestra números de fase (eran internos): el ingreso y la barra lateral muestran la versión. |

### 1.1. Carga inicial

| | Antes | Después |
|---|---|---|
| JavaScript inicial | ~1.044 kB | 779 kB |
| Comprimido (gzip) | ~303 kB | 230 kB |

Lo que queda es React, el enrutador, el cliente de Supabase, TanStack Query, la sesión y el marco de la app. El cliente de Supabase incluye el módulo de tiempo real (~56 kB) que la app no usa; quitarlo queda en el plan de mejoras.

---

## 2. Textos legales

### 2.1. Migración `006_versiones_legales.sql`

1. Agrega `terms_version` y `privacy_version` a `profiles`. Las cuentas que ya habían aceptado quedan con `borrador-2026-11-10`.
2. `current_legal_versions()` devuelve la versión vigente de cada texto. **Tiene que coincidir con `LEGAL_VERSIONS`** en [`src/features/legal/legal-versions.ts`](../../src/features/legal/legal-versions.ts); una prueba automática lo controla.
3. Al registrarse, un disparador guarda la versión que mostró la app solo si es la vigente.
4. `accept_legal_documents()` valida la versión (`SY007`) y, si falta, la confirmación de edad (`SY008`), y guarda las fechas.
5. El cliente sigue sin poder escribir los consentimientos ni las versiones. Al final comprueba los permisos; se puede ejecutar más de una vez.

### 2.2. Cómo publicar una versión nueva

1. Cambiar el texto en [`legal-documents.ts`](../../src/features/legal/legal-documents.ts) y completar `changes` con lo que cambió.
2. Subir la versión en `legal-versions.ts` (fecha `AAAA-MM-DD`) y la fecha de vigencia.
3. Crear una migración que reemplace `current_legal_versions()` con la misma versión.
4. Publicar la app y aplicar la migración juntas: la próxima vez que cada usuario ingrese, se le pide aceptar.

### 2.3. Decisión D29 (aprobada el 13 de noviembre de 2026)

| Tema | Decisión |
|---|---|
| Jurisdicción | República Argentina: Ley 25.326 de datos personales y Ley 24.240 de defensa del consumidor. La app está en español rioplatense y la cuenta de prueba usa la zona de Buenos Aires. Si el responsable está en otro país, hay que reescribir partes del texto. |
| Menores | 13 años o más (D8); de 13 a 17, con conocimiento y autorización de padres o tutores. |
| Aceptación | Toda versión nueva se acepta al ingresar; sin aceptar no se usa la app, pero se pueden descargar los datos y eliminar la cuenta. |
| Compromisos | Gratuito hoy y sin cobros sin aceptación expresa; aviso de 30 días antes de cerrar el servicio; si se reducen los límites, no se borra lo ya guardado; aviso por correo ante un incidente de seguridad. |
| Datos del responsable | Por variables de entorno, públicas en la app pero fuera del repositorio. |

**Aprobada por el usuario el 13 de noviembre de 2026.**

**Importante:** los textos se redactaron con cuidado, pero no son asesoramiento legal. Antes de publicar los tiene que revisar un profesional de la jurisdicción (ya lo pedía D8), que además puede indicar si corresponde inscribir la base de datos en el registro de la Agencia de Acceso a la Información Pública.

---

## 3. Pruebas

- **Automáticas (15 nuevas):** datos del responsable (limpieza, correo inválido, variables faltantes), textos completos sin «[dato pendiente]», marcas visibles cuando faltan datos, numeración y secciones, contenidos obligatorios (Ley 25.326, Agencia de Acceso a la Información Pública, proveedores, plazos, menores, descarga de datos, límites D27 y D28, Ley 24.240), **igualdad de versiones entre la app y la migración 006**, qué hay que aceptar según el perfil, y la descarga (todas las tablas, archivos sin enlaces, nombre del archivo). Total: 284 pruebas en 17 archivos.
- **Base de datos (PGlite con roles y RLS), 11 nuevas:** versión guardada al registrarse, versión vieja descartada, `SY007` y `SY008`, aceptación registrada, el cliente no escribe versiones, sin sesión no se acepta pero se leen las versiones, cuentas anteriores con el borrador y migración repetible. Total con las fases anteriores: 77/77.
- **Navegador:** la cuenta de prueba sin versión ve la pantalla de aceptación; la descarga trae las 13 tablas (62 registros) y 3 archivos; al aceptar entra al inicio; Configuración muestra la aceptación; la política y los términos se leen bien en celular sin desborde y avisan que faltan los datos del responsable; una cuenta nueva registrada desde la app no ve la pantalla de aceptación; todas las pantallas cargan con la nueva división. Se corrigió una concordancia («términos de uso completa»).
- **Supabase real (13/11/2026):** 154/154 comprobaciones de API/RLS sobre las migraciones 001 a 006; perfil y consentimientos, tareas, exámenes y sesiones, horario, calificaciones, nodos y conexiones, biblioteca y Storage, recordatorios y aislamiento A/B. En el navegador se abrieron inicio, calendario, horario, calificaciones, asignatura, nodos, biblioteca, configuración y textos legales; se crearon una tarea, un bloque de horario y un enlace reales desde la interfaz, y se descargó el JSON de datos. Detalle: [`04-validacion-real.md`](./04-validacion-real.md).

### Limitaciones

- La validación real cubrió API/RLS, Storage y pantallas principales, pero no el envío de recordatorios con Resend ni pg_cron: la Edge Function todavía no está desplegada. Tampoco se probaron Safari/Firefox, la PWA instalada ni la restauración de un respaldo. La revisión legal, las pruebas con estudiantes y la publicación no se pueden hacer desde acá.
- La descarga no incluye el contenido de los archivos (se listan sus rutas; se bajan desde la biblioteca y el perfil).
- La pantalla de aceptación se probó en escritorio; los textos legales, también en celular.
