import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
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
import { cn } from '@/lib/cn'
import { isTimeValue } from '@/lib/datetime'
import { getErrorMessage } from '@/lib/errors'
import type { ScheduleEntry, ScheduleEntryType, Subject } from '@/types/database'
import { useScheduleMutations } from './schedule-hooks'
import {
  emptyScheduleFormValues,
  scheduleEntryToFormValues,
  toSchedulePayloads,
} from './schedule-form'
import { scheduleFormSchema, type ScheduleFormInput } from './schedule-schemas'
import {
  ENTRY_TYPES,
  ENTRY_TYPE_LABELS,
  WEEKDAYS,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  findScheduleConflicts,
  formatTimeRange,
} from './schedule-utils'

export interface ScheduleDialogDefaults {
  weekday?: number
  startsAt?: string
  subjectId?: string
}

interface ScheduleEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  yearId: string
  /** `null` para crear un bloque nuevo. */
  entry: ScheduleEntry | null
  entries: ScheduleEntry[]
  subjects: Subject[]
  defaults?: ScheduleDialogDefaults
}

function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number)
  const total = Math.min(hours * 60 + mins + minutes, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function ScheduleEntryDialog({
  open,
  onOpenChange,
  userId,
  yearId,
  entry,
  entries,
  subjects,
  defaults,
}: ScheduleEntryDialogProps) {
  const { create, update, remove } = useScheduleMutations(userId)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isEditing = entry !== null

  const form = useForm<ScheduleFormInput>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: emptyScheduleFormValues(),
  })
  const { errors } = form.formState
  const values = useWatch({ control: form.control }) as ScheduleFormInput
  const subject = subjects.find((item) => item.id === values.subject_id)

  useEffect(() => {
    if (!open) {
      return
    }

    setError(null)

    if (entry) {
      form.reset(scheduleEntryToFormValues(entry))
      return
    }

    const base = emptyScheduleFormValues({
      subjectId: defaults?.subjectId,
      weekday: defaults?.weekday,
    })

    form.reset(
      defaults?.startsAt
        ? { ...base, starts_at: defaults.startsAt, ends_at: addMinutes(defaults.startsAt, 60) }
        : base,
    )
    // Solo al abrir: si cambian las props con el diálogo abierto no se pisa lo que se escribió.
  }, [open, entry])

  const conflicts = useMemo(() => {
    if (!isTimeValue(values.starts_at ?? '') || !isTimeValue(values.ends_at ?? '')) {
      return []
    }

    return (values.weekdays ?? []).flatMap((weekday) =>
      findScheduleConflicts(
        { id: entry?.id, weekday, starts_at: values.starts_at, ends_at: values.ends_at },
        entries,
      ),
    )
  }, [values.weekdays, values.starts_at, values.ends_at, entries, entry?.id])

  const saving = create.isPending || update.isPending

  async function onSubmit(formValues: ScheduleFormInput) {
    setError(null)
    const payloads = toSchedulePayloads(formValues, subject)

    try {
      if (entry) {
        await update.mutateAsync({ entryId: entry.id, payload: payloads[0] })
        toast.success('Bloque actualizado.')
      } else {
        await create.mutateAsync({ yearId, payloads })
        toast.success(
          payloads.length === 1 ? 'Bloque agregado.' : `${payloads.length} bloques agregados.`,
        )
      }

      onOpenChange(false)
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'No pudimos guardar el bloque. Intentá de nuevo.'))
    }
  }

  async function handleDelete() {
    if (!entry) {
      return
    }

    try {
      await remove.mutateAsync(entry.id)
      setConfirmDelete(false)
      onOpenChange(false)
      toast.success('Bloque eliminado.')
    } catch (nextError) {
      setConfirmDelete(false)
      setError(getErrorMessage(nextError, 'No pudimos eliminar el bloque.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-xl', mobileSheetClassName)}>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar bloque' : 'Nuevo bloque'}</DialogTitle>
          <DialogDescription>
            Clases, descansos y actividades de tu semana. Se repiten todas las semanas del año
            activo.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-ink-secondary">Tipo</p>
            <Controller
              control={form.control}
              name="entry_type"
              render={({ field }) => (
                <SegmentedControl
                  label="Tipo de bloque"
                  value={field.value}
                  onChange={(next: ScheduleEntryType) => field.onChange(next)}
                  className="w-full"
                  options={ENTRY_TYPES.map((type) => ({
                    value: type,
                    label: ENTRY_TYPE_LABELS[type],
                  }))}
                />
              )}
            />
          </div>

          <Field
            label="Asignatura"
            htmlFor="schedule-subject"
            error={errors.subject_id?.message}
            hint={values.entry_type === 'class' ? undefined : 'Opcional'}
            required={values.entry_type === 'class'}
          >
            <Select
              id="schedule-subject"
              invalid={Boolean(errors.subject_id)}
              {...form.register('subject_id')}
            >
              <option value="">
                {values.entry_type === 'class' ? 'Elegí una asignatura' : 'Sin asignatura'}
              </option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Nombre"
            htmlFor="schedule-title"
            error={errors.title?.message}
            hint={subject ? `Si lo dejás vacío: «${subject.name}»` : undefined}
            required={!subject}
          >
            <Input
              id="schedule-title"
              autoComplete="off"
              placeholder={
                subject
                  ? subject.name
                  : values.entry_type === 'break'
                    ? 'Recreo'
                    : values.entry_type === 'activity'
                      ? 'Fútbol, inglés, música…'
                      : 'Nombre del bloque'
              }
              invalid={Boolean(errors.title)}
              {...form.register('title')}
            />
          </Field>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-ink-secondary">
              {isEditing ? 'Día' : 'Días'}
              <span className="ml-1 text-rose-bright">*</span>
            </p>
            <Controller
              control={form.control}
              name="weekdays"
              render={({ field }) => (
                <div
                  className="flex flex-wrap gap-1.5"
                  role={isEditing ? 'radiogroup' : 'group'}
                  aria-label={isEditing ? 'Día' : 'Días'}
                >
                  {WEEKDAYS.map((day) => {
                    const selected = field.value.includes(day)

                    return (
                      <button
                        key={day}
                        type="button"
                        role={isEditing ? 'radio' : undefined}
                        aria-checked={isEditing ? selected : undefined}
                        aria-pressed={isEditing ? undefined : selected}
                        aria-label={WEEKDAY_NAMES[day]}
                        onClick={() =>
                          field.onChange(
                            isEditing
                              ? [day]
                              : selected
                                ? field.value.filter((value) => value !== day)
                                : [...field.value, day],
                          )
                        }
                        className={cn(
                          'h-10 min-w-12 rounded-xl border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60',
                          selected
                            ? 'border-rose/50 bg-rose/15 text-rose-soft'
                            : 'border-line bg-sunken text-ink-muted hover:text-ink-secondary',
                        )}
                      >
                        {WEEKDAY_SHORT[day]}
                      </button>
                    )
                  })}
                </div>
              )}
            />
            {errors.weekdays?.message ? (
              <p className="text-xs font-medium text-danger" role="alert">
                {errors.weekdays.message}
              </p>
            ) : !isEditing ? (
              <p className="text-xs text-ink-disabled">
                Podés elegir varios: se crea un bloque por día.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Desde"
              htmlFor="schedule-start"
              error={errors.starts_at?.message}
              required
            >
              <Input
                id="schedule-start"
                type="time"
                invalid={Boolean(errors.starts_at)}
                {...form.register('starts_at')}
              />
            </Field>
            <Field label="Hasta" htmlFor="schedule-end" error={errors.ends_at?.message} required>
              <Input
                id="schedule-end"
                type="time"
                invalid={Boolean(errors.ends_at)}
                {...form.register('ends_at')}
              />
            </Field>
          </div>

          {conflicts.length > 0 ? (
            <div className="flex gap-2 rounded-lg border border-warning/25 bg-warning/10 p-3 text-xs leading-5 text-[#ffe1a3]">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Se superpone con{' '}
                {conflicts
                  .slice(0, 3)
                  .map(
                    (item) =>
                      `${item.title} (${WEEKDAY_SHORT[item.weekday]} ${formatTimeRange(item)})`,
                  )
                  .join(', ')}
                {conflicts.length > 3 ? ` y ${conflicts.length - 3} más` : ''}. Podés guardarlo
                igual.
              </p>
            </div>
          ) : null}

          <Field
            label="Lugar"
            htmlFor="schedule-location"
            error={errors.location?.message}
            hint="Opcional"
          >
            <Input
              id="schedule-location"
              placeholder="Aula 12, gimnasio, enlace…"
              invalid={Boolean(errors.location)}
              {...form.register('location')}
            />
          </Field>

          <Field
            label="Notas"
            htmlFor="schedule-notes"
            error={errors.notes?.message}
            hint="Opcional"
          >
            <Textarea
              id="schedule-notes"
              className="min-h-20"
              invalid={Boolean(errors.notes)}
              {...form.register('notes')}
            />
          </Field>

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
                {isEditing ? 'Guardar cambios' : 'Agregar'}
              </Button>
            </div>
          </DialogFooter>
        </form>

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Eliminar bloque"
          description={`Se va a eliminar «${entry?.title ?? ''}» del ${entry ? WEEKDAY_NAMES[entry.weekday].toLowerCase() : ''}. Los otros días no se tocan.`}
          confirmLabel="Eliminar bloque"
          onConfirm={() => void handleDelete()}
          loading={remove.isPending}
          destructive
        />
      </DialogContent>
    </Dialog>
  )
}
