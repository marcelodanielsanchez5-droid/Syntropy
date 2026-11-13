import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { detectTimezone } from './dates'

/**
 * Fechas con hora y zona horaria.
 *
 * La base guarda instantes en UTC (`timestamptz`). La app los muestra y los
 * carga en la zona horaria del perfil, que puede no coincidir con la del
 * dispositivo. Estas funciones hacen esa conversión en un solo lugar.
 */

/** Instante: cadena ISO, milisegundos o `Date`. */
export type InstantInput = string | number | Date

/** Día de calendario sin hora, como `YYYY-MM-DD`. */
export type DateKey = string

const DAY_MS = 86_400_000

function toMs(value: InstantInput): number {
  if (typeof value === 'number') {
    return value
  }

  return typeof value === 'string' ? Date.parse(value) : value.getTime()
}

function dateKeyToUtcMs(dateKey: DateKey): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** Devuelve la zona si el navegador la reconoce; si no, la del dispositivo. */
export function resolveTimeZone(timeZone: string | null | undefined): string {
  const candidate = timeZone?.trim()

  if (candidate) {
    try {
      new Intl.DateTimeFormat('es', { timeZone: candidate })
      return candidate
    } catch {
      // Zona desconocida: se usa la del dispositivo.
    }
  }

  return detectTimezone()
}

/** El mismo instante, con sus campos (día, hora…) expresados en la zona dada. */
export function toZoned(value: InstantInput, timeZone: string): TZDate {
  return new TZDate(toMs(value), timeZone)
}

/** Día de calendario de un instante en la zona dada. */
export function zonedDateKey(value: InstantInput, timeZone: string): DateKey {
  return format(toZoned(value, timeZone), 'yyyy-MM-dd')
}

/** Hora `HH:mm` de un instante en la zona dada. */
export function zonedTime(value: InstantInput, timeZone: string): string {
  return format(toZoned(value, timeZone), 'HH:mm')
}

/**
 * Fecha y hora locales sin desplazamiento (`YYYY-MM-DDTHH:mm:ss`). Es el
 * formato que recibe el calendario, que dibuja las horas tal como llegan.
 */
export function toWallTime(value: InstantInput, timeZone: string): string {
  return format(toZoned(value, timeZone), "yyyy-MM-dd'T'HH:mm:ss")
}

/** Convierte un día y una hora locales de la zona dada en un instante UTC (ISO). */
export function zonedToUtcIso(dateKey: DateKey, time: string, timeZone: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  const zoned = new TZDate(year, month - 1, day, hours, minutes, 0, timeZone)

  return new Date(zoned.getTime()).toISOString()
}

/** Suma (o resta) días a un día de calendario. */
export function shiftDateKey(dateKey: DateKey, days: number): DateKey {
  return new Date(dateKeyToUtcMs(dateKey) + days * DAY_MS).toISOString().slice(0, 10)
}

/** Días de calendario desde `from` hasta `to`; negativo si `to` es anterior. */
export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((dateKeyToUtcMs(to) - dateKeyToUtcMs(from)) / DAY_MS)
}

/** Normaliza una hora de PostgreSQL (`HH:mm:ss`) al formato de los formularios (`HH:mm`). */
export function toTimeInputValue(time: string | null | undefined, fallback = ''): string {
  return time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : fallback
}

export function isTimeValue(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Formatea un instante en la zona dada, en español. */
export function formatZoned(value: InstantInput, timeZone: string, pattern: string): string {
  const zoned = toZoned(value, timeZone)

  if (Number.isNaN(zoned.getTime())) {
    return 'Fecha inválida'
  }

  return format(zoned, pattern, { locale: es })
}

/** «Miércoles 18 de noviembre · 08:00» */
export function formatDayAndTime(value: InstantInput, timeZone: string): string {
  return capitalize(formatZoned(value, timeZone, "EEEE d 'de' MMMM · HH:mm"))
}

/** «18 nov · 08:00» */
export function formatShortDayAndTime(value: InstantInput, timeZone: string): string {
  return formatZoned(value, timeZone, 'd MMM · HH:mm')
}

/** «Miércoles 18 de noviembre» */
export function formatLongDay(value: InstantInput, timeZone: string): string {
  return capitalize(formatZoned(value, timeZone, "EEEE d 'de' MMMM"))
}

export type CountdownKind = 'past' | 'today' | 'tomorrow' | 'upcoming'

export interface Countdown {
  kind: CountdownKind
  /** Días de calendario desde hoy hasta la fecha, en la zona dada. Negativo si el día ya pasó. */
  days: number
}

/**
 * Cuenta regresiva hasta un instante. «Hoy» y «mañana» se miden por día de
 * calendario en la zona del usuario; `past` significa que la hora ya pasó,
 * aunque el día siga siendo hoy.
 */
export function getCountdown(
  value: InstantInput,
  { timeZone, now = new Date() }: { timeZone: string; now?: Date },
): Countdown {
  const days = daysBetween(zonedDateKey(now, timeZone), zonedDateKey(value, timeZone))

  if (toMs(value) < now.getTime()) {
    return { kind: 'past', days }
  }

  if (days === 0) {
    return { kind: 'today', days }
  }

  return { kind: days === 1 ? 'tomorrow' : 'upcoming', days }
}
