# Fase 7 — Recordatorios por correo

**Estado:** implementada el 13 de noviembre de 2026. Probada con pruebas automáticas, con el validador SQL, en el navegador contra una base PostgreSQL local con las migraciones reales y un Resend simulado y, el 13 de noviembre de 2026, contra el proyecto real de Supabase (migración 005, programación/reprogramación/cancelación/restauración de avisos, permisos del cliente y aislamiento A/B; ver [`docs/fase-8/04-validacion-real.md`](../fase-8/04-validacion-real.md)). **Falta desplegar la Edge Function, configurar Resend y pg_cron, y probar con un correo real.** Las reglas de la sección 1.2 (decisión D28) fueron aprobadas por el usuario el 13 de noviembre de 2026.

**Alcance (documento maestro y arquitectura §8):** recordatorios por correo con Resend, enviados desde una Edge Function con `service_role` que invoca pg_cron cada 5 minutos; preferencias en Configuración; recordatorios cancelables y reprogramables; zona horaria del usuario; id de Resend guardado para auditoría.

---

## 1. Qué se agregó

| Área | Qué hace |
|---|---|
| Configuración → Recordatorios por correo | Interruptor general, anticipación (de 15 minutos a 1 semana), tipos de aviso (tareas y proyectos, exámenes, sesiones de estudio) y botón «Enviar prueba». Muestra a qué dirección llegan. |
| Próximos avisos | Lista de lo programado con «Cambiar hora», «Cancelar» y «Reactivar». Se actualiza sola cada minuto. |
| Últimos correos | Los 10 últimos enviados o no enviados, con el motivo si falló. |
| Programación automática | La base crea, mueve y borra los avisos sola cuando cambian las tareas, los exámenes, las sesiones o las preferencias. La app no tiene que acordarse de nada. |
| Edge Function `send-reminders` | Reclama los avisos vencidos, arma cada correo y lo manda con Resend. Guarda el resultado, el id de Resend y el asunto final. |
| Correo | HTML y texto plano, en español y en la zona horaria del perfil («mañana a las 23:59», «el miércoles a las 08:00»), con el color de la asignatura, enlace al calendario y a Configuración. |

### 1.1. Reglas

- Un aviso por tarea sin terminar, por examen y por sesión de estudio programada. Hora del aviso = hora del evento − anticipación.
- Si al crear o mover un evento la hora del aviso ya pasó, **no se programa** (no se manda «vence en 1 día» cuando faltan 2 horas).
- Si se mueve el evento, el aviso se reprograma. Si se termina la tarea o se omite la sesión, el aviso se borra.
- Lo que el usuario cancela queda cancelado aunque cambien las preferencias; se puede reactivar mientras su hora no haya pasado.
- Una hora elegida a mano se conserva hasta que se mueva el evento o cambie la anticipación.
- Un aviso que no salió antes del evento (por ejemplo, si la tarea programada estuvo caída) queda como «No enviado».
- No se repite el aviso de un evento que ya se mandó para la misma fecha.
- Hasta 25 correos por ejecución y 20 por usuario cada 24 horas. Ante un error temporal se intenta hasta 3 veces en total (reintentos a los 10 y a los 20 minutos).

### 1.2. Decisión D28 (aprobada el 13 de noviembre de 2026)

| Tema | Regla | Por qué |
|---|---|---|
| Dirección de destino | Solo el correo de la cuenta. El cliente no puede cambiar `reminder_email`. | Ese correo ya se verificó al registrarse. Una dirección libre permitiría usar Syntropy para mandar correos a terceros. Una dirección alternativa necesita su propia verificación (pendiente). |
| Valores por defecto | Apagados hasta que el usuario los active; tareas y exámenes sí, sesiones de estudio no; 1 día antes. | Las sesiones de estudio pueden ser muchas por examen. |
| Avisos tardíos | No se mandan. | Un «vence mañana» que llega después del vencimiento confunde. |
| Tope diario | 20 correos por usuario cada 24 horas. | Cuida la cuota de Resend (el plan gratuito tiene un límite diario; verificar el valor vigente en su página de precios). |

---

## 2. Migración `005_recordatorios.sql`

1. Agrega a `user_settings` los tipos de aviso: `remind_tasks`, `remind_exams` y `remind_study_sessions`.
2. Agrega a `reminders` la hora del evento (`event_at`), los intentos y un bloqueo temporal (`locked_until`) para que dos ejecuciones no manden el mismo correo. Un índice único impide dos avisos abiertos para el mismo evento.
3. Disparadores en `tasks`, `exams`, `study_sessions` y `user_settings` que llaman a `sync_reminder()` y `resync_user_reminders()`.
4. Funciones para la app: `cancel_reminder`, `restore_reminder`, `reschedule_reminder` y `schedule_test_reminder` (un correo de prueba cada 10 minutos). Errores propios: `SY003` (no disponible), `SY004` (hora no válida), `SY005` (prueba repetida) y `SY006` (recordatorios apagados), con mensajes en español.
5. Funciones para la Edge Function, solo `service_role`: `claim_due_reminders()` y `finish_reminder()`.
6. Permisos: el cliente ya no puede escribir en `reminders` (solo leer), y en `user_settings` solo puede cambiar el tema y las preferencias de recordatorios.
7. Al final comprueba los permisos y, si algo no quedó como debe, falla y revierte todo. Se puede ejecutar más de una vez.

La ejecución periódica **no** está en la migración porque necesita la URL del proyecto y un secreto: va en [`supabase/setup/programar-recordatorios.sql`](../../supabase/setup/programar-recordatorios.sql).

---

## 3. Edge Function `send-reminders`

| Archivo | Contenido |
|---|---|
| [`index.ts`](../../supabase/functions/send-reminders/index.ts) | Entrada de Deno: lee los secretos y llama al manejador. |
| [`handler.ts`](../../supabase/functions/send-reminders/handler.ts) | Comprueba el secreto, reclama, envía con Resend y registra cada resultado. |
| [`email.ts`](../../supabase/functions/send-reminders/email.ts) | Asunto, HTML y texto de cada tipo de aviso. Escapa todo lo que escribe el usuario. |

`handler.ts` y `email.ts` no usan APIs de Deno: los prueban Vitest y el backend local.

| Respuesta de Resend | Qué hace |
|---|---|
| 2xx | Enviado: guarda el id, la dirección y el asunto. |
| 429 (demasiadas solicitudes) | Reintenta más tarde y devuelve el resto a la cola sin gastar intentos. |
| 401 (clave inválida) | Igual que 429: el problema es de configuración y afecta a todos. |
| 5xx o sin conexión | Reintenta más tarde (hasta 3 intentos). |
| 403, 409, 422 | No enviado, con el mensaje de Resend (dominio sin verificar, datos inválidos…). |

- Cada envío lleva `Idempotency-Key: syntropy-reminder/<id>`: si un reintento llega después de un envío que sí salió, Resend no lo duplica (guarda la clave 24 horas).
- La función se despliega sin verificación de JWT y solo responde a `POST` con la cabecera `x-cron-secret` correcta (comparación en tiempo constante).
- El registro de la función no guarda direcciones de correo.
- Pausa de 600 ms entre envíos para respetar el límite por segundo de Resend.

---

## 4. Puesta en marcha

Necesita la [CLI de Supabase](https://supabase.com/docs/guides/cli) y una cuenta de [Resend](https://resend.com).

1. **Resend:** verificar un dominio propio (registros DNS SPF y DKIM) y crear una API key con permiso solo de envío. Sin dominio verificado, Resend solo deja mandar al correo del dueño de la cuenta: sirve para probar, no para usuarios.
2. **Migración:** ejecutar `supabase/migrations/005_recordatorios.sql` en el SQL Editor (después de la 003 y la 004).
3. **Secretos de la función** (desde la carpeta del proyecto):

   ```bash
   supabase login
   supabase link --project-ref TU_PROJECT_REF
   supabase secrets set RESEND_API_KEY=re_... REMINDER_FROM_EMAIL="Syntropy <recordatorios@tudominio.com>" CRON_SECRET=UNA_CADENA_LARGA_Y_ALEATORIA APP_URL=https://tu-dominio.com
   ```

4. **Desplegar:**

   ```bash
   supabase functions deploy send-reminders --no-verify-jwt
   ```

5. **Programar:** en el SQL Editor, ejecutar `supabase/setup/programar-recordatorios.sql` con la URL del proyecto y el mismo valor de `CRON_SECRET`. No commitear el archivo con los valores reales.
6. **Probar:** en Configuración, activar los recordatorios y tocar «Enviar prueba». En menos de 5 minutos tiene que llegar el correo y aparecer en «Últimos correos». Si no llega, las consultas del final de `programar-recordatorios.sql` muestran las ejecuciones de pg_cron y las respuestas de la función.

---

## 5. Pruebas

- **Automáticas (25 nuevas):** fechas relativas en la zona del usuario (incluido el cambio de día que en UTC no existe), contenido de cada tipo de correo, escape de HTML, colores inválidos, asunto de 200 caracteres como máximo; la función con Resend simulado (enviado, 422, 503, 429 con devolución a la cola, sin conexión, sin dirección), cabeceras de la clave de servicio, secreto y métodos; reglas de la pantalla (anticipación, acciones disponibles, validación de la hora, agrupación). Total: 284 pruebas en 17 archivos.
- **Base de datos (PGlite con roles y RLS), 21 nuevas:** programación al activar, reprogramación al mover, borrado al terminar, avisos que ya no corresponden, cancelados que se conservan, hora manual que se conserva, reprogramar después del evento, aislamiento entre cuentas, permisos del cliente (no crea avisos, no cambia la dirección, no reclama), tope del correo de prueba, reclamo con bloqueo, aviso tardío, reintento y envío final, apagado con historial. Total con las fases anteriores: 77/77.
- **Supabase real (13/11/2026):** 154/154 comprobaciones de API/RLS, incluidas las 21 reglas de recordatorios anteriores. Se probaron también la carga, descarga y borrado real en Storage, y la interfaz de Configuración con avisos reales. El envío por Resend no se pudo probar porque la función no está desplegada. Detalle: [`docs/fase-8/04-validacion-real.md`](../fase-8/04-validacion-real.md).
- **Navegador:** activar, ver los 5 avisos del seed, correo de prueba enviado por la función, cambiar la hora (con la validación de hora pasada), cancelar y reactivar, cambiar la anticipación, activar sesiones de estudio, envío automático de un aviso de tarea por la ejecución periódica, el correo renderizado y la vista de celular sin desborde. Se encontró y corrigió un defecto: activar un tipo de aviso pisaba las horas elegidas a mano.

### Limitaciones

- No se probó el envío real con Resend, el despliegue de la Edge Function ni pg_cron. La función se probó con Node usando el mismo `handler.ts`; la entrada de Deno (`index.ts`) todavía no se ejecutó en Supabase.
- No se midió la entregabilidad (que los correos no caigan en spam): depende del dominio y sus registros DNS.
- No se puede elegir otra dirección de destino (necesita verificación) ni hay aviso dentro de la app cuando se manda un correo.
- La lista de Configuración se actualiza cada minuto; justo después de un envío puede tardar en mostrarlo.
