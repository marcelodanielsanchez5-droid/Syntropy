# Syntropy

Aplicación multiplataforma de organización académica: años de curso, asignaturas, tareas, calendario, horario y calificaciones. Una sola base de código para web, Windows, Android e iOS.

**Estado actual:** Fase 1 aprobada el 10 de noviembre de 2026. Fase 2 aprobada por el usuario el 11 de noviembre de 2026. Para producción quedan SMTP propio, instalación de la PWA en un dispositivo, empaquetado Tauri/Android/iOS y mejoras de bundle y auditoría.

---

## Revisar la Fase 1

1. Abrir [`docs/fase-1/presentacion.html`](./docs/fase-1/presentacion.html) en el navegador.
2. Leer el índice y el resumen en [`docs/fase-1/README.md`](./docs/fase-1/README.md).
3. Consultar las decisiones aprobadas en [`docs/fase-1/07-decisiones-pendientes.md`](./docs/fase-1/07-decisiones-pendientes.md).

El usuario aprobó todas las recomendaciones D1–D25 y la decisión posterior D26 (bloqueo del borrado del año activo). La Fase 2 fue aprobada por el usuario el 11 de noviembre de 2026.

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

Las migraciones [`001_schema_inicial.sql`](./supabase/migrations/001_schema_inicial.sql) y [`002_ajustes_fase2.sql`](./supabase/migrations/002_ajustes_fase2.sql) se aplicaron en el proyecto real de Supabase el 11 de noviembre de 2026. Se probaron con datos reales el registro, la confirmación por correo, el onboarding, el perfil, el avatar, los años de curso, las asignaturas, el cambio de contraseña, la recuperación por correo, RLS con dos cuentas, Storage y la eliminación de cuenta. El aislamiento A/B pasó 19/19 comprobaciones; la recuperación real cambió la contraseña y el login anterior dejó de funcionar. La eliminación de cuenta limpia los archivos de `avatars` y `academic-files` antes de borrar el usuario.

El cliente pasa `npm run typecheck`, `npm test` (55 pruebas en 5 archivos) y `npm run build` (966,74 kB, 279,91 kB gzip). Lighthouse dio 100 en accesibilidad, buenas prácticas y SEO en ingreso y registro.

**Pendientes antes de producción:** configurar SMTP propio, instalar la PWA en un dispositivo, compilar Tauri/Android/iOS, dividir el bundle, revisar los avisos de desarrollo de `npm audit`, probar `academic-files` con un archivo real y medir índices. No se debe considerar el proyecto “listo para producción” (ver [`docs/fase-2/README.md`](./docs/fase-2/README.md) y la sección 14 de [`06-modelo-datos.md`](./docs/fase-1/06-modelo-datos.md)).

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
4. [x] repetir el aislamiento con dos cuentas confirmadas (19/19);
5. [x] probar el enlace real de recuperación de contraseña y el cambio desde la app;
6. [ ] instalar la PWA en un dispositivo y repetir la revisión visual con datos reales.

La Fase 2 fue aprobada por el usuario el 11 de noviembre de 2026. El reporte de validación está en [`docs/fase-2/README.md`](./docs/fase-2/README.md).

El detalle de las decisiones aprobadas está en [`docs/fase-1/07-decisiones-pendientes.md`](./docs/fase-1/07-decisiones-pendientes.md).
