import { describe, expect, it } from 'vitest'
import { detectTimezone } from '@/lib/dates'
import {
  daysBetween,
  formatDayAndTime,
  getCountdown,
  isTimeValue,
  resolveTimeZone,
  shiftDateKey,
  toTimeInputValue,
  toWallTime,
  zonedDateKey,
  zonedTime,
  zonedToUtcIso,
} from '@/lib/datetime'

const BUENOS_AIRES = 'America/Argentina/Buenos_Aires' // UTC-3, sin horario de verano
const MADRID = 'Europe/Madrid'
const NEW_YORK = 'America/New_York'

describe('zona horaria del perfil', () => {
  it('acepta zonas válidas y cae en la del dispositivo si no la reconoce', () => {
    expect(resolveTimeZone(BUENOS_AIRES)).toBe(BUENOS_AIRES)
    expect(resolveTimeZone('  Europe/Madrid ')).toBe(MADRID)
    expect(resolveTimeZone('No/Existe')).toBe(detectTimezone())
    expect(resolveTimeZone(null)).toBe(detectTimezone())
    expect(resolveTimeZone('')).toBe(detectTimezone())
  })

  it('convierte una fecha y hora locales en un instante UTC', () => {
    expect(zonedToUtcIso('2026-11-18', '08:00', BUENOS_AIRES)).toBe('2026-11-18T11:00:00.000Z')
    expect(zonedToUtcIso('2026-11-18', '08:00', MADRID)).toBe('2026-11-18T07:00:00.000Z')
    expect(zonedToUtcIso('2026-11-18', '23:59', BUENOS_AIRES)).toBe('2026-11-19T02:59:00.000Z')
  })

  it('respeta el horario de verano de la zona', () => {
    // Nueva York: UTC-5 en invierno, UTC-4 desde el 8 de marzo de 2026.
    expect(zonedToUtcIso('2026-03-07', '18:00', NEW_YORK)).toBe('2026-03-07T23:00:00.000Z')
    expect(zonedToUtcIso('2026-03-08', '18:00', NEW_YORK)).toBe('2026-03-08T22:00:00.000Z')
  })

  it('muestra un instante con el día y la hora de la zona', () => {
    const instant = '2026-11-18T02:30:00.000Z'

    expect(zonedDateKey(instant, BUENOS_AIRES)).toBe('2026-11-17')
    expect(zonedTime(instant, BUENOS_AIRES)).toBe('23:30')
    expect(zonedDateKey(instant, MADRID)).toBe('2026-11-18')
    expect(zonedTime(instant, MADRID)).toBe('03:30')
    expect(toWallTime(instant, BUENOS_AIRES)).toBe('2026-11-17T23:30:00')
  })

  it('ida y vuelta: lo que se carga en el formulario es lo que se vuelve a mostrar', () => {
    const iso = zonedToUtcIso('2026-12-31', '22:15', BUENOS_AIRES)

    expect(zonedDateKey(iso, BUENOS_AIRES)).toBe('2026-12-31')
    expect(zonedTime(iso, BUENOS_AIRES)).toBe('22:15')
  })

  it('formatea en español', () => {
    expect(formatDayAndTime('2026-11-18T11:00:00.000Z', BUENOS_AIRES)).toBe(
      'Miércoles 18 de noviembre · 08:00',
    )
  })
})

describe('días de calendario', () => {
  it('suma y resta días cruzando meses, años y bisiestos', () => {
    expect(shiftDateKey('2026-11-30', 1)).toBe('2026-12-01')
    expect(shiftDateKey('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDateKey('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftDateKey('2024-02-28', 1)).toBe('2024-02-29')
    expect(shiftDateKey('2026-11-18', -7)).toBe('2026-11-11')
    expect(shiftDateKey('2026-11-18', 0)).toBe('2026-11-18')
  })

  it('cuenta los días entre dos fechas', () => {
    expect(daysBetween('2026-11-18', '2026-11-18')).toBe(0)
    expect(daysBetween('2026-11-18', '2026-11-20')).toBe(2)
    expect(daysBetween('2026-11-28', '2026-12-02')).toBe(4)
    expect(daysBetween('2026-11-18', '2026-11-15')).toBe(-3)
  })

  it('valida y normaliza horas', () => {
    expect(isTimeValue('08:00')).toBe(true)
    expect(isTimeValue('23:59')).toBe(true)
    expect(isTimeValue('24:00')).toBe(false)
    expect(isTimeValue('8:00')).toBe(false)
    expect(isTimeValue('')).toBe(false)
    expect(toTimeInputValue('18:00:00')).toBe('18:00')
    expect(toTimeInputValue(null, '18:00')).toBe('18:00')
  })
})

describe('cuenta regresiva', () => {
  // Jueves 12 de noviembre de 2026, 10:00 en Buenos Aires.
  const now = new Date('2026-11-12T13:00:00.000Z')
  const options = { timeZone: BUENOS_AIRES, now }

  it('distingue hoy, mañana y los próximos días', () => {
    expect(getCountdown(zonedToUtcIso('2026-11-12', '23:59', BUENOS_AIRES), options)).toEqual({
      kind: 'today',
      days: 0,
    })
    expect(getCountdown(zonedToUtcIso('2026-11-13', '08:00', BUENOS_AIRES), options)).toEqual({
      kind: 'tomorrow',
      days: 1,
    })
    expect(getCountdown(zonedToUtcIso('2026-11-19', '08:00', BUENOS_AIRES), options)).toEqual({
      kind: 'upcoming',
      days: 7,
    })
  })

  it('marca como pasado lo que venció, aunque haya sido hoy', () => {
    expect(getCountdown(zonedToUtcIso('2026-11-12', '09:00', BUENOS_AIRES), options)).toEqual({
      kind: 'past',
      days: 0,
    })
    expect(getCountdown(zonedToUtcIso('2026-11-09', '23:59', BUENOS_AIRES), options)).toEqual({
      kind: 'past',
      days: -3,
    })
  })

  it('cuenta los días en la zona del usuario, no en UTC', () => {
    // 23:00 del miércoles 11 en Buenos Aires ya es jueves 12 en UTC.
    const lateNight = new Date('2026-11-12T02:00:00.000Z')
    const due = zonedToUtcIso('2026-11-12', '09:00', BUENOS_AIRES)

    expect(getCountdown(due, { timeZone: BUENOS_AIRES, now: lateNight }).kind).toBe('tomorrow')
    expect(getCountdown(due, { timeZone: 'UTC', now: lateNight }).kind).toBe('today')
  })

  it('cruza el cambio de mes', () => {
    const endOfMonth = new Date(zonedToUtcIso('2026-11-30', '10:00', BUENOS_AIRES))
    const due = zonedToUtcIso('2026-12-01', '08:00', BUENOS_AIRES)

    expect(getCountdown(due, { timeZone: BUENOS_AIRES, now: endOfMonth })).toEqual({
      kind: 'tomorrow',
      days: 1,
    })
  })
})
