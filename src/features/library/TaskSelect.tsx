import { forwardRef, useMemo, type SelectHTMLAttributes } from 'react'
import { Select } from '@/components/ui/Select'
import { useTasks } from '@/features/tasks/task-hooks'
import { sortTasks } from '@/features/tasks/task-utils'

interface TaskSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  userId: string
  subjectId: string
}

/** Tareas de una asignatura, para indicar en cuál se usa una fuente. Vacío = ninguna. */
export const TaskSelect = forwardRef<HTMLSelectElement, TaskSelectProps>(function TaskSelect(
  { userId, subjectId, ...props },
  ref,
) {
  const subjectIds = useMemo(() => (subjectId ? [subjectId] : []), [subjectId])
  const tasksQuery = useTasks(userId, subjectIds)
  const tasks = useMemo(() => sortTasks(tasksQuery.data ?? []), [tasksQuery.data])

  return (
    <Select ref={ref} disabled={!subjectId || props.disabled} {...props}>
      <option value="">
        {!subjectId
          ? 'Elegí primero la asignatura'
          : tasks.length === 0
            ? 'Sin tareas cargadas'
            : 'Ninguna tarea'}
      </option>
      {tasks.map((task) => (
        <option key={task.id} value={task.id}>
          {task.status === 'done' ? `${task.title} (terminada)` : task.title}
        </option>
      ))}
    </Select>
  )
})
