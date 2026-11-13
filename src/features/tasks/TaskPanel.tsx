import { ListTodo, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { Subject, Task, TaskStatus } from '@/types/database'
import { TaskCard } from './TaskCard'
import {
  TASK_FILTERS,
  countTasksByStatus,
  filterTasks,
  sortTasks,
  type TaskStatusFilter,
} from './task-utils'

interface TaskPanelProps {
  /** Tareas ya filtradas por asignatura; el panel filtra por estado. */
  tasks: Task[]
  subjectsById: Map<string, Subject>
  mode: 'general' | 'subject'
  timeZone: string
  now: Date
  statusFilter: TaskStatusFilter
  onStatusFilterChange: (filter: TaskStatusFilter) => void
  onCreate: () => void
  onOpen: (task: Task) => void
  onStatusChange: (task: Task, status: TaskStatus) => void
  canCreate?: boolean
  className?: string
}

const EMPTY_MESSAGES: Record<TaskStatusFilter, string> = {
  all: 'Todavía no hay tareas. Agregá la primera con su fecha límite.',
  pending: 'No hay tareas pendientes.',
  waiting: 'No hay tareas en espera.',
  done: 'Todavía no terminaste ninguna tarea.',
}

/** Panel de tareas: filtros por estado, lista ordenada por vencimiento y alta rápida. */
export function TaskPanel({
  tasks,
  subjectsById,
  mode,
  timeZone,
  now,
  statusFilter,
  onStatusFilterChange,
  onCreate,
  onOpen,
  onStatusChange,
  canCreate = true,
  className,
}: TaskPanelProps) {
  const counts = countTasksByStatus(tasks)
  const visible = sortTasks(filterTasks(tasks, { status: statusFilter }))

  return (
    <section aria-labelledby="task-panel-title" className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="task-panel-title" className="text-base font-bold text-ink">
          Tareas
        </h2>
        <Button
          size="sm"
          onClick={onCreate}
          disabled={!canCreate}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          Nueva
        </Button>
      </div>

      <div
        role="radiogroup"
        aria-label="Filtrar tareas por estado"
        className="mt-3 flex flex-wrap gap-1.5"
      >
        {TASK_FILTERS.map((filter) => {
          const selected = filter.value === statusFilter

          return (
            <button
              key={filter.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onStatusFilterChange(filter.value)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60',
                selected
                  ? 'border-rose/40 bg-rose/15 text-rose-soft'
                  : 'border-line bg-white/5 text-ink-muted hover:text-ink-secondary',
              )}
            >
              {filter.label}
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px] tabular-nums',
                  selected ? 'bg-rose/25 text-white' : 'bg-white/5 text-ink-disabled',
                )}
              >
                {counts[filter.value]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 space-y-2.5" aria-live="polite">
        {visible.length > 0 ? (
          visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              subject={subjectsById.get(task.subject_id)}
              mode={mode}
              timeZone={timeZone}
              now={now}
              onOpen={onOpen}
              onStatusChange={onStatusChange}
            />
          ))
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-line-strong/70 bg-sunken/40 px-4 py-8 text-center">
            <ListTodo className="h-5 w-5 text-ink-disabled" aria-hidden="true" />
            <p className="mt-2 text-sm text-ink-muted">{EMPTY_MESSAGES[statusFilter]}</p>
            {statusFilter !== 'all' && counts.all > 0 ? (
              <button
                type="button"
                onClick={() => onStatusFilterChange('all')}
                className="mt-2 text-xs font-semibold text-rose-bright hover:text-rose-soft"
              >
                Ver todas
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}
