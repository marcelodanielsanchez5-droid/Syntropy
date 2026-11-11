import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowRight, Mail } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { getErrorMessage } from '@/lib/errors'
import { useAuth } from './auth-provider'
import { loginSchema, type LoginInput } from './auth-schemas'
import { AuthPageHeader } from './AuthPageHeader'
import { PasswordInput } from './PasswordInput'

export function LoginPage() {
  const { signIn, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const resetOk = new URLSearchParams(location.search).get('restablecida') === '1'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginInput) {
    setError(null)

    try {
      await signIn(values.email, values.password)
      const state = location.state as { from?: string } | null
      navigate(state?.from ?? '/inicio', { replace: true })
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
          'No pudimos iniciar sesión. Revisá tus datos e intentá de nuevo.',
        ),
      )
    }
  }

  return (
    <AuthLayout>
      <AuthPageHeader
        eyebrow="Bienvenido de nuevo"
        title="Ingresá a tu espacio"
        description="Tu año académico, tus materias y tus próximos pasos, en un solo lugar."
      />

      {resetOk ? (
        <Alert variant="success" className="mb-5">
          Tu contraseña se actualizó. Ya podés ingresar con la nueva.
        </Alert>
      ) : null}

      {!isConfigured ? (
        <Alert variant="warning" title="Supabase no está configurado" className="mb-5">
          La interfaz está lista, pero falta conectar el proyecto. Podés revisar los pasos en{' '}
          <Link to="/configuracion-inicial" className="font-semibold underline">
            configuración inicial
          </Link>
          .
        </Alert>
      ) : null}

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

        <Field label="Contraseña" htmlFor="password" error={errors.password?.message} required>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            invalid={Boolean(errors.password)}
            {...register('password')}
          />
        </Field>

        <div className="flex justify-end">
          <Link
            to="/recuperar-contrasena"
            className="text-xs font-semibold text-rose-bright transition hover:text-rose-soft"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={isSubmitting}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Ingresar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        ¿Todavía no tenés cuenta?{' '}
        <Link
          to="/crear-cuenta"
          className="font-semibold text-rose-bright transition hover:text-rose-soft"
        >
          Crear una cuenta
        </Link>
      </p>
    </AuthLayout>
  )
}
