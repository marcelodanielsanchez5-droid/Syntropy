import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { LoadingScreen } from '@/components/ui/Spinner'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { getErrorMessage } from '@/lib/errors'
import { useAuth } from './auth-provider'
import { updatePassword } from './auth-service'
import { resetPasswordSchema, type ResetPasswordInput } from './auth-schemas'
import { AuthPageHeader } from './AuthPageHeader'
import { PasswordInput } from './PasswordInput'

export function ResetPasswordPage() {
  const { session, isLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(values: ResetPasswordInput) {
    setError(null)

    try {
      await updatePassword(values.password)
      setDone(true)
      await signOut()
    } catch (nextError) {
      setError(
        getErrorMessage(nextError, 'No pudimos actualizar la contraseña. Solicitá un enlace nuevo.'),
      )
    }
  }

  if (isLoading) {
    return <LoadingScreen label="Verificando el enlace…" />
  }

  if (!session && !done) {
    return (
      <AuthLayout>
        <div className="rounded-2xl border border-line bg-shell p-6 text-center sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Enlace no válido</h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            El enlace de recuperación caducó o ya se usó. Solicitá uno nuevo para continuar.
          </p>
          <Button className="mt-5 w-full" onClick={() => navigate('/recuperar-contrasena')}>
            Solicitar otro enlace
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

  if (done) {
    return (
      <AuthLayout>
        <div className="rounded-2xl border border-line bg-shell p-6 text-center sm:p-8">
          <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-success/25 bg-success/10 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Contraseña actualizada
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Ya podés ingresar con tu nueva contraseña.
          </p>
          <Button
            className="mt-5 w-full"
            onClick={() => navigate('/ingresar?restablecida=1', { replace: true })}
          >
            Ir a ingresar
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthPageHeader
        eyebrow="Nueva contraseña"
        title="Creá una contraseña nueva"
        description="Usá al menos 8 caracteres, con mayúscula, minúscula y número."
      />

      {error ? (
        <Alert variant="error" className="mb-5">
          {error}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Nueva contraseña" htmlFor="password" error={errors.password?.message} required>
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

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Guardar contraseña
        </Button>
      </form>
    </AuthLayout>
  )
}
