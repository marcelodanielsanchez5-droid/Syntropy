import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CalendarClock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useClickOutside } from '@/hooks/use-click-outside'
import { cn } from '@/lib/cn'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useClickOutside<HTMLDivElement>(close, open)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-ink-secondary transition hover:border-line hover:bg-white/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/40',
          open && 'border-line bg-white/5 text-ink',
        )}
        aria-label="Próximos vencimientos"
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] animate-slide-up overflow-hidden rounded-2xl border border-line bg-shell shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-bold text-ink">Próximos vencimientos</p>
              <p className="text-xs text-ink-muted">Tareas y exámenes de los próximos 7 días</p>
            </div>
            <Badge variant="purple">Fase 3</Badge>
          </div>
          <div className="flex flex-col items-center px-6 py-9 text-center">
            <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-white/5 text-ink-muted">
              <CalendarClock className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-ink-secondary">Todavía no hay vencimientos</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-ink-muted">
              Cuando agregues tareas y exámenes, van a aparecer acá. El calendario se habilita en la
              Fase 3.
            </p>
            <Link
              to="/calendario"
              onClick={close}
              className="mt-4 text-xs font-semibold text-rose-bright hover:text-rose-soft"
            >
              Ver calendario
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
