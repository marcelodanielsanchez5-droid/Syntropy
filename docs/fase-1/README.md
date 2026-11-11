# Syntropy — Fase 1

**Diseño, arquitectura y modelo de datos**  
**Estado:** aprobada por el usuario el 10 de noviembre de 2026  
**Siguiente fase:** Fase 2 — implementada y validada contra Supabase real, incluido el aislamiento con dos cuentas y la recuperación por correo; pendiente de aprobación explícita.

> Esta fase no contiene código de la aplicación. Su objetivo fue acordar el producto, la técnica y el modelo antes de construir. La aprobación quedó registrada en [`07-decisiones-pendientes.md`](./07-decisiones-pendientes.md).

---

## 1. Empezar por la presentación

La forma más rápida de revisar la fase es abrir:

**[`presentacion.html`](./presentacion.html)**

Incluye portada, arquitectura, navegación, wireframes interactivos, sistema de diseño, modelo de datos y decisiones. Se puede abrir directamente en el navegador; si la fuente local no carga con `file://`, servir la carpeta por HTTP.

El repositorio está inicializado en Git (rama `main`) y el proyecto Vite ya tiene las dependencias instaladas. La presentación es un archivo HTML autónomo que usa las fuentes y logos de `docs/assets/`.

---

## 2. Documentos de la fase

| Documento | Qué resuelve |
|---|---|
| [`01-analisis-y-alcance.md`](./01-analisis-y-alcance.md) | Interpretación del documento maestro y de las 6 referencias; alcance del MVP; contradicciones y riesgos. |
| [`02-arquitectura-tecnica.md`](./02-arquitectura-tecnica.md) | Stack, estructura del repositorio, capas, seguridad, empaquetado, pruebas y entorno. |
| [`03-mapa-navegacion.md`](./03-mapa-navegacion.md) | Rutas, navegación de escritorio y móvil, flujos y estados. |
| [`04-wireframes.md`](./04-wireframes.md) | Descripción detallada de las pantallas y sus estados. |
| [`05-sistema-diseno.md`](./05-sistema-diseno.md) | Identidad, tokens, tipografía, componentes, nodos, accesibilidad y movimiento. |
| [`06-modelo-datos.md`](./06-modelo-datos.md) | Entidades, relaciones, fórmulas de notas, RLS y validación de la migración. |
| [`07-decisiones-pendientes.md`](./07-decisiones-pendientes.md) | D1–D25, recomendaciones, impacto y checklist de aprobación. |
| [`08-configuracion-supabase.md`](./08-configuracion-supabase.md) | Pasos para crear el proyecto, aplicar las migraciones y probar la Fase 2 contra Supabase real. |
| [`../fase-2/README.md`](../fase-2/README.md) | Reporte de validación real de la Fase 2, evidencia de RLS y pendientes. |
| [`../../supabase/migrations/001_schema_inicial.sql`](../../supabase/migrations/001_schema_inicial.sql) | Migración PostgreSQL inicial. |
| [`../../supabase/migrations/002_ajustes_fase2.sql`](../../supabase/migrations/002_ajustes_fase2.sql) | Ajustes D7/D8, activación de año y eliminación de cuenta. |

### Recursos visuales

- [`../assets/logo-mark.svg`](../assets/logo-mark.svg) — símbolo provisional a color.
- [`../assets/logo-mark-mono.svg`](../assets/logo-mark-mono.svg) — versión monocroma.
- [`../assets/logo-lockup.svg`](../assets/logo-lockup.svg) — lockup horizontal.
- [`../assets/app-icon.svg`](../assets/app-icon.svg) — ícono cuadrado provisional.
- [`../assets/Inter-Variable.woff2`](../assets/Inter-Variable.woff2) — tipografía local.

El logo es **provisional**. Respeta la dirección del documento maestro (cerebro, circuitos, nodos, rosa y morado), pero debe refinarse antes de publicar (D10).

---

## 3. Resumen de la propuesta

### Producto

Una app académica personal y multiplataforma:

- años de curso con nombre y fechas;
- asignaturas como carpetas con color;
- tareas, exámenes y plan de estudio;
- calendario general e individual;
- horario semanal;
- calificaciones con pesos, promedio y proyección;
- nodos de conocimiento y biblioteca preparados para después del MVP.

### Stack

- **Frontend:** React 19 + TypeScript 5.9 + Vite 8 + React Router 7 + Tailwind 4.
- **Datos remotos:** Supabase (Auth, PostgreSQL, Storage, RLS, Edge Functions).
- **Estado y formularios:** TanStack Query + React Hook Form + Zod.
- **Calendario:** FullCalendar 6.1.x (se recomienda no usar 7.x todavía).
- **Nodos:** React Flow 12 cuando llegue la Fase 5.
- **Web:** PWA.
- **Windows:** Tauri 2 (recomendado, pendiente D1).
- **Android/iOS:** Capacitor 8.
- **Correo:** Resend solo desde Edge Functions (Fase 7).

### MVP

Fases 2, 3 y 4: autenticación y base académica; tiempo y tareas; calificaciones. Los nodos, la biblioteca, el correo y la gamificación quedan preparados en el modelo, pero no se activan en el MVP.

---

## 4. Decisiones aprobadas

El usuario aprobó todas las recomendaciones el 10 de noviembre de 2026:

- **D1** — PWA + Tauri 2.
- **D2** — nombre libre + fechas, con un solo año activo.
- **D3** — pesos directos por evaluación.
- **D4** — escala global + copia por evaluación.
- **D5** — nodo raíz como contenedor (Fase 5).
- **D6** — campana con próximos vencimientos.
- **D7** — nodo opcional en biblioteca («Sin tema»).
- **D8** — edad mínima 13+ con aceptación explícita.
- **D9** — caché por usuario en IndexedDB.
- **D10** — dirección del logo aprobada; refinamiento antes de publicar.
- **D12** — `com.syntropy.app`, versión `0.1.0`.

El registro completo de D1–D25 y sus consecuencias técnicas está en [`07-decisiones-pendientes.md`](./07-decisiones-pendientes.md).

---

## 5. Qué está validado y qué no

### Validado localmente

Las migraciones `001_schema_inicial.sql` y `002_ajustes_fase2.sql` se ejecutaron en **PostgreSQL 17 embebido (PGlite)** y se comprobó:

- creación de las 14 tablas;
- trigger de alta de perfil y copia de consentimientos D8;
- restricción de consentimientos completos o ausentes;
- fuente sin nodo (D7);
- aislamiento RLS entre dos usuarios;
- un solo año activo por usuario y activación transaccional por RPC;
- eliminación de la propia cuenta por RPC;
- un solo nodo raíz por asignatura;
- restricción de escala de notas;
- unicidad de enlaces de nodos;
- borrado bloqueado cuando un nodo tiene fuentes;
- desvinculación de tareas al borrar un nodo;
- enlaces entre asignaturas distintas.

En el cliente, `npm run typecheck`, `npm test` (55 pruebas en 5 archivos) y `npm run build` pasan. Lighthouse dio 100 en accesibilidad, buenas prácticas y SEO en las pantallas de ingreso y registro.

### Validación parcial o pendiente

- El aislamiento con dos cuentas confirmadas se completó con 19/19 comprobaciones, incluidos años, asignaturas y Storage.
- `citext` se simuló con un dominio de texto; en Supabase se probaron correos y usuarios en minúsculas, no una prueba específica de mayúsculas/minúsculas.
- Storage se probó con avatares y con un PDF mínimo en `academic-files`; falta un archivo real de la aplicación. Las Edge Functions todavía no se probaron.
- El trigger se probó con el flujo real de confirmación de correo.
- El frontend se ejecutó contra Supabase real para registro, confirmación, onboarding, perfil, avatar, años, asignaturas, contraseña, RLS y eliminación de cuenta.
- El enlace real de recuperación de contraseña se abrió, cambió la contraseña y el login anterior dejó de funcionar (`400`).
- La PWA se probó con service worker, manifest y recarga offline en local; no se instaló en un dispositivo real.
- Los empaquetados de Windows, Android e iOS no se compilaron.
- iOS requiere macOS o CI; no se puede compilar en Windows.

No se debe declarar la app como “probada” ni “lista para producción”. La sección 14 de [`06-modelo-datos.md`](./06-modelo-datos.md) detalla las limitaciones.

---

## 6. Entorno actual

Al cerrar la Fase 1 se instalaron Node.js 26.13.0 y Git 2.56.0. Node 26 es una versión par y supera el mínimo previsto (24 LTS). Sigue pendiente confirmar Visual Studio Code, la cuenta de GitHub y la cuenta de Supabase.

Para la Fase 2 se necesita:

1. [x] Node.js 26.13.0.
2. [x] Git 2.56.0.
3. [ ] Visual Studio Code u otro editor.
4. [ ] Cuenta de GitHub.
5. [ ] Cuenta y proyecto de Supabase.
6. [ ] Supabase CLI mediante `npx supabase`.
7. [ ] Chrome o Edge actualizado.

Rust, Android Studio y Xcode se instalan cuando corresponda a cada empaquetado, no antes de que la app web funcione.

---

## 7. Checklist de aprobación

- [x] D1 resuelta.
- [x] D2 resuelta.
- [x] D3 resuelta.
- [x] D4 resuelta.
- [x] D8 resuelta.
- [x] D9 resuelta.
- [x] D12 resuelta.
- [x] Logo aprobado en dirección; refinamiento pendiente antes de publicar.
- [x] Mapa de navegación aprobado.
- [x] Wireframes aprobados.
- [x] Sistema de diseño aprobado.
- [x] Modelo de datos aprobado.

---

## 8. Después de la aprobación

1. [x] Se registran las decisiones finales en `07-decisiones-pendientes.md`.
2. [x] Se ajusta la migración por D7 y D8 (`002_ajustes_fase2.sql`, validada localmente y aplicada en Supabase real).
3. [x] Se prepara Node.js y Git.
4. [x] Se crea el proyecto Vite + React + TypeScript.
5. [x] Se configura el proyecto de desarrollo de Supabase.
6. [x] Se implementa la Fase 2 en el cliente: autenticación, perfil, años de curso y asignaturas.
7. [x] Se prueban los flujos principales de la Fase 2 contra Supabase real.
8. [x] Se completa el aislamiento con dos cuentas y el enlace de recuperación por correo.
