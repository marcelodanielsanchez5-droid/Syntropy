import { Link } from 'react-router-dom'
import { Clock3, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import type { ScheduleEntry } from '@/types/database'
import { WEEKDAY_NAMES, formatTimeRange, sortEntries } from './schedule-utils'

/** Horario semanal de una asignatura, para su pestaña Información. */
export function SubjectScheduleCard({
  entries,
  isLoading,
}: {
  entries: ScheduleEntry[]
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock3 className="h-4 w-4 text-rose-bright" aria-hidden="true" />
            Horario
          </CardTitle>
          <Link
            to="/horario"
            className="text-xs font-semibold text-rose-bright hover:text-rose-soft"
          >
            {entries.length > 0 ? 'Ver semana' : 'Agregar'}
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : entries.length > 0 ? (
          <ul className="space-y-1.5">
            {sortEntries(entries).map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-line/70 bg-sunken/30 px-3 py-2 text-xs"
              >
                <span className="font-semibold text-ink-secondary">
                  {WEEKDAY_NAMES[entry.weekday]}
                </span>
                <span className="flex min-w-0 items-center gap-2 text-ink-muted">
                  <span className="tabular-nums">{formatTimeRange(entry)}</span>
                  {entry.location ? (
                    <span className="flex min-w-0 items-center gap-0.5 truncate">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {entry.location}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-5 text-ink-muted">
            Todavía no cargaste los horarios de esta materia. Se agregan desde el horario semanal.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
