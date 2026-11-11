import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/Spinner'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { useAuth } from './auth-provider'

export function AuthCallbackPage() {
  const { isLoading, session, profile, profileError } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && session && profile) {
      navigate(profile.onboarded_at ? '/inicio' : '/bienvenida', { replace: true })
    }
  }, [isLoading, navigate, profile, session])

  if (isLoading || (session && !profile && !profileError)) {
    return <LoadingScreen label="Confirmando tu cuenta…" />
  }

  if (profileError) {
    return (
      <AuthLayout>
        <div className="rounded-2xl border border-line bg-shell p-6 text-center sm:p-8">
          <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-danger/25 bg-danger/10 text-danger">
            <AlertCircle className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            No pudimos preparar tu perfil
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">{profileError}</p>
          <Button className="mt-5 w-full" onClick={() => navigate('/ingresar')}>
            Volver a ingresar
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="rounded-2xl border border-line bg-shell p-6 text-center sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">No pudimos confirmar</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          El enlace caducó, ya se usó o se abrió en otro navegador. Probá ingresar con tu correo y
          contraseña.
        </p>
        <Alert variant="info" className="mt-5 text-left">
          Si el problema continúa, volvé a registrarte con otro correo o solicitá ayuda.
        </Alert>
        <Button className="mt-5 w-full" onClick={() => navigate('/ingresar')}>
          Ir a ingresar
        </Button>
        <Link
          to="/crear-cuenta"
          className="mt-4 inline-block text-xs font-semibold text-rose-bright transition hover:text-rose-soft"
        >
          Crear una cuenta nueva
        </Link>
      </div>
    </AuthLayout>
  )
}
