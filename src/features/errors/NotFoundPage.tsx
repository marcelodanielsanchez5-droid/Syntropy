import { Link } from 'react-router-dom'
import { Compass, Home } from 'lucide-react'
import { buttonStyles } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-rose/20 bg-rose/10 text-rose-bright">
          <Compass className="h-8 w-8" />
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-bright">Error 404</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Esta página no existe</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          La ruta puede haber cambiado o el enlace estar incompleto. Volvé al inicio para seguir
          organizando tu año.
        </p>
        <Link to="/inicio" className={`${buttonStyles({ size: 'md' })} mt-6`}>
          <Home className="h-4 w-4" />
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
