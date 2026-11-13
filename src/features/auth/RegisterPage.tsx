import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowRight, Mail, MailCheck, UserRound } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { detectTimezone } from '@/lib/dates'
import { getErrorMessage } from '@/lib/errors'
import { useAuth } from './auth-provider'
import { registerSchema, type RegisterInput } from './auth-schemas'
import { AuthPageHeader } from './AuthPageHeader'
import { PasswordInput } from './PasswordInput'

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      ageConfirmed: false,
      termsAccepted: false,
      privacyAccepted: false,
    },
  })

  async function onSubmit(values: RegisterInput) {
    setError(null)

    try {
      const data = await signUp({
        email: values.email,
        password: values.password,
        username: values.username,
        fullName: values.fullName ?? '',
        timezone: detectTimezone(),
      })

      if (data.session) {
        navigate('/bienvenida', { replace: true })
        return
      }

      setSentTo(values.email)
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
          'No pudimos crear la cuenta. Revisá los datos e intentá de nuevo.',
        ),
      )
    }
  }

  if (sentTo) {
    return (
      <AuthLayout>
        <div className="rounded-2xl border border-line bg-shell p-6 text-center sm:p-8">
          <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-success/25 bg-success/10 text-success">
            <MailCheck className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Revisá tu correo</h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Enviamos un enlace de confirmación a{' '}
            <span className="font-semibold text-ink-secondary">{sentTo}</span>. Abrilo para activar
            tu cuenta y después volvé a ingresar.
          </p>
          <Alert variant="info" className="mt-5 text-left">
            Si no lo encontrás, revisá la carpeta de spam. El enlace puede tardar un par de minutos.
          </Alert>
          <Button
            type="button"
            variant="secondary"
            className="mt-5 w-full"
            onClick={() => navigate('/ingresar', { replace: true })}
          >
            Volver a ingresar
          </Button>
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="mt-4 text-xs font-semibold text-rose-bright transition hover:text-rose-soft"
          >
            Usar otro correo
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthPageHeader
        eyebrow="Empezá hoy"
        title="Crear tu cuenta"
        description="Un espacio privado para organizar el año académico. Sin publicidad y sin ruido."
      />

      {error ? (
        <Alert variant="error" className="mb-5">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nombre completo"
            htmlFor="fullName"
            error={errors.fullName?.message}
            hint="Opcional"
          >
            <Input
              id="fullName"
              autoComplete="name"
              placeholder="Tu nombre"
              leftIcon={<UserRound className="h-4 w-4" />}
              invalid={Boolean(errors.fullName)}
              {...register('fullName')}
            />
          </Field>

          <Field
            label="Usuario"
            htmlFor="username"
            error={errors.username?.message}
            hint="3–30 caracteres"
            required
          >
            <Input
              id="username"
              autoComplete="username"
              placeholder="tu_usuario"
              leftIcon={<span className="text-sm font-semibold">@</span>}
              invalid={Boolean(errors.username)}
              {...register('username')}
            />
          </Field>
        </div>

        <Field label="Correo electrónico" htmlFor="email" error={errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nombre@correo.com"
            leftIcon={<Mail className="h-4 w-4" />}
            invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contraseña" htmlFor="password" error={errors.password?.message} required>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </Field>

          <Field
            label="Repetir contraseña"
            htmlFor="confirmPassword"
            error={errors.confirmPassword?.message}
            required
          >
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Repetí la contraseña"
              invalid={Boolean(errors.confirmPassword)}
              {...register('confirmPassword')}
            />
          </Field>
        </div>

        <div className="space-y-3 rounded-xl border border-line bg-sunken/50 p-4">
          <Checkbox
            id="ageConfirmed"
            label="Confirmo que tengo 13 años o más."
            error={errors.ageConfirmed?.message}
            {...register('ageConfirmed')}
          />
          <Checkbox
            id="termsAccepted"
            label="Acepto los términos de uso."
            description={
              <>
                Podés leer el{' '}
                <Link
                  to="/legal/terminos"
                  target="_blank"
                  className="font-semibold text-rose-bright underline-offset-2 hover:underline"
                >
                  términos de uso
                </Link>
                .
              </>
            }
            error={errors.termsAccepted?.message}
            {...register('termsAccepted')}
          />
          <Checkbox
            id="privacyAccepted"
            label="Acepto la política de privacidad."
            description={
              <>
                Podés leer la{' '}
                <Link
                  to="/legal/privacidad"
                  target="_blank"
                  className="font-semibold text-rose-bright underline-offset-2 hover:underline"
                >
                  política de privacidad
                </Link>
                .
              </>
            }
            error={errors.privacyAccepted?.message}
            {...register('privacyAccepted')}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={isSubmitting}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Crear cuenta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        ¿Ya tenés una cuenta?{' '}
        <Link
          to="/ingresar"
          className="font-semibold text-rose-bright transition hover:text-rose-soft"
        >
          Ingresar
        </Link>
      </p>
    </AuthLayout>
  )
}
