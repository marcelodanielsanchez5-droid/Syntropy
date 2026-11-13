// Edge Function de Supabase: envía los recordatorios vencidos con Resend.
// La invoca pg_cron cada 5 minutos (supabase/setup/programar-recordatorios.sql).
//
// Desplegar sin verificación de JWT: la protege la cabecera `x-cron-secret`.
//   supabase functions deploy send-reminders --no-verify-jwt
//
// Secretos (supabase secrets set …):
//   RESEND_API_KEY, REMINDER_FROM_EMAIL, CRON_SECRET y, opcional, APP_URL.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase.
import { handleRequest } from './handler.ts'

Deno.serve((request: Request) =>
  handleRequest(request, {
    supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
    serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    resendApiKey: Deno.env.get('RESEND_API_KEY') ?? '',
    fromEmail: Deno.env.get('REMINDER_FROM_EMAIL') ?? '',
    cronSecret: Deno.env.get('CRON_SECRET') ?? '',
    appUrl: Deno.env.get('APP_URL') ?? undefined,
    log: (message: string) => console.log(message),
  }),
)
