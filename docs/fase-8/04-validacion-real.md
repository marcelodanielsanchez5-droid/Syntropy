# Validación real de las fases 3 a 8

**Fecha:** 13 de noviembre de 2026.

**Proyecto:** Supabase real del usuario, con las migraciones `001` a `006` aplicadas.

**Alcance:** comprobar contra Supabase real lo que antes solo se había probado en PostgreSQL local: CRUD, restricciones, RLS entre dos cuentas, Storage y programación de recordatorios. La interfaz se recorrió en Chromium contra el proyecto real. **Ninguna fase se aprueba en este documento:** la aprobación es del usuario.

---

## 1. Resultado general

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | OK |
| `npm test` | 284 pruebas en 17 archivos, OK |
| `npm run build` | OK, PWA generada |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| Validador local con las migraciones reales | 77/77 |
| API/RLS contra Supabase real | **154/154** |
| Navegador contra Supabase real | Pantallas principales y altas desde la interfaz, OK |
| Envío real de recordatorios | **No probado:** falta desplegar `send-reminders` y configurar Resend/pg_cron |

El script de la matriz real se ejecutó desde el entorno de validación con las dos cuentas de prueba. No se versionó porque trabajaba con tokens de sesión y datos temporales.

---

## 2. Qué se comprobó en Supabase real

### Perfil, consentimientos y versiones legales

- El alta guardó el usuario, el nombre, la confirmación de edad y las versiones legales vigentes (`2026-11-13`).
- El perfil se pudo editar (nombre, zona horaria, onboarding).
- El cliente **no** pudo escribir directamente `terms_version`, `privacy_version`, `terms_accepted_at` ni `privacy_accepted_at`: la API devolvió `403 / 42501`.
- `accept_legal_documents()` aceptó las versiones vigentes y rechazó una versión vieja con `SY007`.
- La cuenta B no pudo ver el perfil de A.

### Año académico y asignaturas

- Altas de año activo y asignaturas para A y B.
- A solo vio sus asignaturas; B solo las suyas.
- No se pudo colgar una asignatura de un año de la otra cuenta (`23503`).
- B no pudo ver los años académicos de A.

### Tareas

- La tarea nace `pending`, de tipo `task` y sin color propio.
- El color inválido se rechazó (`23514`).
- Terminar una tarea sin `completed_at` se rechazó (`23514`); con la fecha, se guardó.
- Se pudo volver a pendiente limpiando la fecha.
- B no vio, no modificó ni borró la tarea de A.
- B no pudo crear una tarea a nombre de A (`42501`) ni usar una asignatura de A (`23503`).

### Exámenes y sesiones de estudio

- El plan de estudio se rechazó incompleto (`23514`) y se guardó completo, incluida `study_time`.
- La sesión nació `scheduled`; no se pudo duplicar en el mismo horario (`23505`).
- B no vio el examen de A ni pudo modificarlo, y no pudo agregar sesiones a un examen de A (`23503`).
- Al borrar un examen, su sesión se borró en cascada.

### Horario

- Se creó una clase con día y horario; el día inválido se rechazó (`23514`).
- B no vio ni modificó el horario de A.
- A actualizó la ubicación del bloque.

### Calificaciones

- La fila de `grading_settings` existía; A configuró escala 1–10, aprueba 6 y un decimal.
- Se registró una nota 8,5 con peso 2; una nota 11 se rechazó (`23514`).
- B no vio las notas, no pudo crear una nota a nombre de A y no pudo ver ni modificar la escala de A.

### Nodos y conexiones

- Se creó una raíz por asignatura; una segunda raíz se rechazó (`23505`).
- Un tema sin dificultad ni dominio se rechazó (`23514`); con ambos datos se guardó.
- Se crearon subtemas y una conexión entre dos asignaturas.
- La conexión inversa duplicada se rechazó (`23505`).
- B no vio nodos ni conexiones de A y no pudo crear nodos ni conexiones con datos de A (`23503`).
- Borrar un tema con un adjunto en su subárbol se bloqueó (`23503`).
- Al borrar el tema, su subtema desapareció y la tarea vinculada quedó con `node_id = null`.
- Al borrar una asignatura, sus nodos y conexiones desaparecieron.

### Biblioteca y Storage

- Se guardó un enlace sin tamaño; el archivo ocupa espacio y el enlace no.
- Se simuló un archivo de 150 MB (solo metadatos) y se comprobó que un segundo archivo de 60 MB se rechaza con `SY001`; el límite es 200 MB.
- `library_limits()` devolvió 200 MB y 1000 fuentes.
- El título y las etiquetas se pudieron editar; `size_bytes` no (`42501`).
- B no vio las fuentes de A ni pudo crear una fuente a nombre de A.
- Se subió un archivo real a `academic-files`, se registró en la biblioteca, se firmó y descargó su contenido. B no pudo firmar ni subir a la carpeta de A. A borró la fila y el objeto.
- El límite de 25 MB por archivo se comprobó en la configuración del bucket; no se subió un archivo de ese tamaño.

### Recordatorios

- Con los recordatorios apagados no se programó nada.
- Al activarlos se programó el aviso de una tarea 1 día antes y el del examen.
- El destino fue siempre el correo verificado de la cuenta.
- Mover la fecha de la tarea reprogramó el aviso; terminarla lo borró; volverla a pendiente lo creó de nuevo.
- Una tarea a 2 horas no recibió aviso con 1 día de anticipación; al bajar la anticipación a 60 minutos, sí.
- Se canceló, restauró y reprogramó un aviso. No se pudo reprogramar después del evento (`SY004`).
- El cliente no pudo crear, modificar ni borrar avisos directamente (`42501`), ni cambiar `reminder_email` (`42501`), ni reclamar avisos para enviar (`42501`).
- Se programó un correo de prueba para B y el segundo intento se rechazó con `SY005`.
- Al activar las sesiones de estudio se programó su aviso.
- Al apagar los recordatorios no quedó ningún aviso `scheduled`.
- B no vio las preferencias ni los recordatorios de A, y no pudo cancelar un aviso de A (`SY003`).
- **No se envió ningún correo real:** `send-reminders` no está desplegada y pg_cron no está programado.

---

## 3. Pruebas de interfaz

Se recorrió la app en Chromium contra el proyecto real, con la cuenta A:

- Ingreso con correo y contraseña.
- Inicio con año activo, asignatura, tareas, próximo examen y avisos.
- Calendario general con tareas y examen.
- Horario semanal con la clase creada por API y creación de un bloque **desde la interfaz**.
- Calificaciones con escala 1–10 y promedio 8,5.
- Página de asignatura y mapa de nodos con un tema.
- Biblioteca con una fuente creada **desde la interfaz** (enlace con tema y etiquetas).
- Configuración con años, recordatorios, próximos avisos, privacidad local y cuenta.
- Descarga de datos desde Configuración: JSON de 15 KB con perfil, preferencias y tablas.
- Términos de uso: el aviso de datos faltantes del responsable se muestra correctamente.
- Creación de una tarea **desde la interfaz**, que quedó guardada en Supabase.

No se observaron errores visibles en las pantallas recorridas. No se hizo una pasada completa de todos los formularios ni de todos los tamaños de pantalla.

---

## 4. Pendientes y límites de esta validación

1. **Correo real:** verificar un dominio en Resend, cargar secretos, desplegar `send-reminders`, programar pg_cron y recibir confirmación, recuperación y un recordatorio en Gmail y Outlook.
2. **D29 y responsable:** aprobar la jurisdicción y los compromisos; cargar `VITE_LEGAL_OWNER`, `VITE_LEGAL_CONTACT_EMAIL` y `VITE_LEGAL_LOCATION`; revisión por un profesional.
3. **Hosting:** elegir proveedor, configurar variables, redirecciones, HTTPS, cabeceras y dominio.
4. **Auth:** Site URL final, CAPTCHA, límites de intentos y SMTP propio para confirmación y recuperación.
5. **Operación:** respaldo probado, plan de incidentes y responsable de revisar registros.
6. **Calidad:** Safari/Firefox, PWA instalada en Android/iOS, Lighthouse y pruebas con estudiantes.
7. **Limpieza:** eliminar las cuentas A y B y todos sus datos cuando terminen las pruebas de correo.
8. **Logo:** reemplazar el logo y los íconos provisionales (D10).
9. **Avisos de desarrollo:** quedan 6 avisos de `npm audit` en dependencias de desarrollo (2 low, 4 moderate); no afectan el bundle de producción.

Ninguna de las fases 3 a 8 se considera aprobada hasta que el usuario lo indique expresamente.
