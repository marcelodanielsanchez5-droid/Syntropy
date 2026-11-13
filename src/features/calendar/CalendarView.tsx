import { useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import timeGridPlugin from '@fullcalendar/timegrid'
import esLocale from '@fullcalendar/core/locales/es'
import type { EventContentArg, EventInput } from '@fullcalendar/core'
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  TriangleAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { withAlpha } from '@/lib/colors'
import { cn } from '@/lib/cn'
import { shiftDateKey, toWallTime } from '@/lib/datetime'
import type { CalendarEvent, CalendarEventMeta, CalendarItemRef } from './calendar-events'

export type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'listWeek'

const VIEW_OPTIONS: Array<{ value: CalendarViewType; label: string }> = [
  { value: 'dayGridMonth', label: 'Mes' },
  { value: 'timeGridWeek', label: 'Semana' },
  { value: 'listWeek', label: 'Agenda' },
]

const PLUGINS = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]

/** En el celular arranca en Agenda; en pantallas grandes, en Mes. */
function initialView(): CalendarViewType {
  if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches) {
    return 'listWeek'
  }

  return 'dayGridMonth'
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * En la Agenda, una tarea con días pintados se mostraría todos los días hasta
 * la entrega: ahí solo aparece el día en que vence.
 */
function collapseRangeForList(event: CalendarEvent): CalendarEvent {
  if (event.extendedProps.kind !== 'task-range') {
    return event
  }

  return {
    ...event,
    start: shiftDateKey(event.end, -1),
    extendedProps: { ...event.extendedProps, kind: 'task' },
  }
}

function toEventInput(event: CalendarEvent): EventInput {
  const { color, kind, done } = event.extendedProps
  const base = { ...event, classNames: [`syntropy-event`, `syntropy-event--${kind}`] }

  if (kind === 'task-range') {
    return {
      ...base,
      backgroundColor: withAlpha(color, 0.24),
      borderColor: withAlpha(color, 0.55),
      textColor: '#FFFFFF',
    }
  }

  if (kind === 'session') {
    return {
      ...base,
      backgroundColor: withAlpha(color, done ? 0.06 : 0.12),
      borderColor: withAlpha(color, 0.7),
      textColor: '#FFFFFF',
    }
  }

  return {
    ...base,
    backgroundColor: withAlpha(color, done ? 0.08 : 0.18),
    borderColor: color,
    textColor: '#FFFFFF',
  }
}

function EventContent({ arg }: { arg: EventContentArg }) {
  const meta = arg.event.extendedProps as CalendarEventMeta
  const isList = arg.view.type.startsWith('list')
  const time = meta.kind === 'exam' || meta.kind === 'session' ? arg.timeText : meta.timeLabel

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-1 overflow-hidden text-[11px] leading-4',
        isList && 'text-sm leading-5',
        meta.done && 'opacity-60',
      )}
    >
      {meta.kind === 'exam' ? (
        <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : null}
      {meta.kind === 'session' ? (
        <span className="shrink-0 rounded bg-white/10 px-1 text-[9px] font-bold uppercase tracking-wide">
          <BookOpenCheck className="mr-0.5 inline h-2.5 w-2.5 align-[-1px]" aria-hidden="true" />
          Estudio
        </span>
      ) : null}
      {meta.overdue ? (
        <TriangleAlert className="h-3 w-3 shrink-0 text-danger" aria-hidden="true" />
      ) : null}
      {time && !isList ? <span className="shrink-0 font-semibold tabular-nums">{time}</span> : null}
      <span className={cn('truncate font-medium', meta.done && 'line-through')}>
        {arg.event.title}
      </span>
      {isList ? (
        <span className="ml-auto hidden shrink-0 text-xs text-ink-muted sm:inline">
          {meta.subjectName} · {meta.stateLabel}
        </span>
      ) : null}
    </div>
  )
}

interface CalendarViewProps {
  events: CalendarEvent[]
  timeZone: string
  now: Date
  onSelectItem: (ref: CalendarItemRef) => void
  onSelectDate: (dateKey: string) => void
}

export function CalendarView({
  events,
  timeZone,
  now,
  onSelectItem,
  onSelectDate,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null)
  const [startView] = useState<CalendarViewType>(initialView)
  const [view, setView] = useState<CalendarViewType>(startView)
  const [title, setTitle] = useState('')

  const eventInputs = useMemo(
    () =>
      events
        .map((event) => (view === 'listWeek' ? collapseRangeForList(event) : event))
        .map(toEventInput),
    [events, view],
  )

  // «Hoy» se calcula en la zona horaria del perfil, no en la del dispositivo.
  const nowWallTime = toWallTime(now, timeZone)

  function api() {
    return calendarRef.current?.getApi()
  }

  function changeView(next: CalendarViewType) {
    setView(next)
    api()?.changeView(next)
  }

  return (
    <div className="syntropy-calendar">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9"
              onClick={() => api()?.prev()}
              aria-label="Período anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9"
              onClick={() => api()?.next()}
              aria-label="Período siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="secondary" size="sm" onClick={() => api()?.today()}>
            Hoy
          </Button>
          <h2 className="ml-1 truncate text-lg font-bold text-ink" aria-live="polite">
            {title}
          </h2>
        </div>
        <SegmentedControl
          label="Vista del calendario"
          value={view}
          onChange={changeView}
          options={VIEW_OPTIONS}
          size="sm"
          className="self-start sm:self-auto"
        />
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={PLUGINS}
        initialView={startView}
        headerToolbar={false}
        locale={esLocale}
        firstDay={1}
        now={nowWallTime}
        events={eventInputs}
        height={view === 'timeGridWeek' ? 680 : 'auto'}
        dayMaxEvents={3}
        moreLinkContent={(arg) => `+${arg.num} más`}
        eventDisplay="block"
        displayEventTime={false}
        nowIndicator
        scrollTime="07:00:00"
        allDayText="Día"
        noEventsContent="No hay nada cargado en este período."
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventContent={(arg) => <EventContent arg={arg} />}
        eventDidMount={(info) => {
          const meta = info.event.extendedProps as CalendarEventMeta
          info.el.setAttribute('title', meta.description)
          info.el.setAttribute('aria-label', meta.description)
        }}
        eventClick={(info) => {
          info.jsEvent.preventDefault()
          onSelectItem((info.event.extendedProps as CalendarEventMeta).ref)
        }}
        dateClick={(info) => onSelectDate(info.dateStr.slice(0, 10))}
        datesSet={(arg) => {
          setTitle(capitalize(arg.view.title))
          setView(arg.view.type as CalendarViewType)
        }}
      />
    </div>
  )
}
