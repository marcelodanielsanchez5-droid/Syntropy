import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, FolderOpen, Save, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/features/auth/auth-provider'
import { useYears } from '@/features/academic-years/year-hooks'
import { getActiveYear } from '@/features/academic-years/year-service'
import { DEFAULT_SUBJECT_COLOR, withAlpha } from '@/lib/colors'
import { getErrorMessage, isUniqueViolation } from '@/lib/errors'
import { subjectFormSchema, type SubjectFormInput } from './subject-schemas'
import { useCreateSubject, useSubject, useUpdateSubject } from './subject-hooks'
import { emptySubjectFormValues, formatTeacherNames, subjectToFormValues } from './subject-utils'

function SubjectPreview({ values }: { values: SubjectFormInput }) {
  return (
    <Card className="overflow-hidden">
      <div
        className="h-2 w-full"
        style={{ backgroundColor: values.color_hex }}
        aria-hidden="true"
      />
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
            style={{
              borderColor: withAlpha(values.color_hex, 0.28),
              backgroundColor: withAlpha(values.color_hex, 0.14),
              color: values.color_hex,
            }}
          >
            <FolderOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-ink">
              {values.name.trim() || 'Nombre de la asignatura'}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink-muted">
              <Users className="h-3 w-3" />
              {formatTeacherNames(
                values.teachersText
                  .split(/[,;]+/)
                  .map((name) => name.trim())
                  .filter(Boolean),
              )}
            </p>
          </div>
        </div>
        <p className="mt-4 line-clamp-4 min-h-16 text-xs leading-5 text-ink-muted">
          {values.description.trim() || 'La descripción va a aparecer acá.'}
        </p>
        <div className="mt-4 flex items-center gap-2 border-t border-line/70 pt-3">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: values.color_hex }} />
          <span className="text-[11px] text-ink-disabled">Vista previa de la tarjeta</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function SubjectFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEditing = Boolean(id)
  const yearsQuery = useYears(user?.id)
  const subjectQuery = useSubject(user?.id, id)
  const createSubject = useCreateSubject(user?.id ?? '')
  const updateSubject = useUpdateSubject(user?.id ?? '', id ?? '')
  const [error, setError] = useState<string | null>(null)
  const activeYear = getActiveYear(yearsQuery.data)
  const subject = subjectQuery.data
  const targetYear = subject
    ? yearsQuery.data?.find((year) => year.id === subject.academic_year_id)
    : activeYear

  const form = useForm<SubjectFormInput>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: emptySubjectFormValues(DEFAULT_SUBJECT_COLOR),
  })
  const color = form.watch('color_hex')
  const values = form.watch()

  useEffect(() => {
    if (subject) {
      form.reset(subjectToFormValues(subject))
    }
  }, [form, subject])

  async function onSubmit(input: SubjectFormInput) {
    setError(null)

    try {
      if (isEditing && id) {
        await updateSubject.mutateAsync(input)
        toast.success('Asignatura actualizada.')
        navigate(`/asignaturas/${id}/informacion`)
        return
      }

      if (!activeYear) {
        setError('Primero necesitás un año de curso activo.')
        return
      }

      const created = await createSubject.mutateAsync({
        ...input,
        academic_year_id: activeYear.id,
      })
      toast.success('Asignatura creada.')
      navigate(`/asignaturas/${created.id}`)
    } catch (nextError) {
      if (
        isUniqueViolation(nextError, 'subjects_unique_name_per_year') ||
        getErrorMessage(nextError).toLowerCase().includes('duplicate')
      ) {
        setError('Ya existe una asignatura con ese nombre en este año de curso.')
      } else {
        setError(
          getErrorMessage(
            nextError,
            'No pudimos guardar la asignatura. Revisá los datos e intentá de nuevo.',
          ),
        )
      }
    }
  }

  if (isEditing && subjectQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }

  if (isEditing && subjectQuery.isError) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-5 w-5" />}
        title="No encontramos esa asignatura"
        description="Puede que se haya eliminado o que no pertenezca a tu cuenta."
        action={
          <Link to="/inicio" className={buttonStyles({ size: 'md' })}>
            Volver al inicio
          </Link>
        }
      />
    )
  }

  if (!isEditing && !activeYear) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Asignaturas"
          title="Nueva asignatura"
          description="Necesitás un año de curso activo para crear materias."
        />
        <EmptyState
          icon={<FolderOpen className="h-5 w-5" />}
          title="Primero configurá tu año"
          description="El año de curso agrupa las asignaturas. Creá uno y volvé para continuar."
          action={
            <Link to="/configuracion?nuevo=anio" className={buttonStyles({ size: 'md' })}>
              Crear año de curso
            </Link>
          }
        />
      </div>
    )
  }

  const loading = createSubject.isPending || updateSubject.isPending
  const backTo = id ? `/asignaturas/${id}/informacion` : '/inicio'

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isEditing ? 'Editar asignatura' : 'Nueva asignatura'}
        title={isEditing ? subject?.name ?? 'Editar asignatura' : 'Agregar una asignatura'}
        description={
          targetYear
            ? `Se guarda dentro de ${targetYear.name}.`
            : 'Completá los datos principales y elegí un color para identificarla.'
        }
        actions={
          <Link to={backTo} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos principales</CardTitle>
              <p className="text-sm text-ink-muted">
                El nombre y el color son obligatorios. Los docentes se separan con comas.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field
                label="Nombre"
                htmlFor="subject-name"
                error={form.formState.errors.name?.message}
                required
              >
                <Input
                  id="subject-name"
                  placeholder="Matemática"
                  invalid={Boolean(form.formState.errors.name)}
                  {...form.register('name')}
                />
              </Field>

              <div className="space-y-2">
                <p className="text-sm font-medium text-ink-secondary">
                  Color <span className="text-rose-bright">*</span>
                </p>
                <ColorPicker
                  value={color}
                  onChange={(nextColor) => form.setValue('color_hex', nextColor, { shouldDirty: true })}
                  error={form.formState.errors.color_hex?.message}
                />
              </div>

              <Field
                label="Docentes"
                htmlFor="subject-teachers"
                error={form.formState.errors.teachersText?.message}
                hint="Separados por comas"
              >
                <Input
                  id="subject-teachers"
                  placeholder="Prof. Ana Pérez, Prof. Luis Gómez"
                  invalid={Boolean(form.formState.errors.teachersText)}
                  {...form.register('teachersText')}
                />
              </Field>

              <Field
                label="Descripción"
                htmlFor="subject-description"
                error={form.formState.errors.description?.message}
                hint="Opcional"
              >
                <Textarea
                  id="subject-description"
                  placeholder="Qué vas a aprender, qué materiales usar, etc."
                  invalid={Boolean(form.formState.errors.description)}
                  {...form.register('description')}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información académica</CardTitle>
              <p className="text-sm text-ink-muted">
                Todo es opcional. Estos datos aparecen en la pestaña Información de la asignatura.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field
                label="Criterios de evaluación"
                htmlFor="subject-criteria"
                error={form.formState.errors.evaluationCriteria?.message}
                hint="Opcional"
              >
                <Textarea
                  id="subject-criteria"
                  placeholder="Parciales, trabajos prácticos, participación…"
                  invalid={Boolean(form.formState.errors.evaluationCriteria)}
                  {...form.register('evaluationCriteria')}
                />
              </Field>
              <Field
                label="Metodología"
                htmlFor="subject-methodology"
                error={form.formState.errors.methodology?.message}
                hint="Opcional"
              >
                <Textarea
                  id="subject-methodology"
                  placeholder="Clases teóricas, laboratorio, trabajos en grupo…"
                  invalid={Boolean(form.formState.errors.methodology)}
                  {...form.register('methodology')}
                />
              </Field>
              <Field
                label="Notas"
                htmlFor="subject-notes"
                error={form.formState.errors.notes?.message}
                hint="Opcional"
              >
                <Textarea
                  id="subject-notes"
                  placeholder="Horarios de consulta, enlaces, recordatorios…"
                  invalid={Boolean(form.formState.errors.notes)}
                  {...form.register('notes')}
                />
              </Field>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link to={backTo} className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
              Cancelar
            </Link>
            <Button type="submit" size="lg" loading={loading} leftIcon={<Save className="h-4 w-4" />}>
              {isEditing ? 'Guardar cambios' : 'Crear asignatura'}
            </Button>
          </div>
        </form>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <SubjectPreview values={values} />
          <div className="rounded-xl border border-line bg-sunken/40 p-4 text-[11px] leading-5 text-ink-muted">
            <p className="mb-1 font-semibold text-ink-secondary">Sobre el color</p>
            El color identifica la asignatura en tarjetas, eventos y nodos. No reemplaza los colores
            de estado (pendiente, en espera, terminada).
          </div>
        </aside>
      </div>
    </div>
  )
}
