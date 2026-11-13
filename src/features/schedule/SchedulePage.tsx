import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, Clock3, Plus, RotateCcw } from 'lucide-react'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Spinner } from '@/components/ui/Spinner'
import { useActiveYearScope, useProfileTimeZone } from '@/features/calendar/use-agenda'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/cn'
import { getErrorMessage } from '@/lib/errors'
import type { ScheduleEntry } from '@/types/database'
import { DayAgenda } from './DayAgenda'
import { ScheduleEntryDialog, type ScheduleDialogDefaults } from './ScheduleEntryDialog'
import { WeekGrid } from './WeekGrid'
import { useScheduleEntries } from './schedule-hooks'
import { WEEKDAYS, WEEKDAY_NAMES, WEEKDAY_SHORT, zonedWeekdayAndTime } from './schedule-utils'

type ViewMode = 'week' | 'day'

function initialMode(): ViewMode {
  if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches) {
    return 'day'
  }

  return 'week'
}

type DialogState =
  { open: false } | { open: true; entry: ScheduleEntry | null; defaults?: ScheduleDialogDefaults }

/** Horario semanal: clases, descansos y actividades del año activo. */
export function SchedulePage() {
  const timeZone = useProfileTimeZone()
  const now = useNow()
  const scope = useActiveYearScope()
  const scheduleQuery = useScheduleEntries(scope.userId, scope.activeYear?.id)
  const entries = scheduleQuery.data ?? []
  const subjectsById = new Map(scope.subjects.map((subject) => [subject.id, subject]))
  const today = zonedWeekdayAndTime(now, timeZone)
  const [mode, setMode] = useState<ViewMode>(initialMode)
  const [selectedDay, setSelectedDay] = useState(today.weekday)
  const [dialog, setDialog] = useState<DialogState>({ open: false })

  if (scope.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }

  if (!scope.activeYear || !scope.userId) {
    return (
      <EmptyState
        icon={<CalendarRange className="h-5 w-5" />}
        title="Primero configurá tu año de curso"
        description="El horario pertenece al año activo: se repite todas las semanas hasta que cambies de año."
        action={
          <Link to="/configuracion?nuevo=anio" className={buttonStyles({ size: 'md' })}>
            Crear año de curso
          </Link>
        }
      />
    )
  }

  const openNew = (defaults?: ScheduleDialogDefaults) =>
    setDialog({ open: true, entry: null, defaults })
  const openEntry = (entry: ScheduleEntry) => setDialog({ open: true, entry })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={scope.activeYear.name}
        title="Horario semanal"
        description="Tus clases, descansos y actividades. Tocá un hueco de la grilla para agregar un bloque a esa hora."
        actions={
          <>
            <SegmentedControl
              label="Vista del horario"
              value={mode}
              onChange={setMode}
              size="sm"
              options={[
                { value: 'week', label: 'Semana' },
                { value: 'day', label: 'Día' },
              ]}
            />
            <Button
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => openNew(mode === 'day' ? { weekday: selectedDay } : undefined)}
            >
              Nuevo bloque
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0">
          <CardContent className="p-3 pt-4 sm:p-5">
            {scheduleQuery.isError ? (
              <div className="flex flex-col items-center px-4 py-16 text-center">
                <p className="text-base font-bold text-ink">No pudimos cargar el horario</p>
                <p className="mt-1 max-w-sm text-sm text-ink-muted">
                  {getErrorMessage(scheduleQuery.error, 'Revisá tu conexión e intentá de nuevo.')}
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => void scheduleQuery.refetch()}
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                >
                  Reintentar
                </Button>
              </div>
            ) : scheduleQuery.isLoading ? (
              <div className="flex justify-center py-20">
                <Spinner className="h-6 w-6" />
              </div>
            ) : mode === 'week' ? (
              <>
                {entries.length === 0 ? (
                  <div className="mb-4 flex flex-col gap-3 rounded-xl border border-dashed border-line-strong/70 bg-sunken/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <Clock3
                        className="mt-0.5 h-5 w-5 shrink-0 text-rose-bright"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-sm font-semibold text-ink">Tu semana está vacía</p>
                        <p className="text-xs leading-5 text-ink-muted">
                          Agregá tus clases: podés cargar la misma materia en varios días de una
                          vez.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openNew()}
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                    >
                      Agregar clase
                    </Button>
                  </div>
                ) : null}
                <WeekGrid
                  entries={entries}
                  subjectsById={subjectsById}
                  today={today}
                  onOpen={openEntry}
                  onCreateAt={(weekday, startsAt) => openNew({ weekday, startsAt })}
                />
              </>
            ) : (
              <div className="space-y-4">
                <div
                  className="scrollbar-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
                  role="tablist"
                  aria-label="Día"
                >
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      role="tab"
                      aria-selected={day === selectedDay}
                      aria-label={`${WEEKDAY_NAMES[day]}${day === today.weekday ? ' (hoy)' : ''}`}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        'flex h-14 min-w-12 flex-1 flex-col items-center justify-center rounded-xl border text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60',
                        day === selectedDay
                          ? 'border-rose/50 bg-rose/15 text-rose-soft'
                          : 'border-line bg-sunken text-ink-muted hover:text-ink-secondary',
                      )}
                    >
                      {WEEKDAY_SHORT[day]}
                      <span
                        className={cn(
                          'mt-1 h-1 w-1 rounded-full',
                          day === today.weekday ? 'bg-rose-bright' : 'bg-transparent',
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
                <h2 className="text-base font-bold text-ink">
                  {WEEKDAY_NAMES[selectedDay]}
                  {selectedDay === today.weekday ? (
                    <span className="ml-2 text-xs font-semibold text-rose-bright">Hoy</span>
                  ) : null}
                </h2>
                <DayAgenda
                  entries={entries}
                  subjectsById={subjectsById}
                  weekday={selectedDay}
                  currentTime={selectedDay === today.weekday ? today.time : undefined}
                  onOpen={openEntry}
                  emptyMessage={`No hay bloques el ${WEEKDAY_NAMES[selectedDay].toLowerCase()}.`}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hoy · {WEEKDAY_NAMES[today.weekday]}</CardTitle>
            </CardHeader>
            <CardContent>
              <DayAgenda
                entries={entries}
                subjectsById={subjectsById}
                weekday={today.weekday}
                currentTime={today.time}
                onOpen={openEntry}
                emptyMessage="Hoy no tenés nada en el horario."
              />
            </CardContent>
          </Card>
          <div className="rounded-xl border border-line bg-sunken/40 p-4 text-[11px] leading-5 text-ink-muted">
            <p className="mb-1 font-semibold text-ink-secondary">Colores</p>
            Las clases usan el color de su materia. Los descansos se ven con borde punteado y las
            actividades sin materia, en violeta.
          </div>
        </aside>
      </div>

      <ScheduleEntryDialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDialog({ open: false })
          }
        }}
        userId={scope.userId}
        yearId={scope.activeYear.id}
        entry={dialog.open ? dialog.entry : null}
        entries={entries}
        subjects={scope.subjects}
        defaults={dialog.open ? dialog.defaults : undefined}
      />
    </div>
  )
}
