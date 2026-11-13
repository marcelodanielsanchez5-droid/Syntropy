import { getExamCountdown } from '@/features/exams/exam-utils'
import { getTaskDueState } from '@/features/tasks/task-utils'
import type { Exam, Subject, Task } from '@/types/database'

/**
 * Próximos vencimientos calculados con los datos existentes (decisión D6): no
 * se guardan notificaciones. Lo usan la campana, el inicio y el calendario.
 */
export interface UpcomingItem {
  key: string
  type: 'task' | 'exam'
  id: string
  title: string
  subjectId: string
  subjectName: string
  color: string
  /** Instante del vencimiento o del examen. */
  at: string
  /** «Tarea», «Proyecto» o «Examen». */
  kindLabel: string
  /** «Hoy», «Mañana», «En 3 días», «Atrasada». */
  label: string
  /** Días de calendario que faltan; negativo si ya pasó. */
  days: number
  overdue: boolean
}

export function getUpcomingItems({
  tasks,
  exams,
  subjectsById,
  timeZone,
  now = new Date(),
  withinDays = 7,
  includeOverdue = true,
}: {
  tasks: Task[]
  exams: Exam[]
  subjectsById: Map<string, Subject>
  timeZone: string
  now?: Date
  /** Cuántos días hacia adelante mirar; 0 es solo hoy. */
  withinDays?: number
  /** Incluir las tareas vencidas que siguen sin terminar. */
  includeOverdue?: boolean
}): UpcomingItem[] {
  const items: UpcomingItem[] = []

  for (const task of tasks) {
    const state = getTaskDueState(task, { timeZone, now })

    if (state.kind === 'done') {
      continue
    }

    const overdue = state.kind === 'overdue'

    if (overdue ? !includeOverdue : state.days > withinDays) {
      continue
    }

    const subject = subjectsById.get(task.subject_id)

    items.push({
      key: `task:${task.id}`,
      type: 'task',
      id: task.id,
      title: task.title,
      subjectId: task.subject_id,
      subjectName: subject?.name ?? 'Asignatura',
      color: subject?.color_hex ?? '#98A2B3',
      at: task.due_at,
      kindLabel: task.kind === 'project' ? 'Proyecto' : 'Tarea',
      label: state.label,
      days: state.days,
      overdue,
    })
  }

  for (const exam of exams) {
    const countdown = getExamCountdown(exam, { timeZone, now })

    if (countdown.kind === 'past' || countdown.days > withinDays) {
      continue
    }

    const subject = subjectsById.get(exam.subject_id)

    items.push({
      key: `exam:${exam.id}`,
      type: 'exam',
      id: exam.id,
      title: exam.title,
      subjectId: exam.subject_id,
      subjectName: subject?.name ?? 'Asignatura',
      color: subject?.color_hex ?? '#98A2B3',
      at: exam.exam_at,
      kindLabel: 'Examen',
      label: countdown.label,
      days: countdown.days,
      overdue: false,
    })
  }

  return items.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
}

/** Próximo vencimiento de cada asignatura, para mostrarlo en su carpeta. */
export function getNextDueBySubject(items: UpcomingItem[]): Map<string, UpcomingItem> {
  const next = new Map<string, UpcomingItem>()

  for (const item of items) {
    if (!item.overdue && !next.has(item.subjectId)) {
      next.set(item.subjectId, item)
    }
  }

  return next
}
