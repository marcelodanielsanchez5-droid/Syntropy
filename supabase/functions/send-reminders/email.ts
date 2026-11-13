// Arma el correo de cada recordatorio (asunto, HTML y texto plano).
// Sin dependencias ni APIs de Deno: lo usan la Edge Function, las pruebas de
// Vitest y el backend local de pruebas.

export type ReminderKind = 'task_due' | 'exam' | 'study_session' | 'custom'

/** Fila que devuelve `public.claim_due_reminders()` (migración 005). */
export interface ClaimedReminder {
  reminder_id: string
  kind: ReminderKind
  recipient: string | null
  subject: string
  body: string | null
  send_at: string
  event_at: string | null
  attempts: number
  time_zone: string | null
  display_name: string | null
  item_title: string | null
  item_kind: string | null
  subject_id: string | null
  subject_name: string | null
  subject_color: string | null
  location: string | null
  duration_minutes: number | null
}

export interface ReminderEmail {
  subject: string
  html: string
  text: string
}

export interface EmailOptions {
  /** URL pública de la app, sin barra final. Sin ella el correo no lleva enlaces. */
  appUrl?: string
  now?: Date
}

const BRAND = {
  canvas: '#0C141F',
  rose: '#E01462',
  ink: '#1D2433',
  muted: '#5B6577',
  line: '#E4E7EC',
  page: '#F4F5F8',
  fallbackColor: '#98A2B3',
}

const MAX_SUBJECT = 200

// ---------------------------------------------------------------------------
// Fechas en la zona del usuario
// ---------------------------------------------------------------------------

/** Zona horaria válida para Intl; si no lo es, UTC. */
export function safeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) {
    return 'UTC'
  }

  try {
    new Intl.DateTimeFormat('es', { timeZone }).format(0)
    return timeZone
  } catch {
    return 'UTC'
  }
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
  }
}

/** Días de calendario entre dos instantes, contados en la zona del usuario. */
export function calendarDaysBetween(from: Date, to: Date, timeZone: string): number {
  const a = zonedParts(from, timeZone)
  const b = zonedParts(to, timeZone)
  const start = Date.UTC(a.year, a.month - 1, a.day)
  const end = Date.UTC(b.year, b.month - 1, b.day)
  return Math.round((end - start) / 86_400_000)
}

function formatTime(date: Date, timeZone: string): string {
  const { hour, minute } = zonedParts(date, timeZone)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function atTime(date: Date, timeZone: string): string {
  const time = formatTime(date, timeZone)
  return time.startsWith('01:') ? `a la ${time}` : `a las ${time}`
}

function weekday(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('es', { timeZone, weekday: 'long' }).format(date)
}

/** «jueves 14 de noviembre» */
export function formatLongDate(date: Date, timeZone: string): string {
  const day = new Intl.DateTimeFormat('es', { timeZone, day: 'numeric' }).format(date)
  const month = new Intl.DateTimeFormat('es', { timeZone, month: 'long' }).format(date)
  return `${weekday(date, timeZone)} ${day} de ${month}`
}

/** «hoy a las 18:00», «mañana a las 09:30», «el jueves a las 10:00», «el jueves 14 de noviembre a las 10:00». */
export function describeWhen(eventAt: Date, now: Date, timeZone: string): string {
  const days = calendarDaysBetween(now, eventAt, timeZone)
  const time = atTime(eventAt, timeZone)

  if (days === 0) {
    return `hoy ${time}`
  }

  if (days === 1) {
    return `mañana ${time}`
  }

  if (days > 1 && days < 7) {
    return `el ${weekday(eventAt, timeZone)} ${time}`
  }

  return `el ${formatLongDate(eventAt, timeZone)} ${time}`
}

/** «45 min», «2 h», «1 h 30 min» */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours === 0) {
    return `${rest} min`
  }

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function clampSubject(value: string): string {
  const line = oneLine(value)
  return line.length <= MAX_SUBJECT ? line : `${line.slice(0, MAX_SUBJECT - 1).trimEnd()}…`
}

function safeColor(value: string | null): string {
  return value && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : BRAND.fallbackColor
}

function joinUrl(appUrl: string | undefined, path: string): string | null {
  if (!appUrl || !/^https?:\/\//.test(appUrl)) {
    return null
  }

  return `${appUrl.replace(/\/+$/, '')}${path}`
}

interface Detail {
  label: string
  value: string
}

interface EmailContent {
  subject: string
  heading: string
  intro: string | null
  title: string | null
  details: Detail[]
  linkPath: string
  linkLabel: string
}

function contentFor(reminder: ClaimedReminder, now: Date, timeZone: string): EmailContent {
  const title = oneLine(reminder.item_title ?? '') || 'Sin título'
  const eventAt = reminder.event_at ? new Date(reminder.event_at) : null
  const subjectPath = reminder.subject_id
    ? `/asignaturas/${reminder.subject_id}/calendario`
    : '/calendario'
  const subjectDetail: Detail[] = reminder.subject_name
    ? [{ label: 'Asignatura', value: oneLine(reminder.subject_name) }]
    : []

  if (reminder.kind === 'task_due' && eventAt) {
    const isProject = reminder.item_kind === 'project'
    const noun = isProject ? 'proyecto' : 'tarea'
    const when = describeWhen(eventAt, now, timeZone)

    return {
      subject: `${isProject ? 'Proyecto' : 'Tarea'} «${title}» vence ${when}`,
      heading: `Tu ${noun} vence ${when}`,
      intro: null,
      title,
      details: [
        ...subjectDetail,
        {
          label: 'Vence',
          value: `${formatLongDate(eventAt, timeZone)}, ${formatTime(eventAt, timeZone)}`,
        },
      ],
      linkPath: subjectPath,
      linkLabel: 'Ver en el calendario',
    }
  }

  if (reminder.kind === 'exam' && eventAt) {
    const when = describeWhen(eventAt, now, timeZone)
    const details: Detail[] = [
      ...subjectDetail,
      {
        label: 'Fecha',
        value: `${formatLongDate(eventAt, timeZone)}, ${formatTime(eventAt, timeZone)}`,
      },
    ]

    if (reminder.location && oneLine(reminder.location)) {
      details.push({ label: 'Lugar', value: oneLine(reminder.location) })
    }

    if (reminder.duration_minutes) {
      details.push({ label: 'Duración', value: formatDuration(reminder.duration_minutes) })
    }

    return {
      subject: `Examen ${when}: ${title}`,
      heading: `Tenés un examen ${when}`,
      intro: null,
      title,
      details,
      linkPath: subjectPath,
      linkLabel: 'Ver en el calendario',
    }
  }

  if (reminder.kind === 'study_session' && eventAt) {
    const when = describeWhen(eventAt, now, timeZone)
    const details: Detail[] = [...subjectDetail, { label: 'Para', value: title }]

    if (reminder.duration_minutes) {
      details.push({ label: 'Duración', value: formatDuration(reminder.duration_minutes) })
    }

    return {
      subject: `Sesión de estudio ${when}: ${title}`,
      heading: `Tenés una sesión de estudio ${when}`,
      intro: null,
      title: null,
      details,
      linkPath: subjectPath,
      linkLabel: 'Ver en el calendario',
    }
  }

  // Personalizado (por ahora, el correo de prueba) o un evento sin fecha.
  return {
    subject: reminder.subject,
    heading: reminder.subject,
    intro: reminder.body,
    title: null,
    details: [],
    linkPath: '/inicio',
    linkLabel: 'Abrir Syntropy',
  }
}

// ---------------------------------------------------------------------------
// Correo
// ---------------------------------------------------------------------------

export function buildReminderEmail(
  reminder: ClaimedReminder,
  options: EmailOptions = {},
): ReminderEmail {
  const now = options.now ?? new Date()
  const timeZone = safeTimeZone(reminder.time_zone)
  const content = contentFor(reminder, now, timeZone)
  const subject = clampSubject(content.subject)
  const color = safeColor(reminder.subject_color)
  const name = reminder.display_name ? oneLine(reminder.display_name) : ''
  const greeting = name ? `Hola, ${name}:` : 'Hola:'
  const link = joinUrl(options.appUrl, content.linkPath)
  const settingsLink = joinUrl(options.appUrl, '/configuracion#recordatorios')
  const footer =
    'Recibís este correo porque activaste los recordatorios en Syntropy. Podés cambiarlos o apagarlos en Configuración.'

  const text = [
    greeting,
    '',
    `${oneLine(content.heading)}.`,
    content.intro ? `\n${content.intro.trim()}` : null,
    content.title ? `\n${content.title}` : null,
    ...content.details.map((detail) => `${detail.label}: ${detail.value}`),
    link ? `\n${content.linkLabel}: ${link}` : null,
    '',
    '—',
    footer,
    settingsLink ? settingsLink : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  const detailRows = content.details
    .map(
      (detail) => `
                <tr>
                  <td style="padding:4px 12px 4px 0;color:${BRAND.muted};font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(detail.label)}</td>
                  <td style="padding:4px 0;color:${BRAND.ink};font-size:14px;">${escapeHtml(detail.value)}</td>
                </tr>`,
    )
    .join('')

  const card =
    content.title || content.details.length > 0
      ? `
          <tr>
            <td style="padding:0 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.line};border-left:4px solid ${color};border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;">
                    ${content.title ? `<p style="margin:0 0 8px;font-size:17px;font-weight:700;color:${BRAND.ink};">${escapeHtml(content.title)}</p>` : ''}
                    <table role="presentation" cellpadding="0" cellspacing="0">${detailRows}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
      : ''

  const intro = content.intro
    ? `
          <tr>
            <td style="padding:0 32px 8px;font-size:15px;line-height:22px;color:${BRAND.ink};">${escapeHtml(content.intro.trim()).replace(/\n/g, '<br>')}</td>
          </tr>`
    : ''

  const button = link
    ? `
          <tr>
            <td style="padding:16px 32px 8px;">
              <a href="${escapeHtml(link)}" style="display:inline-block;background:${BRAND.rose};color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:8px;">${escapeHtml(content.linkLabel)}</a>
            </td>
          </tr>`
    : ''

  const settings = settingsLink
    ? ` <a href="${escapeHtml(settingsLink)}" style="color:${BRAND.muted};">Ir a Configuración</a>`
    : ''

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.page};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:${BRAND.canvas};padding:18px 32px;color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:0.02em;">Syntropy</td>
          </tr>
          <tr>
            <td style="padding:28px 32px 4px;font-size:14px;color:${BRAND.muted};">${escapeHtml(greeting)}</td>
          </tr>
          <tr>
            <td style="padding:4px 32px 16px;font-size:21px;line-height:28px;font-weight:700;color:${BRAND.ink};">${escapeHtml(oneLine(content.heading))}</td>
          </tr>${intro}${card}${button}
          <tr>
            <td style="padding:24px 32px 28px;font-size:12px;line-height:18px;color:${BRAND.muted};border-top:1px solid ${BRAND.line};">${escapeHtml(footer)}${settings}</td>
          </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`

  return { subject, html, text }
}
