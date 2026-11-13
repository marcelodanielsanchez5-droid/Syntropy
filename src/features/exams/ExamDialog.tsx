import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BookOpenCheck, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
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
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { NodeSelect } from '@/features/nodes/NodeSelect'
import { cn } from '@/lib/cn'
import { isIsoDate } from '@/lib/dates'
import { formatDayAndTime, isTimeValue, zonedToUtcIso } from '@/lib/datetime'
import { getErrorMessage } from '@/lib/errors'
import type { Exam, Subject } from '@/types/database'
import { useSaveExam } from './exam-hooks'
import { examFormSchema, type ExamFormInput } from './exam-schemas'
import {
  emptyExamFormValues,
  examToFormValues,
  formValuesToStudyPlan,
  toExamPayload,
} from './exam-utils'
import {
  STUDY_PLAN_LIMITS,
  describeStudyPlan,
  findOverlaps,
  generateStudySessions,
  type TimeBlock,
} from './study-plan'

interface ExamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  timeZone: string
  /** `null` para crear un examen nuevo. */
  exam: Exam | null
  subjects: Subject[]
  lockedSubjectId?: string
  defaultExamDate?: string
  /** Otros exámenes y sesiones, para avisar si el plan se superpone con ellos. */
  busyBlocks?: TimeBlock[]
  onSaved?: (exam: Exam) => void
}

function sessionsLabel(count: number) {
  return `${count} sesi${count === 1 ? 'ón' : 'ones'}`
}

export function ExamDialog({
  open,
  onOpenChange,
  userId,
  timeZone,
  exam,
  subjects,
  lockedSubjectId,
  defaultExamDate,
  busyBlocks = [],
  onSaved,
}: ExamDialogProps) {
  const saveExam = useSaveExam(userId, timeZone)
  const [error, setError] = useState<string | null>(null)
  const isEditing = exam !== null

  const form = useForm<ExamFormInput>({
    resolver: zodResolver(examFormSchema),
    defaultValues: emptyExamFormValues(),
  })
  const { errors } = form.formState
  const values = useWatch({ control: form.control }) as ExamFormInput
  const planEnabled = values.plan_enabled

  useEffect(() => {
    if (!open) {
      return
    }

    setError(null)
    form.reset(
      exam
        ? examToFormValues(exam, timeZone)
        : emptyExamFormValues({
            subjectId: lockedSubjectId ?? (subjects.length === 1 ? subjects[0].id : ''),
            examDate: defaultExamDate ?? '',
          }),
    )
    // Solo al abrir: si cambian las props con el diálogo abierto no se pisa lo que se escribió.
  }, [open, exam])

  // Vista previa del plan: las mismas reglas que se aplican al guardar.
  const preview = useMemo(() => {
    const plan = formValuesToStudyPlan(values)

    if (!plan || !isIsoDate(values.exam_date ?? '') || !isTimeValue(values.exam_time ?? '')) {
      return null
    }

    const examAt = zonedToUtcIso(values.exam_date, values.exam_time, timeZone)
    const sessions = generateStudySessions({ examAt, plan, timeZone })
    // Se descartan el propio examen y sus sesiones (`<id>` y `<id>:estudio`).
    const otherBlocks = exam
      ? busyBlocks.filter((block) => !block.id.startsWith(exam.id))
      : busyBlocks
    const conflicts = new Map<string, TimeBlock>()

    for (const session of sessions) {
      for (const block of findOverlaps(session, otherBlocks)) {
        conflicts.set(block.id, block)
      }
    }

    return {
      plan,
      sessions,
      conflicts: Array.from(conflicts.values()),
      examPassed: Date.parse(examAt) <= Date.now(),
    }
  }, [values, timeZone, busyBlocks, exam])

  async function onSubmit(formValues: ExamFormInput) {
    setError(null)

    try {
      const result = await saveExam.mutateAsync({
        previous: exam,
        payload: toExamPayload(formValues, timeZone),
      })

      if (result.plan && result.plan.planned === 0) {
        toast.warning('Examen guardado, pero no entra ninguna sesión de estudio antes de la fecha.')
      } else if (result.plan) {
        toast.success(`Examen guardado. Plan de estudio con ${sessionsLabel(result.plan.planned)}.`)
      } else {
        toast.success(isEditing ? 'Examen actualizado.' : 'Examen creado.')
      }

      onOpenChange(false)
      onSaved?.(result.exam)
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'No pudimos guardar el examen. Intentá de nuevo.'))
    }
  }

  const { daysBefore, frequencyDays, sessionMinutes } = STUDY_PLAN_LIMITS

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-xl', mobileSheetClassName)}>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar examen' : 'Nuevo examen'}</DialogTitle>
          <DialogDescription>
            Cargá la fecha y, si querés, un plan de estudio: la app reparte las sesiones hasta el
            examen.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Título" htmlFor="exam-title" error={errors.title?.message} required>
            <Input
              id="exam-title"
              placeholder="Parcial 1"
              autoComplete="off"
              invalid={Boolean(errors.title)}
              {...form.register('title')}
            />
          </Field>

          {lockedSubjectId ? null : (
            <Field
              label="Asignatura"
              htmlFor="exam-subject"
              error={errors.subject_id?.message}
              required
            >
              <Select
                id="exam-subject"
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

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Fecha" htmlFor="exam-date" error={errors.exam_date?.message} required>
              <Input
                id="exam-date"
                type="date"
                invalid={Boolean(errors.exam_date)}
                {...form.register('exam_date')}
              />
            </Field>
            <Field label="Hora" htmlFor="exam-time" error={errors.exam_time?.message} required>
              <Input
                id="exam-time"
                type="time"
                invalid={Boolean(errors.exam_time)}
                {...form.register('exam_time')}
              />
            </Field>
            <Field
              label="Duración"
              htmlFor="exam-duration"
              error={errors.duration_minutes?.message}
              hint="Minutos"
            >
              <Input
                id="exam-duration"
                type="number"
                inputMode="numeric"
                min={1}
                max={1440}
                placeholder="90"
                invalid={Boolean(errors.duration_minutes)}
                {...form.register('duration_minutes')}
              />
            </Field>
          </div>

          <Field label="Tema" htmlFor="exam-node" hint="Opcional · del mapa de nodos">
            <NodeSelect
              id="exam-node"
              userId={userId}
              subjectId={values.subject_id ?? ''}
              {...form.register('node_id')}
            />
          </Field>

          <Field
            label="Lugar"
            htmlFor="exam-location"
            error={errors.location?.message}
            hint="Opcional"
          >
            <Input
              id="exam-location"
              placeholder="Aula 12, laboratorio, enlace…"
              invalid={Boolean(errors.location)}
              {...form.register('location')}
            />
          </Field>

          <Field
            label="Temas y notas"
            htmlFor="exam-description"
            error={errors.description?.message}
            hint="Opcional"
          >
            <Textarea
              id="exam-description"
              placeholder="Unidades que entran, materiales permitidos…"
              className="min-h-20"
              invalid={Boolean(errors.description)}
              {...form.register('description')}
            />
          </Field>

          <div
            className={cn(
              'space-y-4 rounded-xl border p-3.5 transition',
              planEnabled ? 'border-purple/40 bg-purple/[0.06]' : 'border-line bg-sunken/40',
            )}
          >
            <Checkbox
              id="exam-plan"
              label="Armar un plan de estudio"
              description="Elegí cuándo empezar, cada cuántos días y cuánto tiempo. Las sesiones se ven en el calendario de la asignatura."
              {...form.register('plan_enabled')}
            />

            {planEnabled ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Empezar"
                    htmlFor="exam-plan-days"
                    error={errors.study_days_before?.message}
                    hint="Días antes"
                  >
                    <Input
                      id="exam-plan-days"
                      type="number"
                      inputMode="numeric"
                      min={daysBefore.min}
                      max={daysBefore.max}
                      invalid={Boolean(errors.study_days_before)}
                      {...form.register('study_days_before')}
                    />
                  </Field>
                  <Field
                    label="Frecuencia"
                    htmlFor="exam-plan-frequency"
                    error={errors.study_frequency_days?.message}
                    hint="Cada cuántos días"
                  >
                    <Input
                      id="exam-plan-frequency"
                      type="number"
                      inputMode="numeric"
                      min={frequencyDays.min}
                      max={frequencyDays.max}
                      invalid={Boolean(errors.study_frequency_days)}
                      {...form.register('study_frequency_days')}
                    />
                  </Field>
                  <Field
                    label="Duración de cada sesión"
                    htmlFor="exam-plan-minutes"
                    error={errors.study_session_minutes?.message}
                    hint="Minutos"
                  >
                    <Input
                      id="exam-plan-minutes"
                      type="number"
                      inputMode="numeric"
                      min={sessionMinutes.min}
                      max={sessionMinutes.max}
                      invalid={Boolean(errors.study_session_minutes)}
                      {...form.register('study_session_minutes')}
                    />
                  </Field>
                  <Field
                    label="Hora preferida"
                    htmlFor="exam-plan-time"
                    error={errors.study_time?.message}
                  >
                    <Input
                      id="exam-plan-time"
                      type="time"
                      invalid={Boolean(errors.study_time)}
                      {...form.register('study_time')}
                    />
                  </Field>
                </div>

                <StudyPlanPreview preview={preview} timeZone={timeZone} isEditing={isEditing} />
              </>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={saveExam.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={saveExam.isPending}>
              {isEditing ? 'Guardar cambios' : 'Crear examen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StudyPlanPreview({
  preview,
  timeZone,
  isEditing,
}: {
  preview: {
    plan: ReturnType<typeof formValuesToStudyPlan>
    sessions: ReturnType<typeof generateStudySessions>
    conflicts: TimeBlock[]
    examPassed: boolean
  } | null
  timeZone: string
  isEditing: boolean
}) {
  if (!preview || !preview.plan) {
    return (
      <p className="text-xs text-ink-muted" aria-live="polite">
        Completá la fecha del examen y los datos del plan para ver las sesiones.
      </p>
    )
  }

  const { plan, sessions, conflicts, examPassed } = preview
  const first = sessions[0]
  const last = sessions[sessions.length - 1]

  return (
    <div className="space-y-2" aria-live="polite">
      {sessions.length > 0 ? (
        <div className="flex gap-2.5 rounded-lg border border-line bg-shell/70 p-3 text-xs leading-5">
          <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#d8b4fe]" aria-hidden="true" />
          <div className="text-ink-secondary">
            <p className="font-semibold text-ink">
              Se van a programar {sessionsLabel(sessions.length)}.
            </p>
            <p>{describeStudyPlan(plan)}.</p>
            <p className="text-ink-muted">
              {sessions.length === 1
                ? `Única: ${formatDayAndTime(first.scheduled_at, timeZone)}.`
                : `Primera: ${formatDayAndTime(first.scheduled_at, timeZone)}. Última: ${formatDayAndTime(last.scheduled_at, timeZone)}.`}
            </p>
            {isEditing ? (
              <p className="text-ink-muted">
                Las sesiones que ya completaste o salteaste se conservan.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <Alert variant="warning">
          {examPassed
            ? 'La fecha del examen ya pasó: no se programan sesiones.'
            : 'Con estos datos no entra ninguna sesión antes del examen. Probá empezar antes o elegir otra hora.'}
        </Alert>
      )}

      {conflicts.length > 0 ? (
        <div className="flex gap-2 rounded-lg border border-warning/25 bg-warning/10 p-3 text-xs leading-5 text-[#ffe1a3]">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Algunas sesiones se superponen con:{' '}
            {conflicts
              .slice(0, 3)
              .map((block) => block.label)
              .join(', ')}
            {conflicts.length > 3 ? ` y ${conflicts.length - 3} más` : ''}. Podés cambiar la hora
            preferida.
          </p>
        </div>
      ) : null}
    </div>
  )
}
