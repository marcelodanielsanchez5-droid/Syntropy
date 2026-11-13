import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CalendarCheck } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { UpcomingList } from '@/features/calendar/UpcomingList'
import { getUpcomingItems } from '@/features/calendar/upcoming'
import { useActiveYearAgenda, useProfileTimeZone } from '@/features/calendar/use-agenda'
import { useClickOutside } from '@/hooks/use-click-outside'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'

/**
 * Campana: próximos vencimientos calculados con las tareas y exámenes (D6).
 * No guarda notificaciones; muestra lo que vence en los próximos 7 días y lo atrasado.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useClickOutside<HTMLDivElement>(close, open)
  const timeZone = useProfileTimeZone()
  const now = useNow()
  const agenda = useActiveYearAgenda()

  const items = useMemo(
    () =>
      getUpcomingItems({
        tasks: agenda.tasks,
        exams: agenda.exams,
        subjectsById: agenda.subjectsById,
        timeZone,
        now,
        withinDays: 7,
      }),
    [agenda.tasks, agenda.exams, agenda.subjectsById, timeZone, now],
  )
  const overdue = items.filter((item) => item.overdue).length
  const count = items.length
  const label =
    count === 0
      ? 'Próximos vencimientos: no hay nada en los próximos 7 días'
      : `Próximos vencimientos: ${count} en los próximos 7 días${overdue ? `, ${overdue} atrasada${overdue === 1 ? '' : 's'}` : ''}`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-ink-secondary transition hover:border-line hover:bg-white/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/40',
          open && 'border-line bg-white/5 text-ink',
        )}
        aria-label={label}
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" />
        {count > 0 ? (
          <span
            className={cn(
              'absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ring-2 ring-shell',
              overdue > 0 ? 'bg-danger text-[#2b0a12]' : 'bg-rose',
            )}
            aria-hidden="true"
          >
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(24rem,calc(100vw-2rem))] animate-slide-up overflow-hidden rounded-2xl border border-line bg-shell shadow-2xl">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-bold text-ink">Próximos vencimientos</p>
            <p className="text-xs text-ink-muted">
              Tareas y exámenes de los próximos 7 días{overdue ? ', y lo atrasado' : ''}
            </p>
          </div>

          {agenda.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : count > 0 ? (
            <UpcomingList
              items={items}
              timeZone={timeZone}
              onNavigate={close}
              className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2"
            />
          ) : (
            <div className="flex flex-col items-center px-6 py-9 text-center">
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-white/5 text-success">
                <CalendarCheck className="h-5 w-5" />
              </span>
              <p className="text-sm font-semibold text-ink-secondary">Nada vence esta semana</p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-ink-muted">
                Cuando cargues tareas y exámenes, los próximos 7 días van a aparecer acá.
              </p>
            </div>
          )}

          <div className="border-t border-line px-4 py-2.5 text-right">
            <Link
              to="/calendario"
              onClick={close}
              className="text-xs font-semibold text-rose-bright hover:text-rose-soft"
            >
              Ver calendario
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
