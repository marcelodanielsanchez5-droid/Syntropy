import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const FALLBACK_TIMEZONES = [
  'UTC',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Caracas',
  'America/Chile/Santiago',
  'America/Lima',
  'America/Mexico_City',
  'America/Montevideo',
  'America/New_York',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/Lisbon',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/London',
  'Africa/Cairo',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
]

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function getTimezoneOptions(currentTimezone?: string | null): string[] {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf?.('timeZone')

  const list = supported && supported.length > 0 ? supported : FALLBACK_TIMEZONES
  const preferred = [currentTimezone?.trim(), 'UTC', detectTimezone()].filter(
    (timezone): timezone is string => Boolean(timezone),
  )

  return Array.from(new Set([...preferred, ...list])).sort((a, b) => a.localeCompare(b))
}

export function formatDate(value: string | Date, pattern = "d 'de' MMMM 'de' yyyy"): string {
  const date = typeof value === 'string' ? parseISO(value) : value

  if (Number.isNaN(date.getTime())) {
    return 'Fecha inválida'
  }

  return format(date, pattern, { locale: es })
}

export function formatShortDate(value: string | Date): string {
  return formatDate(value, "d MMM yyyy")
}

export function formatDateRange(start: string, end: string): string {
  return `${formatShortDate(start)} — ${formatShortDate(end)}`
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getDefaultAcademicYear(): { name: string; starts_on: string; ends_on: string } {
  const now = new Date()
  const year = now.getFullYear()

  return {
    name: `${year}`,
    starts_on: `${year}-03-01`,
    ends_on: `${year}-12-20`,
  }
}

export function getGreeting(): string {
  const hour = new Date().getHours()

  if (hour < 6) {
    return 'Buenas noches'
  }

  if (hour < 12) {
    return 'Buenos días'
  }

  if (hour < 20) {
    return 'Buenas tardes'
  }

  return 'Buenas noches'
}

export function getFirstName(fullName: string | null | undefined, username: string): string {
  const candidate = (fullName ?? '').trim() || username
  return candidate.split(/\s+/)[0] ?? username
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = parseISO(value)

  if (Number.isNaN(date.getTime())) {
    return false
  }

  // parseISO normaliza fechas imposibles (por ejemplo 2026-02-30 a marzo).
  // Comparamos de vuelta para exigir un día real del calendario.
  return format(date, 'yyyy-MM-dd') === value
}

export function daysUntil(value: string | Date): number {
  const date = typeof value === 'string' ? parseISO(value) : value
  return differenceInCalendarDays(date, new Date())
}

export function formatRelativeDueDate(value: string): string {
  const days = daysUntil(value)

  if (days < 0) {
    return `Hace ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'}`
  }

  if (days === 0) {
    return 'Hoy'
  }

  if (days === 1) {
    return 'Mañana'
  }

  if (days <= 7) {
    return `En ${days} días`
  }

  return formatShortDate(value)
}
