import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import type { ScheduleEntry, Subject } from '@/types/database'
import { ENTRY_TYPE_ICONS } from './ScheduleBlock'
import {
  ENTRY_TYPE_LABELS,
  dayStatuses,
  entriesForDay,
  entryColor,
  formatTimeRange,
  type DayStatus,
} from './schedule-utils'

interface DayAgendaProps {
  entries: ScheduleEntry[]
  subjectsById: Map<string, Subject>
  weekday: number
  /** Hora actual si el día mostrado es hoy: marca «Ahora» y «Sigue». */
  currentTime?: string
  onOpen?: (entry: ScheduleEntry) => void
  emptyMessage?: string
  className?: string
}

const STATUS_BADGES: Partial<Record<DayStatus, { label: string; variant: 'rose' | 'info' }>> = {
  now: { label: 'Ahora', variant: 'rose' },
  next: { label: 'Sigue', variant: 'info' },
}

/** Agenda de un día: lista de bloques en orden, con «Ahora» y «Sigue» si es hoy. */
export function DayAgenda({
  entries,
  subjectsById,
  weekday,
  currentTime,
  onOpen,
  emptyMessage = 'No hay bloques este día.',
  className,
}: DayAgendaProps) {
  const dayEntries = entriesForDay(entries, weekday)
  const statuses = currentTime ? dayStatuses(dayEntries, currentTime) : new Map<string, DayStatus>()

  if (dayEntries.length === 0) {
    return (
      <p
        className={cn(
          'rounded-xl border border-dashed border-line-strong/70 bg-sunken/40 px-4 py-6 text-center text-sm text-ink-muted',
          className,
        )}
      >
        {emptyMessage}
      </p>
    )
  }

  return (
    <ol className={cn('space-y-2', className)}>
      {dayEntries.map((entry) => {
        const subject = entry.subject_id ? subjectsById.get(entry.subject_id) : undefined
        const color = entryColor(entry, subject?.color_hex)
        const Icon = ENTRY_TYPE_ICONS[entry.entry_type]
        const status = statuses.get(entry.id)
        const badge = status ? STATUS_BADGES[status] : undefined
        const content = (
          <>
            <span className="w-12 shrink-0 pt-0.5 text-xs font-semibold tabular-nums text-ink-secondary">
              {formatTimeRange(entry).split('–')[0]}
            </span>
            <span
              className={cn(
                'w-1 shrink-0 self-stretch rounded-full',
                entry.entry_type === 'break' && 'opacity-50',
              )}
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="truncate text-sm font-semibold text-ink">{entry.title}</span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-ink-muted">
                {ENTRY_TYPE_LABELS[entry.entry_type]} · {formatTimeRange(entry)}
                {entry.location ? (
                  <>
                    {' · '}
                    <MapPin className="inline h-3 w-3 align-[-2px]" aria-hidden="true" />{' '}
                    {entry.location}
                  </>
                ) : null}
              </span>
            </span>
            {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
          </>
        )
        const rowClass = cn(
          'flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left',
          status === 'now' ? 'border-rose/40 bg-rose/[0.08]' : 'border-line bg-surface/30',
          status === 'past' && 'opacity-55',
        )

        return (
          <li key={entry.id}>
            {onOpen ? (
              <button
                type="button"
                onClick={() => onOpen(entry)}
                className={cn(
                  rowClass,
                  'transition hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60',
                )}
              >
                {content}
              </button>
            ) : (
              <div className={rowClass}>{content}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
