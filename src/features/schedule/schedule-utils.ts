import { format } from 'date-fns'
import { toTimeInputValue, toZoned } from '@/lib/datetime'
import type { ScheduleEntry, ScheduleEntryType } from '@/types/database'

/** 1 = lunes … 7 = domingo, como en la base. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const

export const WEEKDAY_NAMES: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
}

export const WEEKDAY_SHORT: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
}

export const ENTRY_TYPES: ScheduleEntryType[] = ['class', 'break', 'activity', 'other']

export const ENTRY_TYPE_LABELS: Record<ScheduleEntryType, string> = {
  class: 'Clase',
  break: 'Descanso',
  activity: 'Actividad',
  other: 'Otro',
}

/**
 * Las clases usan el color de su asignatura. Descansos, actividades y otros
 * bloques tienen un color fijo por tipo: el modelo no guarda un color propio.
 */
export const ENTRY_TYPE_COLORS: Record<Exclude<ScheduleEntryType, 'class'>, string> = {
  break: '#7D8592',
  activity: '#9A15AF',
  other: '#22B8CF',
}

type EntryTimes = Pick<ScheduleEntry, 'weekday' | 'starts_at' | 'ends_at'>

/** Minutos desde la medianoche de una hora `HH:mm` o `HH:mm:ss`. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function formatTimeRange(entry: Pick<ScheduleEntry, 'starts_at' | 'ends_at'>): string {
  return `${toTimeInputValue(entry.starts_at)}–${toTimeInputValue(entry.ends_at)}`
}

/** Color del bloque: el de su asignatura si tiene una; si no, el de su tipo. */
export function entryColor(
  entry: Pick<ScheduleEntry, 'entry_type'>,
  subjectColor: string | undefined,
): string {
  if (subjectColor) {
    return subjectColor
  }

  return entry.entry_type === 'class' ? '#98A2B3' : ENTRY_TYPE_COLORS[entry.entry_type]
}

/** Día de la semana (1–7) y hora `HH:mm` de un instante en la zona del perfil. */
export function zonedWeekdayAndTime(
  now: Date,
  timeZone: string,
): { weekday: number; time: string } {
  const zoned = toZoned(now, timeZone)

  return { weekday: Number(format(zoned, 'i')), time: format(zoned, 'HH:mm') }
}

export function sortEntries<T extends EntryTimes>(entries: T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      a.weekday - b.weekday ||
      timeToMinutes(a.starts_at) - timeToMinutes(b.starts_at) ||
      timeToMinutes(a.ends_at) - timeToMinutes(b.ends_at),
  )
}

export function entriesForDay<T extends EntryTimes>(entries: T[], weekday: number): T[] {
  return sortEntries(entries.filter((entry) => entry.weekday === weekday))
}

export function entriesOverlap(a: EntryTimes, b: EntryTimes): boolean {
  return (
    a.weekday === b.weekday &&
    timeToMinutes(a.starts_at) < timeToMinutes(b.ends_at) &&
    timeToMinutes(b.starts_at) < timeToMinutes(a.ends_at)
  )
}

/** Bloques existentes que se superponen con uno nuevo o editado. */
export function findScheduleConflicts<T extends EntryTimes & { id: string }>(
  candidate: EntryTimes & { id?: string },
  entries: T[],
): T[] {
  return entries.filter((entry) => entry.id !== candidate.id && entriesOverlap(candidate, entry))
}

export type DayStatus = 'past' | 'now' | 'next' | 'later'

/**
 * Estado de cada bloque del día actual: terminado, en curso, el próximo o
 * más tarde. Sirve para resaltar «Ahora» y «Sigue» en el panel Hoy.
 */
export function dayStatuses<T extends EntryTimes & { id: string }>(
  entries: T[],
  time: string,
): Map<string, DayStatus> {
  const nowMinutes = timeToMinutes(time)
  const statuses = new Map<string, DayStatus>()
  let nextAssigned = false

  for (const entry of sortEntries(entries)) {
    const start = timeToMinutes(entry.starts_at)
    const end = timeToMinutes(entry.ends_at)

    if (end <= nowMinutes) {
      statuses.set(entry.id, 'past')
    } else if (start <= nowMinutes) {
      statuses.set(entry.id, 'now')
    } else if (!nextAssigned) {
      statuses.set(entry.id, 'next')
      nextAssigned = true
    } else {
      statuses.set(entry.id, 'later')
    }
  }

  return statuses
}

export interface PlacedEntry<T> {
  entry: T
  /** Columna dentro del día (0, 1, …) cuando hay bloques superpuestos. */
  lane: number
  /** Cantidad de columnas del grupo de bloques superpuestos. */
  lanes: number
}

/**
 * Ubica los bloques de un mismo día en columnas para que los que se
 * superponen se vean uno al lado del otro en lugar de taparse.
 */
export function layoutDay<T extends EntryTimes>(entries: T[]): Array<PlacedEntry<T>> {
  const sorted = sortEntries(entries)
  const placed: Array<PlacedEntry<T>> = []
  let group: Array<PlacedEntry<T>> = []
  let laneEnds: number[] = []
  let groupEnd = -1

  function closeGroup() {
    const lanes = laneEnds.length

    for (const item of group) {
      item.lanes = lanes
    }

    placed.push(...group)
    group = []
    laneEnds = []
  }

  for (const entry of sorted) {
    const start = timeToMinutes(entry.starts_at)
    const end = timeToMinutes(entry.ends_at)

    if (group.length > 0 && start >= groupEnd) {
      closeGroup()
    }

    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)

    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else {
      laneEnds[lane] = end
    }

    group.push({ entry, lane, lanes: 1 })
    groupEnd = group.length === 1 ? end : Math.max(groupEnd, end)
  }

  closeGroup()
  return placed
}

/**
 * Rango de horas que muestra la grilla: de 7 a 18 por defecto, y se amplía en
 * horas enteras si hay bloques antes o después.
 */
export function visibleHourRange(entries: EntryTimes[]): { startHour: number; endHour: number } {
  let startHour = 7
  let endHour = 18

  for (const entry of entries) {
    startHour = Math.min(startHour, Math.floor(timeToMinutes(entry.starts_at) / 60))
    endHour = Math.max(endHour, Math.ceil(timeToMinutes(entry.ends_at) / 60))
  }

  return { startHour, endHour: Math.min(24, endHour) }
}

/** Días que muestra la grilla: siempre de lunes a viernes; sábado y domingo si tienen bloques. */
export function visibleWeekdays(entries: EntryTimes[]): number[] {
  const hasSaturday = entries.some((entry) => entry.weekday === 6)
  const hasSunday = entries.some((entry) => entry.weekday === 7)

  return WEEKDAYS.filter(
    (day) => day <= 5 || (day === 6 && (hasSaturday || hasSunday)) || (day === 7 && hasSunday),
  )
}

/** Horario semanal de una asignatura en una línea: «Lun 08:00–09:30 · Mié 10:00–11:30». */
export function describeSubjectSchedule(entries: EntryTimes[]): string {
  return sortEntries(entries)
    .map((entry) => `${WEEKDAY_SHORT[entry.weekday]} ${formatTimeRange(entry)}`)
    .join(' · ')
}
