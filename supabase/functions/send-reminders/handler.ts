// Lógica de la Edge Function send-reminders, sin APIs de Deno para poder
// probarla con Vitest y usarla en el backend local de pruebas.
//
// Flujo: claim_due_reminders() → correo con Resend → finish_reminder().
// Las dos funciones de la base solo las puede ejecutar service_role.
import { buildReminderEmail, type ClaimedReminder } from './email.ts'

export interface FunctionConfig {
  supabaseUrl: string
  /** Clave service_role (o la clave secreta nueva `sb_secret_…`). */
  serviceKey: string
  resendApiKey: string
  /** Remitente verificado en Resend, p. ej. «Syntropy <recordatorios@tudominio.com>». */
  fromEmail: string
  /** Secreto compartido con la tarea de pg_cron (cabecera `x-cron-secret`). */
  cronSecret: string
  appUrl?: string
  fetch?: typeof fetch
  now?: () => Date
  sleep?: (ms: number) => Promise<void>
  log?: (message: string) => void
  /** Recordatorios por ejecución (máximo 100). */
  batchSize?: number
  /** Correos por usuario cada 24 horas. */
  dailyCap?: number
  /** Pausa entre envíos para respetar el límite de Resend (2 por segundo en el plan gratuito). */
  pauseMs?: number
}

export interface RunSummary {
  claimed: number
  sent: number
  retried: number
  failed: number
  released: number
}

type Outcome = 'sent' | 'retry' | 'failed' | 'release'

interface SendResult {
  outcome: Exclude<Outcome, 'release'>
  providerId?: string
  error?: string
  /** No seguir enviando en esta ejecución (límite de Resend o clave inválida). */
  stop?: boolean
}

export const RESEND_ENDPOINT = 'https://api.resend.com/emails'

const REQUIRED: Array<[keyof FunctionConfig, string]> = [
  ['supabaseUrl', 'SUPABASE_URL'],
  ['serviceKey', 'SUPABASE_SERVICE_ROLE_KEY'],
  ['resendApiKey', 'RESEND_API_KEY'],
  ['fromEmail', 'REMINDER_FROM_EMAIL'],
  ['cronSecret', 'CRON_SECRET'],
]

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function callRpc<T>(
  config: FunctionConfig,
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const doFetch = config.fetch ?? fetch
  const headers: Record<string, string> = {
    apikey: config.serviceKey,
    'Content-Type': 'application/json',
  }

  // Las claves service_role clásicas son JWT; las nuevas (`sb_secret_…`) van
  // solo en `apikey`.
  if (config.serviceKey.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${config.serviceKey}`
  }

  const response = await doFetch(`${config.supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(args),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`La base respondió ${response.status} en ${name}: ${detail.slice(0, 300)}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

function resendMessage(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: unknown; name?: unknown }

    if (typeof parsed.message === 'string') {
      return `Resend ${status}: ${parsed.message}`
    }
  } catch {
    // Respuesta que no es JSON.
  }

  return `Resend ${status}${body ? `: ${body.slice(0, 200)}` : ''}`
}

/** Envía un correo con la API de Resend y clasifica la respuesta. */
export async function sendWithResend(
  config: FunctionConfig,
  reminder: ClaimedReminder,
  recipient: string,
  email: { subject: string; html: string; text: string },
): Promise<SendResult> {
  const doFetch = config.fetch ?? fetch
  let response: Response

  try {
    response = await doFetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
        // Si un reintento llega después de un envío que sí salió, Resend no
        // lo vuelve a mandar.
        'Idempotency-Key': `syntropy-reminder/${reminder.reminder_id}`,
      },
      body: JSON.stringify({
        from: config.fromEmail,
        to: [recipient],
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [{ name: 'kind', value: reminder.kind }],
      }),
    })
  } catch (error) {
    return { outcome: 'retry', error: `Sin conexión con Resend: ${errorText(error)}` }
  }

  const body = await response.text().catch(() => '')

  if (response.ok) {
    let providerId = ''

    try {
      const parsed = JSON.parse(body) as { id?: unknown }
      providerId = typeof parsed.id === 'string' ? parsed.id : ''
    } catch {
      providerId = ''
    }

    return { outcome: 'sent', providerId }
  }

  const message = resendMessage(response.status, body)

  if (response.status === 429) {
    return { outcome: 'retry', error: message, stop: true }
  }

  if (response.status === 401) {
    // Clave inválida: le pasa a todos, no tiene sentido seguir.
    return { outcome: 'retry', error: message, stop: true }
  }

  if (response.status >= 500) {
    return { outcome: 'retry', error: message }
  }

  // 403 (dominio sin verificar o modo de prueba), 409 (reintento con otro
  // contenido), 422 (datos inválidos): no se arreglan reintentando.
  return { outcome: 'failed', error: message }
}

/** Una ejecución: reclama, envía y registra. */
export async function runReminders(config: FunctionConfig): Promise<RunSummary> {
  const now = config.now ?? (() => new Date())
  const sleep =
    config.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const pauseMs = config.pauseMs ?? 600
  const summary: RunSummary = { claimed: 0, sent: 0, retried: 0, failed: 0, released: 0 }

  const claimed =
    (await callRpc<ClaimedReminder[]>(config, 'claim_due_reminders', {
      p_limit: config.batchSize ?? 25,
      p_daily_cap: config.dailyCap ?? 20,
    })) ?? []

  summary.claimed = claimed.length
  let stopped = false

  for (const [index, reminder] of claimed.entries()) {
    if (stopped) {
      await callRpc(config, 'finish_reminder', {
        p_reminder_id: reminder.reminder_id,
        p_outcome: 'release',
      })
      summary.released += 1
      continue
    }

    const recipient = reminder.recipient?.trim() ?? ''
    let result: SendResult
    let subject: string | null = null

    if (!recipient) {
      result = { outcome: 'failed', error: 'La cuenta no tiene una dirección de correo.' }
    } else {
      const email = buildReminderEmail(reminder, { appUrl: config.appUrl, now: now() })
      subject = email.subject
      result = await sendWithResend(config, reminder, recipient, email)
    }

    await callRpc(config, 'finish_reminder', {
      p_reminder_id: reminder.reminder_id,
      p_outcome: result.outcome,
      p_provider_message_id: result.providerId ?? null,
      p_error: result.error ?? null,
      p_recipient: result.outcome === 'sent' ? recipient : null,
      p_subject: result.outcome === 'sent' ? subject : null,
    })

    summary[
      result.outcome === 'sent' ? 'sent' : result.outcome === 'retry' ? 'retried' : 'failed'
    ] += 1

    if (result.error) {
      // Sin la dirección del destinatario: el registro de la función no debe
      // guardar datos personales.
      config.log?.(`Recordatorio ${reminder.reminder_id}: ${result.outcome} (${result.error})`)
    }

    if (result.stop) {
      stopped = true
    } else if (index < claimed.length - 1 && pauseMs > 0) {
      await sleep(pauseMs)
    }
  }

  return summary
}

/** Comparación en tiempo constante para el secreto de la tarea programada. */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length

  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0)
  }

  return diff === 0
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

/** Punto de entrada HTTP: lo llama pg_cron cada 5 minutos. */
export async function handleRequest(request: Request, config: FunctionConfig): Promise<Response> {
  if (request.method !== 'POST') {
    return json(405, { error: 'Usá POST.' })
  }

  if (
    !config.cronSecret ||
    !safeEqual(request.headers.get('x-cron-secret') ?? '', config.cronSecret)
  ) {
    return json(401, { error: 'No autorizado.' })
  }

  const missing = REQUIRED.filter(([key]) => !config[key]).map(([, name]) => name)

  if (missing.length > 0) {
    return json(500, { error: `Faltan secretos de la función: ${missing.join(', ')}.` })
  }

  try {
    const summary = await runReminders(config)
    config.log?.(
      `Recordatorios: ${summary.claimed} reclamados, ${summary.sent} enviados, ${summary.retried} para reintentar, ${summary.failed} fallidos, ${summary.released} devueltos a la cola.`,
    )
    return json(200, summary)
  } catch (error) {
    config.log?.(`Error al procesar recordatorios: ${errorText(error)}`)
    return json(500, { error: 'No se pudieron procesar los recordatorios.' })
  }
}
