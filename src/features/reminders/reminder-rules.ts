import type { Reminder, ReminderKind, ReminderStatus, UserSettings } from '@/types/database'

/** Preferencias de recordatorios que el usuario puede cambiar (migración 005). */
export type ReminderPreferences = Pick<
  UserSettings,
  | 'email_reminders_enabled'
  | 'default_reminder_minutes'
  | 'remind_tasks'
  | 'remind_exams'
  | 'remind_study_sessions'
>

/** Valores por defecto de la base. */
export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  email_reminders_enabled: false,
  default_reminder_minutes: 1440,
  remind_tasks: true,
  remind_exams: true,
  remind_study_sessions: false,
}

/** La base acepta de 0 a 10080 minutos (una semana). */
export const MAX_LEAD_MINUTES = 10080

export const LEAD_OPTIONS: ReadonlyArray<{ minutes: number; label: string }> = [
  { minutes: 15, label: '15 minutos antes' },
  { minutes: 60, label: '1 hora antes' },
  { minutes: 180, label: '3 horas antes' },
  { minutes: 720, label: '12 horas antes' },
  { minutes: 1440, label: '1 día antes' },
  { minutes: 2880, label: '2 días antes' },
  { minutes: 10080, label: '1 semana antes' },
]

function plural(value: number, singular: string, pluralForm: string): string {
  return `${value} ${value === 1 ? singular : pluralForm}`
}

/** «1 día antes», «3 horas antes», «90 minutos antes», «En el momento». */
export function leadLabel(minutes: number): string {
  const known = LEAD_OPTIONS.find((option) => option.minutes === minutes)

  if (known) {
    return known.label
  }

  if (minutes <= 0) {
    return 'En el momento'
  }

  if (minutes % 1440 === 0) {
    return `${plural(minutes / 1440, 'día', 'días')} antes`
  }

  if (minutes % 60 === 0) {
    return `${plural(minutes / 60, 'hora', 'horas')} antes`
  }

  return `${plural(minutes, 'minuto', 'minutos')} antes`
}

/** Opciones del selector, con la actual aunque no sea una de las habituales. */
export function leadOptionsWith(
  current: number,
): ReadonlyArray<{ minutes: number; label: string }> {
  if (LEAD_OPTIONS.some((option) => option.minutes === current)) {
    return LEAD_OPTIONS
  }

  return [...LEAD_OPTIONS, { minutes: current, label: leadLabel(current) }].sort(
    (a, b) => a.minutes - b.minutes,
  )
}

export const REMINDER_KIND_LABELS: Record<ReminderKind, string> = {
  task_due: 'Tarea',
  exam: 'Examen',
  study_session: 'Sesión de estudio',
  custom: 'Prueba',
}

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  scheduled: 'Programado',
  sent: 'Enviado',
  failed: 'No enviado',
  cancelled: 'Cancelado',
}

// Prefijos que pone la base en el asunto provisional (`reminder_label`).
const SUBJECT_PREFIXES: Partial<Record<ReminderKind, string>> = {
  task_due: 'Tarea: ',
  exam: 'Examen: ',
  study_session: 'Sesión de estudio: ',
}

/** Título para la lista: el asunto sin el prefijo del tipo, que ya se muestra aparte. */
export function reminderTitle(reminder: Pick<Reminder, 'kind' | 'subject'>): string {
  const prefix = SUBJECT_PREFIXES[reminder.kind]

  if (prefix && reminder.subject.startsWith(prefix)) {
    return reminder.subject.slice(prefix.length)
  }

  return reminder.subject
}

function time(value: string | null): number {
  return value ? new Date(value).getTime() : Number.NaN
}

function eventPassed(reminder: Pick<Reminder, 'event_at'>, now: Date): boolean {
  return reminder.event_at !== null && time(reminder.event_at) <= now.getTime()
}

/** Se puede cancelar mientras esté programado. */
export function canCancel(reminder: Pick<Reminder, 'status'>): boolean {
  return reminder.status === 'scheduled'
}

/** Se puede reactivar si estaba cancelado y su hora todavía no pasó. */
export function canRestore(
  reminder: Pick<Reminder, 'status' | 'send_at' | 'event_at'>,
  now: Date,
): boolean {
  return (
    reminder.status === 'cancelled' &&
    time(reminder.send_at) > now.getTime() &&
    !eventPassed(reminder, now)
  )
}

/** Se puede cambiar la hora mientras no se haya enviado y el evento no haya pasado. */
export function canReschedule(reminder: Pick<Reminder, 'status' | 'event_at'>, now: Date): boolean {
  return (
    (reminder.status === 'scheduled' || reminder.status === 'cancelled') &&
    (reminder.event_at === null || time(reminder.event_at) - now.getTime() > 2 * 60_000)
  )
}

/** Misma regla que `reschedule_reminder()`: hora futura y anterior al evento. */
export function validateReschedule(
  sendAt: Date,
  reminder: Pick<Reminder, 'event_at'>,
  now: Date,
): string | null {
  if (Number.isNaN(sendAt.getTime())) {
    return 'Elegí una fecha y una hora.'
  }

  if (sendAt.getTime() <= now.getTime() + 60_000) {
    return 'Elegí una hora futura.'
  }

  if (reminder.event_at && sendAt.getTime() >= time(reminder.event_at)) {
    return 'El aviso tiene que llegar antes del evento.'
  }

  return null
}

export interface ReminderGroups {
  /** Programados y cancelados que todavía pueden servir, del más próximo al más lejano. */
  upcoming: Reminder[]
  /** Enviados, no enviados y cancelados de eventos pasados, del más reciente al más viejo. */
  history: Reminder[]
}

export function groupReminders(
  reminders: Reminder[],
  now: Date,
  historyLimit = 10,
): ReminderGroups {
  const upcoming: Reminder[] = []
  const history: Reminder[] = []

  for (const reminder of reminders) {
    const open = reminder.status === 'scheduled' || reminder.status === 'cancelled'

    if (open && !(reminder.status === 'cancelled' && eventPassed(reminder, now))) {
      upcoming.push(reminder)
    } else {
      history.push(reminder)
    }
  }

  upcoming.sort((a, b) => time(a.send_at) - time(b.send_at))
  history.sort((a, b) => time(b.sent_at ?? b.updated_at) - time(a.sent_at ?? a.updated_at))

  return { upcoming, history: history.slice(0, historyLimit) }
}

/** Cambio de preferencias que conviene avisar: activar sin ningún tipo elegido. */
export function hasNoKinds(preferences: ReminderPreferences): boolean {
  return (
    preferences.email_reminders_enabled &&
    !preferences.remind_tasks &&
    !preferences.remind_exams &&
    !preferences.remind_study_sessions
  )
}
