import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/Spinner'
import { useAuth } from './auth-provider'

function ProfileErrorScreen({
  message,
  onRetry,
  onSignOut,
}: {
  message: string
  onRetry: () => void
  onSignOut: () => void
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md space-y-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-danger/25 bg-danger/10 text-danger">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-ink">No pudimos cargar tu perfil</h1>
            <p className="text-sm text-ink-muted">La sesión existe, pero faltan datos.</p>
          </div>
        </div>
        <Alert variant="error">{message}</Alert>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={onRetry} className="flex-1">
            Volver a intentar
          </Button>
          <Button variant="secondary" onClick={onSignOut} className="flex-1">
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isConfigured, isLoading, session, profile, profileError, refreshProfile, signOut } =
    useAuth()
  const location = useLocation()

  if (!isConfigured) {
    return <Navigate to="/configuracion-inicial" replace />
  }

  if (isLoading) {
    return <LoadingScreen label="Cargando tu cuenta…" />
  }

  if (!session) {
    return (
      <Navigate
        to="/ingresar"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (profileError) {
    return (
      <ProfileErrorScreen
        message={profileError}
        onRetry={() => {
          void refreshProfile()
        }}
        onSignOut={() => {
          void signOut()
        }}
      />
    )
  }

  if (!profile) {
    return <LoadingScreen label="Cargando tu perfil…" />
  }

  return <>{children}</>
}

export function RequireOnboarded({ children }: { children: ReactNode }) {
  const { profile } = useAuth()

  if (!profile) {
    return <LoadingScreen label="Cargando tu perfil…" />
  }

  if (!profile.onboarded_at) {
    return <Navigate to="/bienvenida" replace />
  }

  return <>{children}</>
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { isLoading, session, profile } = useAuth()

  if (isLoading) {
    return <LoadingScreen label="Cargando tu cuenta…" />
  }

  if (session) {
    return <Navigate to={profile?.onboarded_at ? '/inicio' : '/bienvenida'} replace />
  }

  return <>{children}</>
}
