import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
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
} from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/features/auth/auth-provider'
import { useActivateYear, useCreateYear, useUpdateYear } from './year-hooks'
import { academicYearSchema, type AcademicYearInput } from './year-schemas'
import type { AcademicYear } from '@/types/database'
import { getDefaultAcademicYear } from '@/lib/dates'
import { getErrorMessage } from '@/lib/errors'

interface YearDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  year?: AcademicYear | null
}

export function YearDialog({ open, onOpenChange, year }: YearDialogProps) {
  const { user } = useAuth()
  const createYear = useCreateYear(user?.id ?? '')
  const updateYear = useUpdateYear(user?.id ?? '')
  const activateYear = useActivateYear(user?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const defaults = getDefaultAcademicYear()

  const form = useForm<AcademicYearInput>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      name: defaults.name,
      starts_on: defaults.starts_on,
      ends_on: defaults.ends_on,
      activate: true,
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    setError(null)

    if (year) {
      form.reset({
        name: year.name,
        starts_on: year.starts_on,
        ends_on: year.ends_on,
        activate: year.is_active,
      })
    } else {
      const nextDefaults = getDefaultAcademicYear()
      form.reset({ ...nextDefaults, activate: true })
    }
  }, [form, open, year])

  const isEditing = Boolean(year)
  const loading = createYear.isPending || updateYear.isPending || activateYear.isPending

  async function onSubmit(values: AcademicYearInput) {
    setError(null)

    try {
      if (year) {
        await updateYear.mutateAsync({
          yearId: year.id,
          input: {
            name: values.name,
            starts_on: values.starts_on,
            ends_on: values.ends_on,
          },
        })
      } else {
        const created = await createYear.mutateAsync({
          name: values.name,
          starts_on: values.starts_on,
          ends_on: values.ends_on,
        })

        if (values.activate) {
          await activateYear.mutateAsync(created.id)
        }
      }

      onOpenChange(false)
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
          'No pudimos guardar el año de curso. Revisá los datos e intentá de nuevo.',
        ),
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar año de curso' : 'Nuevo año de curso'}</DialogTitle>
          <DialogDescription>
            Un año agrupa asignaturas y conserva el histórico. Solo puede haber uno activo a la vez.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field
            label="Nombre"
            htmlFor="year-name"
            error={form.formState.errors.name?.message}
            hint="Ej. 5.º año · 2026"
            required
          >
            <Input
              id="year-name"
              placeholder="5.º año · 2026"
              invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Inicio"
              htmlFor="year-starts"
              error={form.formState.errors.starts_on?.message}
              required
            >
              <Input
                id="year-starts"
                type="date"
                invalid={Boolean(form.formState.errors.starts_on)}
                {...form.register('starts_on')}
              />
            </Field>
            <Field
              label="Fin"
              htmlFor="year-ends"
              error={form.formState.errors.ends_on?.message}
              required
            >
              <Input
                id="year-ends"
                type="date"
                invalid={Boolean(form.formState.errors.ends_on)}
                {...form.register('ends_on')}
              />
            </Field>
          </div>

          {!isEditing ? (
            <Checkbox
              id="year-active"
              label="Marcar como año activo"
              description="Si no lo marcás, podés activarlo después desde la lista."
              {...form.register('activate')}
            />
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {isEditing ? 'Guardar cambios' : 'Crear año'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
