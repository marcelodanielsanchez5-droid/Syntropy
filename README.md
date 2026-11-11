# Syntropy

Aplicación multiplataforma de organización académica: años de curso, asignaturas, tareas, calendario, horario y calificaciones. Una sola base de código para web, Windows, Android e iOS.

**Estado actual:** Fase 1 aprobada el 10 de noviembre de 2026. Fase 2 implementada localmente (autenticación, perfil, años de curso y asignaturas), pendiente de probar contra un proyecto real de Supabase.

---

## Revisar la Fase 1

1. Abrir [`docs/fase-1/presentacion.html`](./docs/fase-1/presentacion.html) en el navegador.
2. Leer el índice y el resumen en [`docs/fase-1/README.md`](./docs/fase-1/README.md).
3. Consultar las decisiones aprobadas en [`docs/fase-1/07-decisiones-pendientes.md`](./docs/fase-1/07-decisiones-pendientes.md).

El usuario aprobó todas las recomendaciones D1–D25. La Fase 2 ya está implementada en el cliente y sus pruebas locales pasan; falta validarla con Supabase real.

---

## Contenido de la Fase 1

- Análisis, alcance y contradicciones del documento maestro.
- Arquitectura técnica, stack, seguridad, empaquetado y entorno.
- Mapa de navegación de escritorio y móvil.
- Wireframes y estados de las pantallas principales.
- Sistema de diseño: identidad, tokens, componentes y accesibilidad.
- Modelo de datos PostgreSQL con RLS y migración inicial.
- Decisiones D1–D25 con recomendaciones e impacto.

El detalle está en [`docs/fase-1/`](./docs/fase-1/).

---

## Tecnologías previstas

React 19 · TypeScript · Vite · Tailwind CSS · React Router · TanStack Query · Supabase (Auth, PostgreSQL, Storage, RLS) · FullCalendar · PWA · Tauri 2 · Capacitor · Resend (Fase 7).

Versiones, estructura y justificación: [`docs/fase-1/02-arquitectura-tecnica.md`](./docs/fase-1/02-arquitectura-tecnica.md).

---

## Estado de validación

Las migraciones [`001_schema_inicial.sql`](./supabase/migrations/001_schema_inicial.sql) y [`002_ajustes_fase2.sql`](./supabase/migrations/002_ajustes_fase2.sql) se ejecutaron correctamente en PostgreSQL 17 embebido (PGlite). Se probaron RLS, triggers, restricciones principales, consentimientos D8, nodo opcional D7, activación de año y eliminación de cuenta.

El cliente pasa `npm run typecheck`, `npm test` (51 pruebas) y `npm run build`. Lighthouse dio 100 en accesibilidad, buenas prácticas y SEO en ingreso y registro.

**Nada de esto se ejecutó todavía en Supabase real.** Storage, Edge Functions y los empaquetados no se probaron. La revisión visual se hizo en 1440, 800 y 390 px con datos simulados, no contra un proyecto real. La PWA se verificó localmente (service worker, manifest y recarga offline), pero no se instaló en un dispositivo. No se debe considerar el proyecto “listo para producción” (ver la sección 14 de [`06-modelo-datos.md`](./docs/fase-1/06-modelo-datos.md)).

---

## Variables de entorno

Copiar [`.env.example`](./.env.example) a `.env.local` y completar con credenciales propias. **No commitear `.env.local` ni claves reales.** La `service_role` de Supabase nunca va en el frontend.

---

## Próximo hito

La Fase 2 comprende:

1. [x] proyecto Vite + React + TypeScript y sistema de diseño base;
2. [x] autenticación con Supabase, confirmación de correo y recuperación de contraseña en el cliente;
3. [x] perfil y consentimientos (13+, términos y privacidad);
4. [x] años de curso con un solo año activo;
5. [x] asignaturas con color, docentes y datos de información;
6. [x] pruebas de lógica, typecheck y build.

Falta lo indispensable para aprobar la fase:

1. crear el proyecto de Supabase y completar `.env.local`;
2. aplicar las migraciones 001 y 002;
3. probar registro, confirmación, recuperación, perfil, años, asignaturas y borrado de cuenta con datos reales;
4. instalar la PWA en un dispositivo y repetir la revisión visual con datos reales.

El detalle de las decisiones aprobadas está en [`docs/fase-1/07-decisiones-pendientes.md`](./docs/fase-1/07-decisiones-pendientes.md).
