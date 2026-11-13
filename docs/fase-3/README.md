# Fase 3 — Calendario y panel de tareas

**Estado:** implementada el 13 de noviembre de 2026. Probada con pruebas automáticas, en el navegador contra una base PostgreSQL local y, el 13 de noviembre de 2026, contra el proyecto real de Supabase (tareas, exámenes, sesiones de estudio, aislamiento A/B y cascadas; ver [`docs/fase-8/04-validacion-real.md`](../fase-8/04-validacion-real.md)). **Aprobada por el usuario el 13 de noviembre de 2026.**

**Alcance (documento maestro):** calendario por asignatura y general; tareas, proyectos y exámenes con fecha límite; cuenta regresiva visual; plan de estudio para exámenes; panel de tareas con estados y filtros.

---

## 1. Qué se agregó

| Área | Qué hace |
|---|---|
| Calendario general (`/calendario`) | Tareas y exámenes de todas las asignaturas del año activo, cada uno con el color de su materia. Vistas Mes, Semana y Agenda; en el celular arranca en Agenda. Filtro por asignatura. |
| Calendario de la asignatura (`/asignaturas/:id`) | Es lo primero que se ve al entrar en una materia. Pinta los días que faltan hasta cada entrega, usa el color propio de la tarea si tiene y muestra las sesiones de estudio con borde punteado. |
| Tareas y proyectos | Alta tocando un día del calendario o con «Nueva». Título, asignatura, fecha y hora límite, tipo, estado, descripción y color propio opcional. |
| Panel de tareas | Filtros Todas / Pendientes / En espera / Terminadas con contador. El filtro de estado también se aplica al calendario. Cambio de estado desde la tarjeta, con respuesta inmediata. |
| Cuenta regresiva | Siempre con texto: «Vence hoy», «Vence mañana», «Vence en 3 días», «Atrasada · Venció ayer». Se recalcula cada minuto. |
| Exámenes | Fecha, hora, duración, lugar y notas. Detalle con cuenta regresiva y lista de sesiones. |
| Plan de estudio | Días antes, frecuencia, duración y hora preferida. Vista previa antes de guardar («Se van a programar 3 sesiones…») y aviso si se superpone con otros exámenes o sesiones. Cada sesión se marca como hecha o salteada. |
| Campana | Vencimientos de los próximos 7 días y lo atrasado, calculados con las tareas y exámenes (D6). |
| Inicio | Tareas abiertas, atrasadas, próximo examen, «Esta semana» y el próximo vencimiento en cada carpeta. |

### 1.1. Reglas implementadas

- **Zona horaria del perfil.** Las fechas se guardan en UTC y se muestran y cargan en la zona del perfil, aunque el dispositivo esté en otra. «Hoy» y «mañana» se cuentan por día de calendario en esa zona.
- **Plan de estudio** (modelo de datos, sección 6): una sesión cada N días desde la fecha de inicio; si ya pasó, se empieza hoy; si hoy ya pasó la hora, se corre a la próxima hora en punto; toda sesión termina antes del examen; la hora local se conserva con el cambio de horario de verano.
- **Regenerar sesiones:** al cambiar la fecha del examen o el plan se reemplazan las sesiones futuras programadas; las completadas, salteadas o pasadas se conservan y no se duplican.
- **Colores:** en el calendario general manda el color de la asignatura; en el de la asignatura, el color propio de la tarea si lo tiene.
- **Terminada:** guardar una tarea como terminada registra la fecha; reabrirla la limpia (restricción `tasks_completed_check`).

---

## 2. Correcciones de la revisión

| Defecto | Corrección |
|---|---|
| Sin conexión, el ingreso mostraba «Failed to fetch» en inglés | `getErrorMessage` reconoce los fallos de red de Chrome, Firefox, Safari y Supabase y muestra un mensaje en español. También traduce la sesión vencida. |
| Al cambiar la foto de PNG a JPG quedaba guardada la anterior | Después de subir la foto nueva se borran las otras del usuario. Si esa limpieza falla, el cambio de foto igual termina bien. |
| Al eliminar la cuenta solo se leían 1000 archivos por carpeta | Se piden todas las páginas de Storage y se borra en tandas de 200. |
| Un usuario podía cambiar o borrar por la API sus fechas de consentimiento | Migración [`003_proteger_consentimientos.sql`](../../supabase/migrations/003_proteger_consentimientos.sql): el cliente solo puede editar usuario, nombre, avatar, zona horaria, idioma y fin de la bienvenida. |
| Al ingresar, una cuenta ya configurada podía caer en la bienvenida | El perfil se considera «cargando» hasta que llega, y la bienvenida devuelve al inicio a quien ya la completó. Encontrado al probar en el navegador. |

---

## 3. Pruebas

- **Automáticas:** `npm test` incluye fechas y zonas horarias (con cambio de horario de verano), cuenta regresiva, tareas, plan de estudio, guardado de exámenes y sesiones, eventos del calendario, campana, panel de tareas (componente), errores de red y limpieza de Storage.
- **Base de datos:** las migraciones 001–003 se aplicaron sobre PostgreSQL embebido (PGlite) con roles y RLS como en Supabase. Se comprobó que el defecto de los consentimientos existía antes de la 003 y que la 003 lo cierra sin impedir editar el perfil, y el aislamiento entre dos cuentas en `tasks`, `exams` y `study_sessions` (lectura, edición, borrado, inserción ajena y asignaturas o exámenes de otra cuenta): 28/28.
- **Navegador:** con la app conectada a esa base local: ingreso, inicio, calendario general y de asignatura, alta de tarea desde un día, cambio de estado, detalle de examen, edición del plan con vista previa (las 3 sesiones quedaron guardadas), escritorio y celular.

### Limitaciones

- La validación real del 13/11/2026 cubrió tareas, exámenes, sesiones, restricciones, cascadas y aislamiento A/B en Supabase. La migración `003` ya está aplicada. No se probó con un volumen grande de tareas ni en Safari/Firefox.
- El calendario trae todas las tareas y exámenes del año activo, no solo el rango visible. Alcanza para el volumen de un año; con mucho más habría que paginar por rango.
- Sin conexión, guardar queda en espera hasta que vuelve la red (igual que en la Fase 2).
