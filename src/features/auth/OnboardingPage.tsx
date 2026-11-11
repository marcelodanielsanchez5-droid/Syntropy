import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CalendarRange, Sparkles, UserRound } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { useAuth } from './auth-provider'
import { AuthPageHeader } from './AuthPageHeader'
import { profileSchema, type ProfileInput } from './auth-schemas'
import { academicYearSchema, type AcademicYearInput } from '@/features/academic-years/year-schemas'
import { useActivateYear, useCreateYear } from '@/features/academic-years/year-hooks'
import { detectTimezone, getDefaultAcademicYear, getTimezoneOptions } from '@/lib/dates'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/query-keys'

export function OnboardingPage() {
  const { profile, user, updateProfile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [profileData, setProfileData] = useState<ProfileInput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const createYearMutation = useCreateYear(user?.id ?? '')
  const activateYearMutation = useActivateYear(user?.id ?? '')
  const timezoneOptions = getTimezoneOptions(profile?.timezone ?? detectTimezone())
  const defaultYear = getDefaultAcademicYear()

  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.full_name ?? '',
      username: profile?.username ?? '',
      timezone: profile?.timezone ?? detectTimezone(),
    },
  })

  const yearForm = useForm<AcademicYearInput>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      name: defaultYear.name,
      starts_on: defaultYear.starts_on,
      ends_on: defaultYear.ends_on,
      activate: true,
    },
  })

  function handleProfileNext(values: ProfileInput) {
    setProfileData(values)
    setError(null)
    setStep(2)
  }

  async function finishOnboarding(yearValues: AcademicYearInput | null) {
    if (!user || !profileData) {
      return
    }

    setFinishing(true)
    setError(null)

    try {
      if (yearValues) {
        const createdYear = await createYearMutation.mutateAsync({
          name: yearValues.name,
          starts_on: yearValues.starts_on,
          ends_on: yearValues.ends_on,
        })

        if (yearValues.activate) {
          await activateYearMutation.mutateAsync(createdYear.id)
        }
      }

      await updateProfile({
        username: profileData.username,
        full_name: profileData.fullName || null,
        timezone: profileData.timezone,
        onboarded_at: new Date().toISOString(),
      })

      await queryClient.invalidateQueries({ queryKey: queryKeys.years(user.id) })
      navigate('/inicio', { replace: true })
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
          'No pudimos terminar la configuración. Revisá los datos e intentá de nuevo.',
        ),
      )
    } finally {
      setFinishing(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mb-6 flex items-center gap-2">
        <div className="h-1 flex-1 rounded-full bg-rose" />
        <div className={`h-1 flex-1 rounded-full ${step === 2 ? 'bg-rose' : 'bg-line'}`} />
      </div>

      <AuthPageHeader
        eyebrow={step === 1 ? 'Paso 1 de 2' : 'Paso 2 de 2'}
        title={step === 1 ? 'Vamos a conocerte' : 'Tu año de curso'}
        description={
          step === 1
            ? 'Revisá tus datos. El usuario es tu identidad dentro de Syntropy y la zona horaria se usa para mostrar fechas y recordatorios.'
            : 'Un año de curso agrupa tus asignaturas. Podés llamarlo “5.º año · 2026”, “Universidad 2026” o simplemente “2026”.'
        }
      />

      {error ? (
        <Alert variant="error" className="mb-5">
          {error}
        </Alert>
      ) : null}

      {step === 1 ? (
        <form onSubmit={profileForm.handleSubmit(handleProfileNext)} className="space-y-4" noValidate>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-sunken/60 p-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose/20 bg-rose/10 text-rose-bright">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Tu perfil</p>
              <p className="text-xs text-ink-muted">Podés cambiarlo después desde Configuración.</p>
            </div>
          </div>

          <Field
            label="Nombre completo"
            htmlFor="fullName"
            error={profileForm.formState.errors.fullName?.message}
            hint="Opcional"
          >
            <Input
              id="fullName"
              autoComplete="name"
              placeholder="Tu nombre"
              invalid={Boolean(profileForm.formState.errors.fullName)}
              {...profileForm.register('fullName')}
            />
          </Field>

          <Field
            label="Usuario"
            htmlFor="username"
            error={profileForm.formState.errors.username?.message}
            required
          >
            <Input
              id="username"
              autoComplete="username"
              placeholder="tu_usuario"
              leftIcon={<span className="text-sm font-semibold">@</span>}
              invalid={Boolean(profileForm.formState.errors.username)}
              {...profileForm.register('username')}
            />
          </Field>

          <Field
            label="Zona horaria"
            htmlFor="timezone"
            error={profileForm.formState.errors.timezone?.message}
            required
          >
            <Select
              id="timezone"
              invalid={Boolean(profileForm.formState.errors.timezone)}
              {...profileForm.register('timezone')}
            >
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone.replaceAll('_', ' ')}
                </option>
              ))}
            </Select>
          </Field>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Continuar
          </Button>
        </form>
      ) : (
        <form
          onSubmit={yearForm.handleSubmit((values) => {
            void finishOnboarding(values)
          })}
          className="space-y-4"
          noValidate
        >
          <div className="flex items-center gap-3 rounded-xl border border-line bg-sunken/60 p-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-purple/25 bg-purple/10 text-[#d8b4fe]">
              <CalendarRange className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Contexto académico</p>
              <p className="text-xs text-ink-muted">
                El año activo se muestra en toda la aplicación.
              </p>
            </div>
          </div>

          <Field
            label="Nombre del año"
            htmlFor="yearName"
            error={yearForm.formState.errors.name?.message}
            required
          >
            <Input
              id="yearName"
              placeholder="5.º año · 2026"
              invalid={Boolean(yearForm.formState.errors.name)}
              {...yearForm.register('name')}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Inicio"
              htmlFor="starts_on"
              error={yearForm.formState.errors.starts_on?.message}
              required
            >
              <Input
                id="starts_on"
                type="date"
                invalid={Boolean(yearForm.formState.errors.starts_on)}
                {...yearForm.register('starts_on')}
              />
            </Field>
            <Field
              label="Fin"
              htmlFor="ends_on"
              error={yearForm.formState.errors.ends_on?.message}
              required
            >
              <Input
                id="ends_on"
                type="date"
                invalid={Boolean(yearForm.formState.errors.ends_on)}
                {...yearForm.register('ends_on')}
              />
            </Field>
          </div>

          <Checkbox
            id="activate"
            label="Marcar como año activo"
            description="Es el año que vas a ver al iniciar sesión. Solo puede haber uno activo."
            {...yearForm.register('activate')}
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="sm:flex-1"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => setStep(1)}
              disabled={finishing}
            >
              Volver
            </Button>
            <Button
              type="submit"
              className="sm:flex-[1.4]"
              loading={finishing}
              rightIcon={<Sparkles className="h-4 w-4" />}
            >
              Terminar configuración
            </Button>
          </div>

          <button
            type="button"
            disabled={finishing}
            onClick={() => {
              void finishOnboarding(null)
            }}
            className="w-full text-center text-xs font-semibold text-ink-muted transition hover:text-ink-secondary disabled:opacity-50"
          >
            Configurar el año más tarde
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
