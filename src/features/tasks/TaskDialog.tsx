import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  mobileSheetClassName,
} from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { NodeSelect } from '@/features/nodes/NodeSelect'
import { cn } from '@/lib/cn'
import { getErrorMessage } from '@/lib/errors'
import type { Subject, Task } from '@/types/database'
import { useCreateTask, useDeleteTask, useUpdateTask } from './task-hooks'
import { taskFormSchema, type TaskFormInput } from './task-schemas'
import {
  TASK_KIND_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  emptyTaskFormValues,
  taskToFormValues,
  toTaskPayload,
} from './task-utils'

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  timeZone: string
  /** `null` para crear una tarea nueva. */
  task: Task | null
  subjects: Subject[]
  /** En el calendario de una asignatura, la tarea queda fija en ella. */
  lockedSubjectId?: string
  defaultDueDate?: string
}

export function TaskDialog({
  open,
  onOpenChange,
  userId,
  timeZone,
  task,
  subjects,
  lockedSubjectId,
  defaultDueDate,
}: TaskDialogProps) {
  const createTask = useCreateTask(userId)
  const updateTask = useUpdateTask(userId)
  const deleteTask = useDeleteTask(userId)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isEditing = task !== null

  const form = useForm<TaskFormInput>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: emptyTaskFormValues(),
  })
  const { errors } = form.formState
  const subjectId = form.watch('subject_id')
  const subject = subjects.find((item) => item.id === subjectId)

  useEffect(() => {
    if (!open) {
      return
    }

    setError(null)
    form.reset(
      task
        ? taskToFormValues(task, timeZone)
        : emptyTaskFormValues({
            subjectId: lockedSubjectId ?? (subjects.length === 1 ? subjects[0].id : ''),
            dueDate: defaultDueDate ?? '',
          }),
    )
    // Solo al abrir: si cambian las props con el diálogo abierto no se pisa lo que se escribió.
  }, [open, task])

  const saving = createTask.isPending || updateTask.isPending

  async function onSubmit(values: TaskFormInput) {
    setError(null)

    try {
      const payload = toTaskPayload(values, { timeZone, previous: task ?? undefined })

      if (task) {
        await updateTask.mutateAsync({ taskId: task.id, payload })
        toast.success('Tarea actualizada.')
      } else {
        await createTask.mutateAsync(payload)
        toast.success('Tarea creada.')
      }

      onOpenChange(false)
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'No pudimos guardar la tarea. Intentá de nuevo.'))
    }
  }

  async function handleDelete() {
    if (!task) {
      return
    }

    try {
      await deleteTask.mutateAsync(task.id)
      setConfirmDelete(false)
      onOpenChange(false)
      toast.success('Tarea eliminada.')
    } catch (nextError) {
      setConfirmDelete(false)
      setError(getErrorMessage(nextError, 'No pudimos eliminar la tarea.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-xl', mobileSheetClassName)}>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar tarea' : 'Nueva tarea'}</DialogTitle>
          <DialogDescription>
            La fecha límite aparece en el calendario y en el panel de tareas.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Título" htmlFor="task-title" error={errors.title?.message} required>
            <Input
              id="task-title"
              placeholder="Ensayo de Lengua"
              autoComplete="off"
              invalid={Boolean(errors.title)}
              {...form.register('title')}
            />
          </Field>

          {lockedSubjectId ? null : (
            <Field
              label="Asignatura"
              htmlFor="task-subject"
              error={errors.subject_id?.message}
              required
            >
              <Select
                id="task-subject"
                invalid={Boolean(errors.subject_id)}
                {...form.register('subject_id', {
                  onChange: () => form.setValue('node_id', ''),
                })}
              >
                <option value="">Elegí una asignatura</option>
                {subjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Fecha límite"
              htmlFor="task-due-date"
              error={errors.due_date?.message}
              required
            >
              <Input
                id="task-due-date"
                type="date"
                invalid={Boolean(errors.due_date)}
                {...form.register('due_date')}
              />
            </Field>
            <Field
              label="Hora"
              htmlFor="task-due-time"
              error={errors.due_time?.message}
              hint="Por defecto, fin del día"
            >
              <Input
                id="task-due-time"
                type="time"
                invalid={Boolean(errors.due_time)}
                {...form.register('due_time')}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-ink-secondary">Tipo</p>
              <Controller
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <SegmentedControl
                    label="Tipo"
                    value={field.value}
                    onChange={field.onChange}
                    className="w-full"
                    options={(['task', 'project'] as const).map((kind) => ({
                      value: kind,
                      label: TASK_KIND_LABELS[kind],
                    }))}
                  />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-ink-secondary">Estado</p>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <SegmentedControl
                    label="Estado"
                    value={field.value}
                    onChange={field.onChange}
                    size="sm"
                    className="h-11 w-full items-center"
                    options={TASK_STATUSES.map((status) => ({
                      value: status,
                      label: TASK_STATUS_LABELS[status],
                    }))}
                  />
                )}
              />
            </div>
          </div>

          <Field label="Tema" htmlFor="task-node" hint="Opcional · del mapa de nodos">
            <NodeSelect
              id="task-node"
              userId={userId}
              subjectId={subjectId}
              {...form.register('node_id')}
            />
          </Field>

          <Field
            label="Descripción"
            htmlFor="task-description"
            error={errors.description?.message}
            hint="Opcional"
          >
            <Textarea
              id="task-description"
              placeholder="Consigna, materiales, lo que falta…"
              className="min-h-24"
              invalid={Boolean(errors.description)}
              {...form.register('description')}
            />
          </Field>

          <div className="space-y-2 rounded-xl border border-line bg-sunken/40 p-3.5">
            <div>
              <p className="text-sm font-medium text-ink-secondary">Color propio</p>
              <p className="text-xs text-ink-disabled">
                Solo se ve en el calendario de la asignatura. En el general manda el color de la
                materia.
              </p>
            </div>
            <Controller
              control={form.control}
              name="color_hex"
              render={({ field }) => (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => field.onChange('')}
                    aria-pressed={field.value === ''}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                      field.value === ''
                        ? 'border-rose/40 bg-rose/10 text-rose-soft'
                        : 'border-line text-ink-muted hover:text-ink-secondary',
                    )}
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: subject?.color_hex ?? '#98A2B3' }}
                      aria-hidden="true"
                    />
                    Usar el de la asignatura
                  </button>
                  <ColorPicker
                    label="Color propio de la tarea"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.color_hex?.message}
                  />
                </div>
              )}
            />
          </div>

          <DialogFooter className="items-center sm:justify-between">
            {isEditing ? (
              <Button
                type="button"
                variant="ghost"
                className="text-danger hover:bg-danger/10 hover:text-danger"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
              >
                Eliminar
              </Button>
            ) : (
              <span className="hidden sm:block" />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                {isEditing ? 'Guardar cambios' : 'Crear tarea'}
              </Button>
            </div>
          </DialogFooter>
        </form>

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Eliminar tarea"
          description={`Se va a eliminar “${task?.title ?? ''}”. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar tarea"
          onConfirm={() => void handleDelete()}
          loading={deleteTask.isPending}
          destructive
        />
      </DialogContent>
    </Dialog>
  )
}
