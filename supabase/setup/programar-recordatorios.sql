-- ============================================================================
-- SYNTR0PY · FASE 7 · EJECUCIÓN PERIÓDICA DE LOS RECORDATORIOS
--
-- No es una migración: se ejecuta UNA VEZ en el SQL Editor de Supabase,
-- después de:
--   1. aplicar 005_recordatorios.sql;
--   2. desplegar la función:  supabase functions deploy send-reminders --no-verify-jwt
--   3. cargar sus secretos:   supabase secrets set RESEND_API_KEY=… REMINDER_FROM_EMAIL=… CRON_SECRET=… APP_URL=…
--
-- Antes de ejecutarlo, reemplazar los dos valores marcados con «REEMPLAZAR».
-- El secreto de la sección 2 tiene que ser idéntico a CRON_SECRET.
-- No commitear este archivo con valores reales.
-- ============================================================================

-- 1. Extensiones (también se pueden activar en Database → Extensions).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- 2. URL del proyecto y secreto compartido, guardados en Vault (cifrados).
--    Si ya existen, actualizarlos con vault.update_secret(id, nuevo_valor).
select vault.create_secret('https://REEMPLAZAR.supabase.co', 'syntropy_project_url');
select vault.create_secret('REEMPLAZAR-POR-EL-MISMO-VALOR-QUE-CRON_SECRET', 'syntropy_reminders_secret');

-- 3. Cada 5 minutos se llama a la función. Si la tarea ya existía, se reemplaza.
select cron.schedule(
  'syntropy-send-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'syntropy_project_url')
      || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'syntropy_reminders_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- ----------------------------------------------------------------------------
-- Comprobaciones
-- ----------------------------------------------------------------------------
-- Tarea programada:            select jobid, schedule, active from cron.job;
-- Últimas ejecuciones:         select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
-- Respuestas de la función:    select status_code, content, created from net._http_response order by created desc limit 10;
-- Recordatorios pendientes:    select kind, status, send_at, attempts, error_message from public.reminders order by send_at desc limit 20;
--
-- Para detenerla:              select cron.unschedule('syntropy-send-reminders');
