import { ChevronDown, FolderKanban } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatShortDayAndTime } from '@/lib/datetime'
import type { Subject, Task, TaskStatus } from '@/types/database'
import { OverdueBadge, TaskStatusBadge } from './TaskStatusBadge'
import {
  TASK_KIND_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  getTaskDueState,
  resolveTaskColor,
} from './task-utils'

interface TaskCardProps {
  task: Task
  subject: Subject | undefined
  mode: 'general' | 'subject'
  timeZone: string
  now: Date
  onOpen: (task: Task) => void
  onStatusChange: (task: Task, status: TaskStatus) => void
}

export function TaskCard({
  task,
  subject,
  mode,
  timeZone,
  now,
  onOpen,
  onStatusChange,
}: TaskCardProps) {
  const color = resolveTaskColor(task, subject, mode)
  const due = getTaskDueState(task, { timeZone, now })
  const done = due.kind === 'done'
  const dueTone =
    due.kind === 'overdue'
      ? 'text-danger'
      : due.kind === 'today'
        ? 'text-warning'
        : 'text-ink-muted'

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-xl border border-line bg-surface/40 transition hover:border-line-strong hover:bg-surface/60',
        done && 'opacity-70',
      )}
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={() => onOpen(task)}
        className="block w-full px-4 pb-2 pl-5 pt-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-bright/60"
        aria-label={`Abrir ${TASK_KIND_LABELS[task.kind].toLowerCase()} ${task.title}`}
      >
        <p
          className={cn(
            'line-clamp-2 text-sm font-semibold leading-5 text-ink',
            done && 'text-ink-secondary line-through decoration-ink-disabled',
          )}
        >
          {task.title}
        </p>
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-ink-muted">
          {mode === 'general' ? (
            <>
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: subject?.color_hex ?? color }}
                aria-hidden="true"
              />
              <span className="truncate">{subject?.name ?? 'Asignatura'}</span>
              <span className="text-ink-disabled" aria-hidden="true">
                ·
              </span>
            </>
          ) : null}
          {task.kind === 'project' ? (
            <FolderKanban className="h-3 w-3 shrink-0" aria-hidden="true" />
          ) : null}
          <span className="shrink-0">{TASK_KIND_LABELS[task.kind]}</span>
        </p>
        <p className={cn('mt-1.5 text-xs font-medium', dueTone)}>
          {due.sentence}
          <span className="font-normal text-ink-disabled">
            {' '}
            · {formatShortDayAndTime(task.due_at, timeZone)}
          </span>
        </p>
      </button>

      <div className="flex items-center justify-between gap-2 px-4 pb-3 pl-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <TaskStatusBadge status={task.status} />
          {due.kind === 'overdue' ? <OverdueBadge /> : null}
        </div>
        <label className="relative shrink-0">
          <span className="sr-only">Cambiar estado de {task.title}</span>
          <select
            value={task.status}
            onChange={(event) => onStatusChange(task, event.target.value as TaskStatus)}
            className="h-8 appearance-none rounded-lg border border-line bg-sunken pl-2.5 pr-7 text-xs font-medium text-ink-secondary transition hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/40"
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-disabled"
            aria-hidden="true"
          />
        </label>
      </div>
    </article>
  )
}
