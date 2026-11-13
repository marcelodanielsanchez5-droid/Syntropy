import { getCountdown, isTimeValue, zonedDateKey, zonedTime, zonedToUtcIso } from '@/lib/datetime'
import type { Exam, StudySessionStatus } from '@/types/database'
import type { ExamFormInput } from './exam-schemas'
import {
  DEFAULT_STUDY_PLAN,
  STUDY_PLAN_LIMITS,
  examToStudyPlan,
  isIntegerInRange,
  type StudyPlan,
} from './study-plan'

export const DEFAULT_EXAM_TIME = '08:00'

/** Duración con la que se dibuja en el calendario un examen sin duración cargada. */
export const DEFAULT_EXAM_BLOCK_MINUTES = 60

export const STUDY_SESSION_STATUS_LABELS: Record<StudySessionStatus, string> = {
  scheduled: 'Programada',
  completed: 'Completada',
  skipped: 'Salteada',
}

export interface ExamCountdown {
  kind: 'past' | 'today' | 'tomorrow' | 'upcoming'
  days: number
  label: string
}

/** Cuenta regresiva de un examen, siempre con texto. */
export function getExamCountdown(
  exam: Pick<Exam, 'exam_at'>,
  { timeZone, now = new Date() }: { timeZone: string; now?: Date },
): ExamCountdown {
  const { kind, days } = getCountdown(exam.exam_at, { timeZone, now })
  const labels = {
    past: 'Ya pasó',
    today: 'Hoy',
    tomorrow: 'Mañana',
    upcoming: `En ${days} días`,
  }

  return { kind, days, label: labels[kind] }
}

export function emptyExamFormValues({
  subjectId = '',
  examDate = '',
}: {
  subjectId?: string
  examDate?: string
} = {}): ExamFormInput {
  return {
    title: '',
    description: '',
    subject_id: subjectId,
    exam_date: examDate,
    exam_time: DEFAULT_EXAM_TIME,
    duration_minutes: '',
    location: '',
    node_id: '',
    plan_enabled: false,
    study_days_before: String(DEFAULT_STUDY_PLAN.daysBefore),
    study_frequency_days: String(DEFAULT_STUDY_PLAN.frequencyDays),
    study_session_minutes: String(DEFAULT_STUDY_PLAN.sessionMinutes),
    study_time: DEFAULT_STUDY_PLAN.time,
  }
}

export function examToFormValues(exam: Exam, timeZone: string): ExamFormInput {
  const plan = examToStudyPlan(exam)
  const planValues = plan ?? DEFAULT_STUDY_PLAN

  return {
    title: exam.title,
    description: exam.description ?? '',
    subject_id: exam.subject_id,
    exam_date: zonedDateKey(exam.exam_at, timeZone),
    exam_time: zonedTime(exam.exam_at, timeZone),
    duration_minutes: exam.duration_minutes === null ? '' : String(exam.duration_minutes),
    location: exam.location ?? '',
    node_id: exam.node_id ?? '',
    plan_enabled: plan !== null,
    study_days_before: String(planValues.daysBefore),
    study_frequency_days: String(planValues.frequencyDays),
    study_session_minutes: String(planValues.sessionMinutes),
    study_time: planValues.time,
  }
}

/**
 * Plan de estudio tal como está cargado en el formulario, o `null` si está
 * apagado o todavía tiene valores inválidos. Sirve para la vista previa.
 */
export function formValuesToStudyPlan(values: ExamFormInput): StudyPlan | null {
  const { daysBefore, frequencyDays, sessionMinutes } = STUDY_PLAN_LIMITS

  if (
    !values.plan_enabled ||
    !isIntegerInRange(values.study_days_before, daysBefore.min, daysBefore.max) ||
    !isIntegerInRange(values.study_frequency_days, frequencyDays.min, frequencyDays.max) ||
    !isIntegerInRange(values.study_session_minutes, sessionMinutes.min, sessionMinutes.max) ||
    !isTimeValue(values.study_time)
  ) {
    return null
  }

  return {
    daysBefore: Number(values.study_days_before),
    frequencyDays: Number(values.study_frequency_days),
    sessionMinutes: Number(values.study_session_minutes),
    time: values.study_time,
  }
}

export function toExamPayload(values: ExamFormInput, timeZone: string) {
  const plan = formValuesToStudyPlan(values)

  return {
    subject_id: values.subject_id,
    title: values.title,
    description: values.description || null,
    exam_at: zonedToUtcIso(values.exam_date, values.exam_time, timeZone),
    duration_minutes: values.duration_minutes === '' ? null : Number(values.duration_minutes),
    location: values.location || null,
    node_id: values.node_id || null,
    study_days_before: plan?.daysBefore ?? null,
    study_frequency_days: plan?.frequencyDays ?? null,
    study_session_minutes: plan?.sessionMinutes ?? null,
    study_time: plan?.time ?? null,
  }
}

export type ExamPayload = ReturnType<typeof toExamPayload>
