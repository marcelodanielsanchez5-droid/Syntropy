# Syntropy

Aplicación multiplataforma de organización académica: años de curso, asignaturas, tareas, calendario, horario y calificaciones. Una sola base de código para web, Windows, Android e iOS.

**Estado actual:** Fase 1 aprobada el 10 de noviembre de 2026. Fase 2 implementada y probada contra Supabase real en sus flujos principales el 11 de noviembre de 2026; todavía no está aprobada. Quedan pendientes el aislamiento con dos cuentas, el enlace de recuperación por correo y la instalación de la PWA en un dispositivo.

---

## Revisar la Fase 1

1. Abrir [`docs/fase-1/presentacion.html`](./docs/fase-1/presentacion.html) en el navegador.
2. Leer el índice y el resumen en [`docs/fase-1/README.md`](./docs/fase-1/README.md).
3. Consultar las decisiones aprobadas en [`docs/fase-1/07-decisiones-pendientes.md`](./docs/fase-1/07-decisiones-pendientes.md).

El usuario aprobó todas las recomendaciones D1–D25. La Fase 2 está implementada en el cliente y se probó contra Supabase real en sus flujos principales; falta completar la validación de dos cuentas y la recuperación por correo.

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

Las migraciones [`001_schema_inicial.sql`](./supabase/migrations/001_schema_inicial.sql) y [`002_ajustes_fase2.sql`](./supabase/migrations/002_ajustes_fase2.sql) se aplicaron en el proyecto real de Supabase el 11 de noviembre de 2026. Se probaron con datos reales el registro, la confirmación por correo, el onboarding, el perfil, el avatar, los años de curso, las asignaturas, el cambio de contraseña, RLS y la eliminación de cuenta. La eliminación de cuenta ahora limpia el avatar y los archivos de Storage antes de borrar el usuario.

El cliente pasa `npm run typecheck`, `npm test` (52 pruebas) y `npm run build`. Lighthouse dio 100 en accesibilidad, buenas prácticas y SEO en ingreso y registro.

**Pendientes para aprobar la Fase 2:** la prueba de aislamiento con dos cuentas reales, el enlace de recuperación de contraseña (el servicio de correo gratuito de Supabase devolvió `over_email_send_rate_limit`) y la instalación de la PWA en un dispositivo. Tauri, Android e iOS no se pudieron compilar en esta máquina. Storage se probó con avatares; `academic-files` se usará en una fase posterior. No se debe considerar el proyecto “listo para producción” (ver [`docs/fase-2/README.md`](./docs/fase-2/README.md) y la sección 14 de [`06-modelo-datos.md`](./docs/fase-1/06-modelo-datos.md)).

---

## Variables de entorno

Copiar [`.env.example`](./.env.example) a `.env.local` y completar con credenciales propias. **No commitear `.env.local` ni claves reales.** La `service_role` de Supabase nunca va en el frontend.

Guía paso a paso para crear el proyecto, configurar Auth, aplicar las migraciones y ejecutar el checklist real: [`docs/fase-1/08-configuracion-supabase.md`](./docs/fase-1/08-configuracion-supabase.md).

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

1. [x] crear el proyecto de Supabase y completar `.env.local`;
2. [x] aplicar las migraciones 001 y 002;
3. [x] probar registro, confirmación, perfil, años, asignaturas, cambio de contraseña, RLS y borrado de cuenta con datos reales;
4. [ ] repetir el aislamiento con dos cuentas confirmadas;
5. [ ] probar el enlace real de recuperación de contraseña cuando se libere el límite de correo o se configure SMTP;
6. [ ] instalar la PWA en un dispositivo y repetir la revisión visual con datos reales.

El reporte de validación está en [`docs/fase-2/README.md`](./docs/fase-2/README.md).

El detalle de las decisiones aprobadas está en [`docs/fase-1/07-decisiones-pendientes.md`](./docs/fase-1/07-decisiones-pendientes.md).
