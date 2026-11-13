import type { CSSProperties } from 'react'
import { BookOpen, Coffee, MapPin, Shapes, Sparkles, type LucideIcon } from 'lucide-react'
import { withAlpha } from '@/lib/colors'
import { cn } from '@/lib/cn'
import type { ScheduleEntry, ScheduleEntryType, Subject } from '@/types/database'
import { ENTRY_TYPE_LABELS, WEEKDAY_NAMES, entryColor, formatTimeRange } from './schedule-utils'

export const ENTRY_TYPE_ICONS: Record<ScheduleEntryType, LucideIcon> = {
  class: BookOpen,
  break: Coffee,
  activity: Sparkles,
  other: Shapes,
}

export function describeEntry(entry: ScheduleEntry, subject: Subject | undefined): string {
  return [
    `${ENTRY_TYPE_LABELS[entry.entry_type]}: ${entry.title}`,
    subject && subject.name !== entry.title ? subject.name : null,
    `${WEEKDAY_NAMES[entry.weekday]} ${formatTimeRange(entry)}`,
    entry.location,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Bloque dentro de la grilla semanal. El contenido se adapta al alto disponible. */
export function ScheduleBlock({
  entry,
  subject,
  compact,
  onOpen,
  style,
}: {
  entry: ScheduleEntry
  subject: Subject | undefined
  /** Bloques cortos: solo el nombre. */
  compact: boolean
  onOpen: (entry: ScheduleEntry) => void
  style: CSSProperties
}) {
  const color = entryColor(entry, subject?.color_hex)
  const Icon = ENTRY_TYPE_ICONS[entry.entry_type]
  const isBreak = entry.entry_type === 'break'

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onOpen(entry)
      }}
      title={describeEntry(entry, subject)}
      aria-label={describeEntry(entry, subject)}
      className={cn(
        'absolute overflow-hidden rounded-lg border border-l-[3px] px-1.5 py-1 text-left text-white transition hover:brightness-125 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright',
        isBreak && 'border-dashed',
      )}
      style={{
        ...style,
        backgroundColor: withAlpha(color, isBreak ? 0.1 : 0.22),
        borderColor: withAlpha(color, 0.55),
        borderLeftColor: color,
      }}
    >
      <span className="flex min-w-0 items-center gap-1 text-[11px] font-semibold leading-4">
        <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
        <span className="truncate">{entry.title}</span>
      </span>
      {!compact ? (
        <>
          <span className="block truncate text-[10px] leading-4 text-ink-secondary tabular-nums">
            {formatTimeRange(entry)}
          </span>
          {entry.location ? (
            <span className="flex min-w-0 items-center gap-0.5 text-[10px] leading-4 text-ink-muted">
              <MapPin className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{entry.location}</span>
            </span>
          ) : null}
        </>
      ) : null}
    </button>
  )
}
