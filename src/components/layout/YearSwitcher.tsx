import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, Check, ChevronDown, Plus, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth-provider'
import { getActiveYear } from '@/features/academic-years/year-service'
import { useActivateYear, useYears } from '@/features/academic-years/year-hooks'
import { useClickOutside } from '@/hooks/use-click-outside'
import { formatDateRange } from '@/lib/dates'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/cn'

export function YearSwitcher() {
  const { user } = useAuth()
  const { data: years, isLoading } = useYears(user?.id)
  const activateYear = useActivateYear(user?.id ?? '')
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useClickOutside<HTMLDivElement>(close, open)
  const activeYear = getActiveYear(years)

  async function handleActivate(yearId: string) {
    try {
      await activateYear.mutateAsync(yearId)
      setOpen(false)
      toast.success('Año activo actualizado.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'No pudimos activar ese año.'))
    }
  }

  return (
    <div ref={ref} className="relative px-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={isLoading}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-xl border border-line bg-sunken/80 px-3 py-2.5 text-left transition hover:border-line-strong hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/40',
          open && 'border-line-strong',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose/10 text-rose-bright">
          <CalendarRange className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-ink-disabled">
            Año de curso
          </span>
          <span className="block truncate text-sm font-semibold text-ink">
            {isLoading ? 'Cargando…' : activeYear?.name ?? 'Sin año activo'}
          </span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-ink-muted transition', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-3 right-3 top-[calc(100%+0.4rem)] z-50 animate-slide-up overflow-hidden rounded-xl border border-line bg-shell shadow-2xl"
        >
          <div className="max-h-64 overflow-y-auto p-1.5">
            {years && years.length > 0 ? (
              years.map((year) => (
                <button
                  key={year.id}
                  type="button"
                  role="option"
                  aria-selected={year.is_active}
                  onClick={() => {
                    void handleActivate(year.id)
                  }}
                  disabled={activateYear.isPending}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/5',
                    year.is_active && 'bg-rose/10',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      year.is_active
                        ? 'border-rose-bright bg-rose text-white'
                        : 'border-line-strong text-transparent',
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{year.name}</span>
                    <span className="block text-[11px] text-ink-muted">
                      {formatDateRange(year.starts_on, year.ends_on)}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-center text-xs leading-5 text-ink-muted">
                Todavía no creaste un año de curso.
              </p>
            )}
          </div>
          <div className="border-t border-line p-1.5">
            <Link
              to="/configuracion"
              onClick={close}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-ink-secondary transition hover:bg-white/5 hover:text-ink"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Gestionar años de curso
            </Link>
            <Link
              to="/configuracion?nuevo=anio"
              onClick={close}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-bright transition hover:bg-rose/10"
            >
              <Plus className="h-3.5 w-3.5" />
              Crear año de curso
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
