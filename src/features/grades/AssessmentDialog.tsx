import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2 } from 'lucide-react'
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
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { NodeSelect } from '@/features/nodes/NodeSelect'
import { cn } from '@/lib/cn'
import { getErrorMessage } from '@/lib/errors'
import type { Assessment, Subject } from '@/types/database'
import { useAssessmentMutations } from './grade-hooks'
import {
  assessmentToFormValues,
  emptyAssessmentFormValues,
  toAssessmentPayload,
} from './grade-form'
import { formatPlain, rulesScale, type GradingRules } from './grade-math'
import { makeAssessmentSchema, type AssessmentFormInput } from './grade-schemas'

interface AssessmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  rules: GradingRules
  /** `null` para crear una evaluación nueva. */
  assessment: Assessment | null
  subjects: Subject[]
  lockedSubjectId?: string
}

export function AssessmentDialog({
  open,
  onOpenChange,
  userId,
  rules,
  assessment,
  subjects,
  lockedSubjectId,
}: AssessmentDialogProps) {
  const { create, update, remove } = useAssessmentMutations(userId)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isEditing = assessment !== null
  // Una evaluación existente conserva su escala; una nueva toma la actual.
  const scale = useMemo(
    () =>
      assessment
        ? { min: Number(assessment.scale_min), max: Number(assessment.scale_max) }
        : rulesScale(rules),
    [assessment, rules],
  )
  const schema = useMemo(() => makeAssessmentSchema(scale), [scale])

  const form = useForm<AssessmentFormInput>({
    resolver: zodResolver(schema),
    defaultValues: emptyAssessmentFormValues(),
  })
  const { errors } = form.formState
  const subjectId = form.watch('subject_id')

  useEffect(() => {
    if (!open) {
      return
    }

    setError(null)
    form.reset(
      assessment
        ? assessmentToFormValues(assessment)
        : emptyAssessmentFormValues(
            lockedSubjectId ?? (subjects.length === 1 ? subjects[0].id : ''),
          ),
    )
    // Solo al abrir.
  }, [open, assessment])

  const saving = create.isPending || update.isPending

  async function onSubmit(values: AssessmentFormInput) {
    setError(null)
    const payload = toAssessmentPayload(values)

    try {
      if (assessment) {
        await update.mutateAsync({ assessmentId: assessment.id, payload })
        toast.success('Evaluación actualizada.')
      } else {
        await create.mutateAsync({ payload, scale })
        toast.success('Evaluación agregada.')
      }

      onOpenChange(false)
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'No pudimos guardar la evaluación. Intentá de nuevo.'))
    }
  }

  async function handleDelete() {
    if (!assessment) {
      return
    }

    try {
      await remove.mutateAsync(assessment.id)
      setConfirmDelete(false)
      onOpenChange(false)
      toast.success('Evaluación eliminada.')
    } catch (nextError) {
      setConfirmDelete(false)
      setError(getErrorMessage(nextError, 'No pudimos eliminar la evaluación.'))
    }
  }

  const scaleText = `${formatPlain(scale.min)} a ${formatPlain(scale.max)}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-lg', mobileSheetClassName)}>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar evaluación' : 'Nueva evaluación'}</DialogTitle>
          <DialogDescription>
            Cargala aunque todavía no tengas la nota: así se calcula cuánto necesitás.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Nombre" htmlFor="assessment-title" error={errors.title?.message} required>
            <Input
              id="assessment-title"
              placeholder="Parcial 1"
              autoComplete="off"
              invalid={Boolean(errors.title)}
              {...form.register('title')}
            />
          </Field>

          {lockedSubjectId ? null : (
            <Field
              label="Asignatura"
              htmlFor="assessment-subject"
              error={errors.subject_id?.message}
              required
            >
              <Select
                id="assessment-subject"
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
            <Field
              label="Nota"
              htmlFor="assessment-score"
              error={errors.score?.message}
              hint={`De ${scaleText}`}
            >
              <Input
                id="assessment-score"
                inputMode="decimal"
                placeholder="Sin nota"
                invalid={Boolean(errors.score)}
                {...form.register('score')}
              />
            </Field>
            <Field label="Peso" htmlFor="assessment-weight" error={errors.weight?.message} required>
              <Input
                id="assessment-weight"
                inputMode="decimal"
                placeholder="30"
                invalid={Boolean(errors.weight)}
                {...form.register('weight')}
              />
            </Field>
            <Field
              label="Fecha"
              htmlFor="assessment-date"
              error={errors.assessed_on?.message}
              hint="Opcional"
            >
              <Input
                id="assessment-date"
                type="date"
                invalid={Boolean(errors.assessed_on)}
                {...form.register('assessed_on')}
              />
            </Field>
          </div>

          <p className="text-xs leading-5 text-ink-muted">
            El peso es relativo: podés usar porcentajes (30, 20, 50) o cualquier proporción. Dejá la
            nota vacía si la evaluación todavía no se rindió o no te la devolvieron.
            {isEditing ? ' Esta evaluación conserva la escala con la que se creó.' : ''}
          </p>

          <Field label="Tema" htmlFor="assessment-node" hint="Opcional · del mapa de nodos">
            <NodeSelect
              id="assessment-node"
              userId={userId}
              subjectId={subjectId}
              {...form.register('node_id')}
            />
          </Field>

          <Field
            label="Notas"
            htmlFor="assessment-notes"
            error={errors.notes?.message}
            hint="Opcional"
          >
            <Textarea
              id="assessment-notes"
              className="min-h-20"
              placeholder="Temas, devolución del docente…"
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
                {isEditing ? 'Guardar cambios' : 'Agregar evaluación'}
              </Button>
            </div>
          </DialogFooter>
        </form>

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Eliminar evaluación"
          description={`Se va a eliminar «${assessment?.title ?? ''}» y su nota. El promedio se recalcula sin ella.`}
          confirmLabel="Eliminar evaluación"
          onConfirm={() => void handleDelete()}
          loading={remove.isPending}
          destructive
        />
      </DialogContent>
    </Dialog>
  )
}
