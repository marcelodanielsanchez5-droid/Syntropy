import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-rose-bright', className)} aria-hidden="true" />
}

export function LoadingScreen({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <img src="/brand/logo-mark.svg" alt="" className="h-14 w-14 animate-pulse-soft" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="text-xs text-ink-muted">Preparando tu espacio académico.</p>
        </div>
        <Spinner />
      </div>
    </div>
  )
}
