import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { getErrorMessage } from '@/lib/errors'
import { useUpdateGradingSettings } from './grade-hooks'
import { gradingSettingsToFormValues, toGradingSettingsPayload } from './grade-form'
import type { GradingRules } from './grade-math'
import { gradingSettingsSchema, type GradingSettingsFormInput } from './grade-schemas'

const PRESETS: Array<{
  label: string
  values: Omit<GradingSettingsFormInput, 'rounding_decimals'>
}> = [
  { label: '1 a 10 · aprueba 6', values: { scale_min: '1', scale_max: '10', passing_score: '6' } },
  { label: '1 a 10 · aprueba 4', values: { scale_min: '1', scale_max: '10', passing_score: '4' } },
  {
    label: '0 a 20 · aprueba 10',
    values: { scale_min: '0', scale_max: '20', passing_score: '10' },
  },
  {
    label: '0 a 100 · aprueba 60',
    values: { scale_min: '0', scale_max: '100', passing_score: '60' },
  },
]

interface GradingSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  rules: GradingRules
  hasAssessments: boolean
}

export function GradingSettingsDialog({
  open,
  onOpenChange,
  userId,
  rules,
  hasAssessments,
}: GradingSettingsDialogProps) {
  const updateSettings = useUpdateGradingSettings(userId)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<GradingSettingsFormInput>({
    resolver: zodResolver(gradingSettingsSchema),
    defaultValues: gradingSettingsToFormValues(rules),
  })
  const { errors } = form.formState

  useEffect(() => {
    if (open) {
      setError(null)
      form.reset(gradingSettingsToFormValues(rules))
    }
    // Solo al abrir.
  }, [open])

  async function onSubmit(values: GradingSettingsFormInput) {
    setError(null)

    try {
      await updateSettings.mutateAsync(toGradingSettingsPayload(values))
      toast.success('Escala guardada.')
      onOpenChange(false)
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'No pudimos guardar la escala.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Escala de calificaciones</DialogTitle>
          <DialogDescription>
            Cambia según el país y la institución. Se usa para las evaluaciones nuevas y para
            mostrar los promedios.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-ink-secondary">Escalas frecuentes</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    for (const [key, value] of Object.entries(preset.values)) {
                      form.setValue(key as keyof GradingSettingsFormInput, value as never, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  }}
                  className="rounded-full border border-line bg-white/5 px-3 py-1.5 text-xs font-semibold text-ink-secondary transition hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Mínima" htmlFor="grading-min" error={errors.scale_min?.message} required>
              <Input
                id="grading-min"
                inputMode="decimal"
                invalid={Boolean(errors.scale_min)}
                {...form.register('scale_min')}
              />
            </Field>
            <Field label="Máxima" htmlFor="grading-max" error={errors.scale_max?.message} required>
              <Input
                id="grading-max"
                inputMode="decimal"
                invalid={Boolean(errors.scale_max)}
                {...form.register('scale_max')}
              />
            </Field>
            <Field
              label="Aprueba con"
              htmlFor="grading-passing"
              error={errors.passing_score?.message}
              required
            >
              <Input
                id="grading-passing"
                inputMode="decimal"
                invalid={Boolean(errors.passing_score)}
                {...form.register('passing_score')}
              />
            </Field>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-ink-secondary">Decimales al mostrar promedios</p>
            <Controller
              control={form.control}
              name="rounding_decimals"
              render={({ field }) => (
                <SegmentedControl
                  label="Decimales"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: '0', label: '7' },
                    { value: '1', label: '7,4' },
                    { value: '2', label: '7,38' },
                  ]}
                />
              )}
            />
          </div>

          {hasAssessments ? (
            <Alert variant="info">
              Las notas que ya cargaste conservan su escala original. Los promedios se convierten a
              la escala nueva, sin reinterpretar las notas.
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={updateSettings.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={updateSettings.isPending}>
              Guardar escala
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
