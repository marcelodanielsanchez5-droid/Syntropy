import {
  DEFAULT_EXAM_BLOCK_MINUTES,
  STUDY_SESSION_STATUS_LABELS,
  getExamCountdown,
} from '@/features/exams/exam-utils'
import {
  DEFAULT_DUE_TIME,
  TASK_KIND_LABELS,
  getTaskDueState,
  resolveTaskColor,
} from '@/features/tasks/task-utils'
import { shiftDateKey, toWallTime, zonedDateKey, zonedTime } from '@/lib/datetime'
import type { Exam, StudySession, Subject, Task } from '@/types/database'

/**
 * - `general`: todas las asignaturas del año. Solo fechas límite y exámenes.
 * - `subject`: una asignatura. Suma los días pintados hasta la entrega, el
 *   color propio de cada tarea y las sesiones de estudio.
 */
export type CalendarMode = 'general' | 'subject'

export type CalendarItemRef =
  | { type: 'task'; id: string }
  | { type: 'exam'; id: string }
  | { type: 'session'; id: string; examId: string }

export type CalendarEventKind = 'task' | 'task-range' | 'exam' | 'session'

export interface CalendarEventMeta {
  ref: CalendarItemRef
  kind: CalendarEventKind
  color: string
  subjectName: string
  /** Hora de vencimiento de una tarea, si no es el final del día. */
  timeLabel: string | null
  /** Estado en palabras: «Vence en 2 días», «Atrasada», «Examen · Mañana». */
  stateLabel: string
  done: boolean
  overdue: boolean
  /** Texto completo para lectores de pantalla y para el globo de ayuda. */
  description: string
}

export interface CalendarEvent {
  id: string
  title: string
  /** Fecha (`YYYY-MM-DD`) o fecha y hora local (`YYYY-MM-DDTHH:mm:ss`). */
  start: string
  /** Fin exclusivo, como espera el calendario. */
  end: string
  allDay: boolean
  extendedProps: CalendarEventMeta
}

const FALLBACK_SUBJECT_NAME = 'Asignatura'

function describe(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' · ')
}

export function buildCalendarEvents({
  tasks,
  exams,
  sessions,
  subjectsById,
  mode,
  timeZone,
  now = new Date(),
}: {
  tasks: Task[]
  exams: Exam[]
  sessions: StudySession[]
  subjectsById: Map<string, Subject>
  mode: CalendarMode
  timeZone: string
  now?: Date
}): CalendarEvent[] {
  const today = zonedDateKey(now, timeZone)
  const events: CalendarEvent[] = []

  for (const task of tasks) {
    const subject = subjectsById.get(task.subject_id)
    const subjectName = subject?.name ?? FALLBACK_SUBJECT_NAME
    const state = getTaskDueState(task, { timeZone, now })
    const dueDay = zonedDateKey(task.due_at, timeZone)
    const dueTime = zonedTime(task.due_at, timeZone)
    const timeLabel = dueTime === DEFAULT_DUE_TIME ? null : dueTime
    // Días pintados: desde hoy hasta la entrega, mientras la tarea siga abierta.
    const paintsRemainingDays =
      mode === 'subject' && state.kind !== 'done' && state.kind !== 'overdue' && dueDay > today
    const stateLabel = state.kind === 'overdue' ? `Atrasada · ${state.sentence}` : state.sentence

    events.push({
      id: `task:${task.id}`,
      title: task.title,
      start: paintsRemainingDays ? today : dueDay,
      end: shiftDateKey(dueDay, 1),
      allDay: true,
      extendedProps: {
        ref: { type: 'task', id: task.id },
        kind: paintsRemainingDays ? 'task-range' : 'task',
        color: resolveTaskColor(task, subject, mode),
        subjectName,
        timeLabel,
        stateLabel,
        done: state.kind === 'done',
        overdue: state.kind === 'overdue',
        description: describe([
          `${TASK_KIND_LABELS[task.kind]}: ${task.title}`,
          subjectName,
          stateLabel,
          timeLabel ? `a las ${timeLabel}` : null,
        ]),
      },
    })
  }

  const examsById = new Map(exams.map((exam) => [exam.id, exam]))

  for (const exam of exams) {
    const subject = subjectsById.get(exam.subject_id)
    const subjectName = subject?.name ?? FALLBACK_SUBJECT_NAME
    const countdown = getExamCountdown(exam, { timeZone, now })
    const minutes = exam.duration_minutes ?? DEFAULT_EXAM_BLOCK_MINUTES
    const stateLabel = `Examen · ${countdown.label}`

    events.push({
      id: `exam:${exam.id}`,
      title: exam.title,
      start: toWallTime(exam.exam_at, timeZone),
      end: toWallTime(Date.parse(exam.exam_at) + minutes * 60_000, timeZone),
      allDay: false,
      extendedProps: {
        ref: { type: 'exam', id: exam.id },
        kind: 'exam',
        color: subject?.color_hex ?? '#98A2B3',
        subjectName,
        timeLabel: null,
        stateLabel,
        done: countdown.kind === 'past',
        overdue: false,
        description: describe([
          `Examen: ${exam.title}`,
          subjectName,
          countdown.label,
          `a las ${zonedTime(exam.exam_at, timeZone)}`,
        ]),
      },
    })
  }

  // Las sesiones de estudio solo se ven en el calendario de la asignatura.
  if (mode === 'subject') {
    for (const session of sessions) {
      const exam = examsById.get(session.exam_id)

      if (!exam) {
        continue
      }

      const subject = subjectsById.get(exam.subject_id)
      const subjectName = subject?.name ?? FALLBACK_SUBJECT_NAME
      const stateLabel = `Estudio · ${STUDY_SESSION_STATUS_LABELS[session.status]}`

      events.push({
        id: `session:${session.id}`,
        title: exam.title,
        start: toWallTime(session.scheduled_at, timeZone),
        end: toWallTime(
          Date.parse(session.scheduled_at) + session.duration_minutes * 60_000,
          timeZone,
        ),
        allDay: false,
        extendedProps: {
          ref: { type: 'session', id: session.id, examId: exam.id },
          kind: 'session',
          color: subject?.color_hex ?? '#98A2B3',
          subjectName,
          timeLabel: null,
          stateLabel,
          done: session.status !== 'scheduled',
          overdue: false,
          description: describe([
            `Sesión de estudio para ${exam.title}`,
            subjectName,
            STUDY_SESSION_STATUS_LABELS[session.status],
            `a las ${zonedTime(session.scheduled_at, timeZone)}`,
            `${session.duration_minutes} minutos`,
          ]),
        },
      })
    }
  }

  return events
}
