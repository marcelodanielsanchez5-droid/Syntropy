import { addHours, startOfHour } from 'date-fns'
import {
  shiftDateKey,
  toTimeInputValue,
  toZoned,
  zonedDateKey,
  zonedToUtcIso,
} from '@/lib/datetime'
import type { Exam, StudySession } from '@/types/database'

/**
 * Plan de estudio de un examen (documento de modelo de datos, sección 6).
 * Lógica pura: no toca la base ni depende del reloj salvo por el parámetro `now`.
 */

export interface StudyPlan {
  /** Cuántos días antes del examen empezar. */
  daysBefore: number
  /** Cada cuántos días estudiar. */
  frequencyDays: number
  /** Minutos por sesión. */
  sessionMinutes: number
  /** Hora local preferida, `HH:mm`. */
  time: string
}

export interface PlannedSession {
  scheduled_at: string
  duration_minutes: number
}

/** Los mismos límites que valida la base de datos. */
export const STUDY_PLAN_LIMITS = {
  daysBefore: { min: 0, max: 365 },
  frequencyDays: { min: 1, max: 30 },
  sessionMinutes: { min: 5, max: 480 },
} as const

export const DEFAULT_STUDY_PLAN: StudyPlan = {
  daysBefore: 7,
  frequencyDays: 1,
  sessionMinutes: 45,
  time: '18:00',
}

/**
 * Genera las sesiones de estudio de un examen.
 *
 * - Hay una sesión cada `frequencyDays` días, a la hora preferida, empezando
 *   `daysBefore` días antes del examen.
 * - Si esa fecha de inicio ya pasó, se empieza hoy.
 * - Si hoy la hora preferida ya pasó, la sesión de hoy se corre a la próxima
 *   hora en punto; si eso ya cae mañana, hoy no se estudia.
 * - Toda sesión termina antes de que empiece el examen. Por eso no hay sesión
 *   el día del examen cuando la hora de estudio es posterior.
 * - Los días se cuentan en la zona horaria del perfil y la hora local se
 *   conserva aunque haya cambio de horario de verano.
 */
export function generateStudySessions({
  examAt,
  plan,
  timeZone,
  now = new Date(),
}: {
  examAt: string
  plan: StudyPlan
  timeZone: string
  now?: Date
}): PlannedSession[] {
  const examMs = Date.parse(examAt)
  const nowMs = now.getTime()

  if (Number.isNaN(examMs) || examMs <= nowMs || plan.frequencyDays < 1) {
    return []
  }

  const examDay = zonedDateKey(examMs, timeZone)
  const today = zonedDateKey(now, timeZone)
  const plannedStart = shiftDateKey(examDay, -plan.daysBefore)
  const firstDay = plannedStart < today ? today : plannedStart
  const durationMs = plan.sessionMinutes * 60_000
  const sessions: PlannedSession[] = []

  for (let day = firstDay; day <= examDay; day = shiftDateKey(day, plan.frequencyDays)) {
    let startMs = Date.parse(zonedToUtcIso(day, plan.time, timeZone))

    if (startMs <= nowMs) {
      const nextHour = startOfHour(addHours(toZoned(now, timeZone), 1))

      if (zonedDateKey(nextHour, timeZone) !== day) {
        continue
      }

      startMs = nextHour.getTime()
    }

    if (startMs + durationMs > examMs) {
      continue
    }

    sessions.push({
      scheduled_at: new Date(startMs).toISOString(),
      duration_minutes: plan.sessionMinutes,
    })
  }

  return sessions
}

type ExistingSession = Pick<StudySession, 'scheduled_at' | 'status'>

/** Una sesión se regenera solo si sigue programada y todavía no ocurrió. */
export function isReplaceableSession(session: ExistingSession, now = new Date()): boolean {
  return session.status === 'scheduled' && Date.parse(session.scheduled_at) > now.getTime()
}

/**
 * Qué hacer con las sesiones cuando cambia el plan o la fecha del examen: las
 * sesiones futuras programadas se reemplazan; las completadas, las salteadas y
 * las que ya pasaron se conservan como historial y no se duplican.
 */
export function reconcileStudySessions(
  existing: ExistingSession[],
  planned: PlannedSession[],
  now = new Date(),
): { hasReplaceable: boolean; toInsert: PlannedSession[] } {
  const keptSlots = new Set<number>()
  let hasReplaceable = false

  for (const session of existing) {
    if (isReplaceableSession(session, now)) {
      hasReplaceable = true
    } else {
      keptSlots.add(Date.parse(session.scheduled_at))
    }
  }

  return {
    hasReplaceable,
    toInsert: planned.filter((session) => !keptSlots.has(Date.parse(session.scheduled_at))),
  }
}

type ExamPlanFields = Pick<
  Exam,
  'exam_at' | 'study_days_before' | 'study_frequency_days' | 'study_session_minutes' | 'study_time'
>

/** Plan de estudio guardado en un examen, o `null` si no tiene. */
export function examToStudyPlan(exam: ExamPlanFields): StudyPlan | null {
  if (
    exam.study_days_before === null ||
    exam.study_frequency_days === null ||
    exam.study_session_minutes === null ||
    exam.study_time === null
  ) {
    return null
  }

  return {
    daysBefore: exam.study_days_before,
    frequencyDays: exam.study_frequency_days,
    sessionMinutes: exam.study_session_minutes,
    time: toTimeInputValue(exam.study_time, DEFAULT_STUDY_PLAN.time),
  }
}

/** Indica si hay que regenerar las sesiones al guardar un examen editado. */
export function studyScheduleChanged(before: ExamPlanFields, after: ExamPlanFields): boolean {
  const previousPlan = examToStudyPlan(before)
  const nextPlan = examToStudyPlan(after)

  return (
    Date.parse(before.exam_at) !== Date.parse(after.exam_at) ||
    JSON.stringify(previousPlan) !== JSON.stringify(nextPlan)
  )
}

/** «Desde 7 días antes, cada 2 días, 45 min a las 18:00» */
export function describeStudyPlan(plan: StudyPlan): string {
  const session = `${plan.sessionMinutes} min a las ${plan.time}`

  if (plan.daysBefore === 0) {
    return `El día del examen, ${session}`
  }

  const start = `Desde ${plan.daysBefore} día${plan.daysBefore === 1 ? '' : 's'} antes`
  const frequency = plan.frequencyDays === 1 ? 'todos los días' : `cada ${plan.frequencyDays} días`

  return `${start}, ${frequency}, ${session}`
}

export interface TimeBlock {
  id: string
  label: string
  start: string
  minutes: number
}

/**
 * Bloques que se superponen en el tiempo con una sesión. Las sesiones no se
 * mueven solas: la interfaz usa esto para avisar del conflicto.
 */
export function findOverlaps(
  session: { scheduled_at: string; duration_minutes: number },
  blocks: TimeBlock[],
): TimeBlock[] {
  const start = Date.parse(session.scheduled_at)
  const end = start + session.duration_minutes * 60_000

  return blocks.filter((block) => {
    const blockStart = Date.parse(block.start)
    const blockEnd = blockStart + block.minutes * 60_000

    return blockStart < end && start < blockEnd
  })
}

/** Los campos numéricos llegan como texto desde el formulario. */
export function isIntegerInRange(value: string, min: number, max: number): boolean {
  if (!/^\d+$/.test(value.trim())) {
    return false
  }

  const number = Number(value)
  return number >= min && number <= max
}
