import { cn } from '@/lib/cn'
import type { ScheduleEntry, Subject } from '@/types/database'
import { ScheduleBlock } from './ScheduleBlock'
import {
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  layoutDay,
  minutesToTime,
  timeToMinutes,
  visibleHourRange,
  visibleWeekdays,
} from './schedule-utils'

const HOUR_HEIGHT = 56 // px por hora
const MIN_BLOCK_HEIGHT = 22

interface WeekGridProps {
  entries: ScheduleEntry[]
  subjectsById: Map<string, Subject>
  /** Día y hora actuales en la zona del perfil, para marcar «ahora». */
  today: { weekday: number; time: string }
  onOpen: (entry: ScheduleEntry) => void
  onCreateAt: (weekday: number, startsAt: string) => void
}

/** Grilla semanal: una columna por día y bloques ubicados según su hora. */
export function WeekGrid({ entries, subjectsById, today, onOpen, onCreateAt }: WeekGridProps) {
  const days = visibleWeekdays(entries)
  const { startHour, endHour } = visibleHourRange(entries)
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index)
  const height = hours.length * HOUR_HEIGHT
  const nowMinutes = timeToMinutes(today.time)
  const nowOffset = ((nowMinutes - startHour * 60) / 60) * HOUR_HEIGHT
  const showNow = nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <div
        className="grid min-w-[640px]"
        style={{ gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div aria-hidden="true" />
        {days.map((day) => (
          <div
            key={day}
            className={cn(
              'border-b border-line px-1 pb-2 text-center text-[11px] font-bold uppercase tracking-[0.08em]',
              day === today.weekday ? 'text-rose-bright' : 'text-ink-muted',
            )}
          >
            <span className="hidden sm:inline">{WEEKDAY_NAMES[day]}</span>
            <span className="sm:hidden">{WEEKDAY_SHORT[day]}</span>
            {day === today.weekday ? <span className="sr-only"> (hoy)</span> : null}
          </div>
        ))}

        <div className="relative" style={{ height }} aria-hidden="true">
          {hours.map((hour, index) => (
            <span
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-ink-disabled"
              style={{ top: index * HOUR_HEIGHT }}
            >
              {index === 0 ? '' : minutesToTime(hour * 60)}
            </span>
          ))}
        </div>

        {days.map((day) => {
          const placed = layoutDay(entries.filter((entry) => entry.weekday === day))

          return (
            <div
              key={day}
              role="group"
              aria-label={`${WEEKDAY_NAMES[day]}: ${placed.length} bloque${placed.length === 1 ? '' : 's'}`}
              className={cn(
                'relative cursor-pointer border-l border-line',
                day === today.weekday && 'bg-rose/[0.035]',
              )}
              style={{
                height,
                backgroundImage: `repeating-linear-gradient(to bottom, var(--color-line) 0 1px, transparent 1px ${HOUR_HEIGHT}px)`,
              }}
              onClick={(event) => {
                // Un clic en un hueco crea un bloque a esa hora (redondeada a la media hora).
                const rect = event.currentTarget.getBoundingClientRect()
                const minutes = startHour * 60 + ((event.clientY - rect.top) / HOUR_HEIGHT) * 60
                const rounded = Math.min(Math.floor(minutes / 30) * 30, 23 * 60)
                onCreateAt(day, minutesToTime(rounded))
              }}
            >
              {placed.map(({ entry, lane, lanes }) => {
                const start = timeToMinutes(entry.starts_at)
                const end = timeToMinutes(entry.ends_at)
                const top = ((start - startHour * 60) / 60) * HOUR_HEIGHT
                const blockHeight = Math.max(((end - start) / 60) * HOUR_HEIGHT, MIN_BLOCK_HEIGHT)

                return (
                  <ScheduleBlock
                    key={entry.id}
                    entry={entry}
                    subject={entry.subject_id ? subjectsById.get(entry.subject_id) : undefined}
                    compact={blockHeight < 44}
                    onOpen={onOpen}
                    style={{
                      top: top + 1,
                      height: blockHeight - 2,
                      left: `calc(${(lane / lanes) * 100}% + 2px)`,
                      width: `calc(${100 / lanes}% - 4px)`,
                    }}
                  />
                )
              })}

              {day === today.weekday && showNow ? (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-rose-bright"
                  style={{ top: nowOffset }}
                  aria-hidden="true"
                >
                  <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-rose-bright" />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
