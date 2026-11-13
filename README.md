# Syntropy

Aplicación multiplataforma de organización académica: años de curso, asignaturas, tareas, calendario, horario y calificaciones. Una sola base de código para web, Windows, Android e iOS.

**Estado actual:** Fase 1 aprobada el 10 de noviembre de 2026. Fase 2 aprobada el 11 de noviembre de 2026. Fases 3 (calendario y tareas), 4 (horario y calificaciones), 5 (nodos de conocimiento), 6 (biblioteca) y 7 (recordatorios por correo) implementadas, **validadas técnicamente contra el proyecto real de Supabase** y **aprobadas por el usuario el 13 de noviembre de 2026** (154/154 comprobaciones de API/RLS, Storage y pantallas principales; ver [`docs/fase-8/04-validacion-real.md`](./docs/fase-8/04-validacion-real.md)). De la Fase 8 (la última del plan) está hecho lo que depende del código y la validación real, y la decisión D29 fue aprobada. **Faltan el envío real de recordatorios con Resend/pg_cron, los datos del responsable, la revisión legal profesional, el hosting, los respaldos, las pruebas con estudiantes y la publicación** (ver [`docs/fase-8/02-lanzamiento.md`](./docs/fase-8/02-lanzamiento.md)).

---

## Revisar la Fase 1

1. Abrir [`docs/fase-1/presentacion.html`](./docs/fase-1/presentacion.html) en el navegador.
2. Leer el índice y el resumen en [`docs/fase-1/README.md`](./docs/fase-1/README.md).
3. Consultar las decisiones aprobadas en [`docs/fase-1/07-decisiones-pendientes.md`](./docs/fase-1/07-decisiones-pendientes.md).

El usuario aprobó todas las recomendaciones D1–D25 y las decisiones posteriores D26 (bloqueo del borrado del año activo), D27 (límites de la biblioteca), D28 (reglas de los recordatorios) y D29 (textos legales, el 13 de noviembre de 2026). La Fase 2 fue aprobada por el usuario el 11 de noviembre de 2026; las fases 3 a 8, el 13 de noviembre de 2026.

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

**Fases 3 a 8:** ver [`docs/fase-3/README.md`](./docs/fase-3/README.md), [`docs/fase-4/README.md`](./docs/fase-4/README.md), [`docs/fase-5/README.md`](./docs/fase-5/README.md), [`docs/fase-6/README.md`](./docs/fase-6/README.md), [`docs/fase-7/README.md`](./docs/fase-7/README.md) y [`docs/fase-8/README.md`](./docs/fase-8/README.md). Se probaron con pruebas automáticas, en el navegador contra PostgreSQL local y, el 13 de noviembre de 2026, **contra el proyecto real de Supabase**: 154/154 comprobaciones de API/RLS, Storage y pantallas principales. Las migraciones [`003_proteger_consentimientos.sql`](./supabase/migrations/003_proteger_consentimientos.sql), [`004_biblioteca.sql`](./supabase/migrations/004_biblioteca.sql), [`005_recordatorios.sql`](./supabase/migrations/005_recordatorios.sql) y [`006_versiones_legales.sql`](./supabase/migrations/006_versiones_legales.sql) **ya se aplicaron** en el proyecto real. La Edge Function [`send-reminders`](./supabase/functions/send-reminders/) **todavía no se desplegó** y pg_cron no está programado, así que los correos de recordatorio solo se probaron con Resend simulado. Detalle: [`docs/fase-8/04-validacion-real.md`](./docs/fase-8/04-validacion-real.md).

Las migraciones [`001_schema_inicial.sql`](./supabase/migrations/001_schema_inicial.sql) y [`002_ajustes_fase2.sql`](./supabase/migrations/002_ajustes_fase2.sql) se aplicaron en el proyecto real de Supabase el 11 de noviembre de 2026; las migraciones `003` a `006`, el 13 de noviembre de 2026. Se probaron con datos reales el registro, la confirmación por correo, el onboarding, el perfil, el avatar, los años de curso, las asignaturas, el cambio de contraseña, la recuperación por correo, RLS con dos cuentas, Storage, tareas, exámenes, horario, calificaciones, nodos, biblioteca, recordatorios y la eliminación de cuenta. El aislamiento A/B pasó 19/19 comprobaciones en la Fase 2 y 154/154 en la validación de las fases 3 a 8. La recuperación real cambió la contraseña y el login anterior dejó de funcionar. La eliminación de cuenta limpia los archivos de `avatars` y `academic-files` antes de borrar el usuario.

El cliente pasa `npm run typecheck`, `npm test` (284 pruebas en 17 archivos al 13/11/2026) y `npm run build`. Cada pantalla se carga aparte: la carga inicial bajó de ~1.044 kB a 779 kB (230 kB comprimidos). Lighthouse dio 100 en accesibilidad, buenas prácticas y SEO en ingreso y registro (medido en la Fase 2). Las comprobaciones de la base (77/77) y la app sin Supabase se pueden repetir con el backend local de [`tools/dev-backend`](./tools/dev-backend/README.md).

**Pendientes antes de producción:** la lista completa está en [`docs/fase-8/02-lanzamiento.md`](./docs/fase-8/02-lanzamiento.md) (responsable y revisión legal, SMTP propio, hosting, pruebas con estudiantes, PWA en dispositivos, `npm audit`, respaldos). Tauri/Android/iOS quedan para después del lanzamiento. No se debe considerar el proyecto “listo para producción” (ver [`docs/fase-2/README.md`](./docs/fase-2/README.md) y la sección 14 de [`06-modelo-datos.md`](./docs/fase-1/06-modelo-datos.md)).

---

## Variables de entorno

Copiar [`.env.example`](./.env.example) a `.env.local` y completar con credenciales propias. **No commitear `.env.local` ni claves reales.** La `service_role` de Supabase nunca va en el frontend.

Guía paso a paso para crear el proyecto, configurar Auth, aplicar las migraciones y ejecutar el checklist real: [`docs/fase-1/08-configuracion-supabase.md`](./docs/fase-1/08-configuracion-supabase.md).

---

## Próximo hito

Lanzar. Las fases 3 a 8 ya están validadas y aprobadas; falta lo que depende de cuentas y datos reales:

1. [x] aplicar las migraciones `003_proteger_consentimientos.sql`, `004_biblioteca.sql`, `005_recordatorios.sql` y `006_versiones_legales.sql` en el SQL Editor;
2. [x] repetir con datos reales: tareas, exámenes con plan de estudio, horario, calificaciones, nodos y adjuntos en `academic-files`;
3. [x] repetir el aislamiento con dos cuentas en `tasks`, `exams`, `study_sessions`, `schedule_entries`, `assessments`, `nodes`, `node_links` y `sources`;
4. [x] comprobar que editar el perfil sigue funcionando y que los consentimientos ya no se pueden cambiar por la API;
5. [x] límites de la biblioteca aprobados el 13/11/2026 (D27): 25 MB por archivo, 200 MB y 1000 fuentes por usuario;
6. [ ] recordatorios: verificar un dominio en Resend, cargar los secretos, desplegar `send-reminders`, programar pg_cron y recibir el correo de prueba (pasos en [`docs/fase-7/README.md`](./docs/fase-7/README.md#4-puesta-en-marcha));
7. [x] reglas de los recordatorios aprobadas el 13/11/2026 (D28): solo al correo de la cuenta, sesiones de estudio apagadas por defecto, sin avisos tardíos y tope de 20 correos por día;
8. [x] D29 aprobada el 13/11/2026: jurisdicción argentina, uso desde los 13 años y compromisos de los textos legales;
9. [ ] completar `VITE_LEGAL_OWNER`, `VITE_LEGAL_CONTACT_EMAIL` y `VITE_LEGAL_LOCATION`, y hacer la revisión de los textos por un profesional;
10. [ ] pruebas con 5 a 10 estudiantes ([`docs/fase-8/01-plan-de-pruebas.md`](./docs/fase-8/01-plan-de-pruebas.md)) y corrección de lo crítico;
11. [ ] publicar en Vercel, configurar el dominio, las redirecciones de Auth y un respaldo probado;
12. [ ] aprobación final del lanzamiento y publicación ([`docs/fase-8/02-lanzamiento.md`](./docs/fase-8/02-lanzamiento.md)).

La Fase 2 fue aprobada por el usuario el 11 de noviembre de 2026; su reporte está en [`docs/fase-2/README.md`](./docs/fase-2/README.md). La Fase 8 es la última del plan; después del lanzamiento sigue el plan de mejoras ([`docs/fase-8/03-mejoras-futuras.md`](./docs/fase-8/03-mejoras-futuras.md)): logros, niveles y experiencia, edición sin conexión y tiendas de aplicaciones.

El detalle de las decisiones aprobadas está en [`docs/fase-1/07-decisiones-pendientes.md`](./docs/fase-1/07-decisiones-pendientes.md).
