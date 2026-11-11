import { useState } from 'react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Mail, MailCheck } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { getErrorMessage } from '@/lib/errors'
import { sendPasswordResetEmail } from './auth-service'
import { forgotPasswordSchema, type ForgotPasswordInput } from './auth-schemas'
import { AuthPageHeader } from './AuthPageHeader'

export function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: ForgotPasswordInput) {
    setError(null)

    try {
      await sendPasswordResetEmail(values.email)
      setSentTo(values.email)
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
          'No pudimos enviar el correo de recuperación. Intentá de nuevo.',
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
            Si existe una cuenta asociada a{' '}
            <span className="font-semibold text-ink-secondary">{sentTo}</span>, vas a recibir un
            enlace para restablecer la contraseña.
          </p>
          <Alert variant="info" className="mt-5 text-left">
            Por seguridad, no confirmamos si el correo está registrado. Revisá también la carpeta de
            spam.
          </Alert>
          <Button className="mt-5 w-full" onClick={() => setSentTo(null)} variant="secondary">
            Probar con otro correo
          </Button>
          <Link
            to="/ingresar"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-bright transition hover:text-rose-soft"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a ingresar
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthPageHeader
        eyebrow="Recuperar acceso"
        title="¿Olvidaste tu contraseña?"
        description="Poné tu correo y te enviamos un enlace para crear una nueva."
      />

      {error ? (
        <Alert variant="error" className="mb-5">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Enviar enlace
        </Button>
      </form>

      <Link
        to="/ingresar"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-rose-bright transition hover:text-rose-soft"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a ingresar
      </Link>
    </AuthLayout>
  )
}
