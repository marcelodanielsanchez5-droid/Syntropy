import { Link } from 'react-router-dom'
import { GraduationCap, ListTodo, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatShortDayAndTime } from '@/lib/datetime'
import type { UpcomingItem } from './upcoming'

interface UpcomingListProps {
  items: UpcomingItem[]
  timeZone: string
  onNavigate?: () => void
  className?: string
}

/** Lista compacta de vencimientos: la usan la campana y el panel «Hoy» del inicio. */
export function UpcomingList({ items, timeZone, onNavigate, className }: UpcomingListProps) {
  return (
    <ul className={cn('space-y-1', className)}>
      {items.map((item) => {
        const Icon = item.type === 'exam' ? GraduationCap : ListTodo

        return (
          <li key={item.key}>
            <Link
              to={`/asignaturas/${item.subjectId}/calendario`}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60"
            >
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${item.color}26`, color: item.color }}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                <span className="block truncate text-xs text-ink-muted">
                  {item.kindLabel} · {item.subjectName} · {formatShortDayAndTime(item.at, timeZone)}
                </span>
              </span>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 text-xs font-semibold',
                  item.overdue
                    ? 'text-danger'
                    : item.days <= 0
                      ? 'text-warning'
                      : 'text-ink-secondary',
                )}
              >
                {item.overdue ? <TriangleAlert className="h-3 w-3" aria-hidden="true" /> : null}
                {item.label}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
