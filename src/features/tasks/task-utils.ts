import { getCountdown, zonedDateKey, zonedTime, zonedToUtcIso } from '@/lib/datetime'
import type { Subject, Task, TaskKind, TaskStatus } from '@/types/database'
import type { TaskFormInput } from './task-schemas'

export const TASK_STATUSES: TaskStatus[] = ['pending', 'waiting', 'done']

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  waiting: 'En espera',
  done: 'Terminada',
}

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  task: 'Tarea',
  project: 'Proyecto',
}

/** Una tarea sin hora cargada vence al final del día. */
export const DEFAULT_DUE_TIME = '23:59'

export type TaskStatusFilter = 'all' | TaskStatus

export const TASK_FILTERS: Array<{ value: TaskStatusFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'waiting', label: 'En espera' },
  { value: 'done', label: 'Terminadas' },
]

export type TaskDueKind = 'done' | 'overdue' | 'today' | 'tomorrow' | 'upcoming'

export interface TaskDueState {
  kind: TaskDueKind
  /** Días de calendario hasta el vencimiento; negativo si el día ya pasó. */
  days: number
  /** Etiqueta corta para chips: «Hoy», «Mañana», «En 2 días», «Atrasada». */
  label: string
  /** Frase para tarjetas: «Vence hoy», «Venció hace 3 días». */
  sentence: string
}

/**
 * Cuenta regresiva de una tarea. El estado nunca depende solo del color: cada
 * caso tiene su texto.
 */
export function getTaskDueState(
  task: Pick<Task, 'due_at' | 'status'>,
  { timeZone, now = new Date() }: { timeZone: string; now?: Date },
): TaskDueState {
  const { kind, days } = getCountdown(task.due_at, { timeZone, now })

  if (task.status === 'done') {
    return { kind: 'done', days, label: 'Terminada', sentence: 'Terminada' }
  }

  if (kind === 'past') {
    const daysLate = Math.abs(days)
    const sentence =
      daysLate === 0
        ? 'Venció hoy'
        : daysLate === 1
          ? 'Venció ayer'
          : `Venció hace ${daysLate} días`

    return { kind: 'overdue', days, label: 'Atrasada', sentence }
  }

  if (kind === 'today') {
    return { kind: 'today', days, label: 'Hoy', sentence: 'Vence hoy' }
  }

  if (kind === 'tomorrow') {
    return { kind: 'tomorrow', days, label: 'Mañana', sentence: 'Vence mañana' }
  }

  return { kind: 'upcoming', days, label: `En ${days} días`, sentence: `Vence en ${days} días` }
}

/**
 * Color con el que se dibuja una tarea. En el calendario general manda el color
 * de la asignatura; en el de la asignatura, la tarea puede tener color propio.
 */
export function resolveTaskColor(
  task: Pick<Task, 'color_hex'>,
  subject: Pick<Subject, 'color_hex'> | undefined,
  mode: 'general' | 'subject',
): string {
  const subjectColor = subject?.color_hex ?? '#98A2B3'

  return mode === 'subject' ? (task.color_hex ?? subjectColor) : subjectColor
}

export function filterTasks(
  tasks: Task[],
  { status = 'all', subjectId = 'all' }: { status?: TaskStatusFilter; subjectId?: string },
): Task[] {
  return tasks.filter(
    (task) =>
      (status === 'all' || task.status === status) &&
      (subjectId === 'all' || task.subject_id === subjectId),
  )
}

/** Primero lo que falta hacer, por vencimiento; al final lo terminado, de lo más reciente a lo más viejo. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === 'done'
    const bDone = b.status === 'done'

    if (aDone !== bDone) {
      return aDone ? 1 : -1
    }

    if (aDone) {
      return Date.parse(b.completed_at ?? b.due_at) - Date.parse(a.completed_at ?? a.due_at)
    }

    return Date.parse(a.due_at) - Date.parse(b.due_at)
  })
}

export function countTasksByStatus(tasks: Task[]): Record<TaskStatusFilter, number> {
  const counts: Record<TaskStatusFilter, number> = {
    all: tasks.length,
    pending: 0,
    waiting: 0,
    done: 0,
  }

  for (const task of tasks) {
    counts[task.status] += 1
  }

  return counts
}

/** Cambio de estado listo para guardar: la fecha de finalización acompaña siempre a «Terminada». */
export function statusPatch(status: TaskStatus, now = new Date()) {
  return {
    status,
    completed_at: status === 'done' ? now.toISOString() : null,
  }
}

export function emptyTaskFormValues({
  subjectId = '',
  dueDate = '',
}: {
  subjectId?: string
  dueDate?: string
} = {}): TaskFormInput {
  return {
    title: '',
    description: '',
    subject_id: subjectId,
    kind: 'task',
    status: 'pending',
    due_date: dueDate,
    due_time: DEFAULT_DUE_TIME,
    color_hex: '',
    node_id: '',
  }
}

export function taskToFormValues(task: Task, timeZone: string): TaskFormInput {
  return {
    title: task.title,
    description: task.description ?? '',
    subject_id: task.subject_id,
    kind: task.kind,
    status: task.status,
    due_date: zonedDateKey(task.due_at, timeZone),
    due_time: zonedTime(task.due_at, timeZone),
    color_hex: task.color_hex ?? '',
    node_id: task.node_id ?? '',
  }
}

export function toTaskPayload(
  values: TaskFormInput,
  {
    timeZone,
    now = new Date(),
    previous,
  }: { timeZone: string; now?: Date; previous?: Pick<Task, 'status' | 'completed_at'> },
) {
  // Si ya estaba terminada, se conserva la fecha original de finalización.
  const completedAt =
    values.status === 'done'
      ? previous?.status === 'done' && previous.completed_at
        ? previous.completed_at
        : now.toISOString()
      : null

  return {
    subject_id: values.subject_id,
    title: values.title,
    description: values.description || null,
    kind: values.kind,
    status: values.status,
    color_hex: values.color_hex || null,
    node_id: values.node_id || null,
    due_at: zonedToUtcIso(values.due_date, values.due_time, timeZone),
    completed_at: completedAt,
  }
}

export type TaskPayload = ReturnType<typeof toTaskPayload>
