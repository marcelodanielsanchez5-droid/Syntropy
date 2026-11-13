import { describe, expect, it } from 'vitest'
import {
  emptyScheduleFormValues,
  scheduleEntryToFormValues,
  toSchedulePayloads,
} from '@/features/schedule/schedule-form'
import { scheduleFormSchema } from '@/features/schedule/schedule-schemas'
import {
  dayStatuses,
  describeSubjectSchedule,
  entryColor,
  findScheduleConflicts,
  layoutDay,
  visibleHourRange,
  visibleWeekdays,
  zonedWeekdayAndTime,
} from '@/features/schedule/schedule-utils'
import type { ScheduleEntry, Subject } from '@/types/database'

function entry(
  id: string,
  weekday: number,
  starts_at: string,
  ends_at: string,
  overrides: Partial<ScheduleEntry> = {},
): ScheduleEntry {
  return {
    id,
    user_id: 'user-1',
    academic_year_id: 'year-1',
    subject_id: 'subject-1',
    title: id,
    entry_type: 'class',
    weekday,
    starts_at: `${starts_at}:00`,
    ends_at: `${ends_at}:00`,
    location: null,
    notes: null,
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }
}

const subject = { id: 'subject-1', name: 'Matemática', color_hex: '#2F6BFF' } as Subject

describe('grilla semanal', () => {
  it('pone en columnas los bloques que se superponen', () => {
    const placed = layoutDay([
      entry('mate', 1, '08:00', '09:30'),
      entry('ingles', 1, '08:30', '09:30'),
      entry('recreo', 1, '09:30', '10:00'),
    ])
    const byId = Object.fromEntries(placed.map((item) => [item.entry.id, item]))

    expect(byId.mate).toMatchObject({ lane: 0, lanes: 2 })
    expect(byId.ingles).toMatchObject({ lane: 1, lanes: 2 })
    // El recreo empieza cuando terminan los dos: ocupa todo el ancho.
    expect(byId.recreo).toMatchObject({ lane: 0, lanes: 1 })
  })

  it('reutiliza una columna libre dentro del mismo grupo', () => {
    const placed = layoutDay([
      entry('a', 2, '08:00', '12:00'),
      entry('b', 2, '08:00', '09:00'),
      entry('c', 2, '10:00', '11:00'),
    ])
    const byId = Object.fromEntries(placed.map((item) => [item.entry.id, item]))

    // b (08–09) va primero por terminar antes; c ocupa la columna que b dejó libre.
    expect(byId.b).toMatchObject({ lane: 0, lanes: 2 })
    expect(byId.a).toMatchObject({ lane: 1, lanes: 2 })
    expect(byId.c).toMatchObject({ lane: 0, lanes: 2 })
  })

  it('amplía las horas visibles solo si hay bloques fuera de 7 a 18', () => {
    expect(visibleHourRange([])).toEqual({ startHour: 7, endHour: 18 })
    expect(
      visibleHourRange([
        entry('temprano', 1, '06:30', '07:15'),
        entry('tarde', 2, '20:00', '21:30'),
      ]),
    ).toEqual({
      startHour: 6,
      endHour: 22,
    })
  })

  it('muestra el fin de semana solo si tiene bloques', () => {
    expect(visibleWeekdays([])).toEqual([1, 2, 3, 4, 5])
    expect(visibleWeekdays([entry('sab', 6, '10:00', '11:00')])).toEqual([1, 2, 3, 4, 5, 6])
    expect(visibleWeekdays([entry('dom', 7, '10:00', '11:00')])).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe('día actual', () => {
  const day = [
    entry('primera', 3, '08:00', '09:30'),
    entry('segunda', 3, '10:00', '11:30'),
    entry('tercera', 3, '14:00', '15:00'),
  ]

  it('marca lo terminado, lo que está en curso y lo que sigue', () => {
    const statuses = dayStatuses(day, '10:15')

    expect(Object.fromEntries(statuses)).toEqual({
      primera: 'past',
      segunda: 'now',
      tercera: 'next',
    })
  })

  it('antes de empezar el día, la primera clase es la que sigue', () => {
    expect(Object.fromEntries(dayStatuses(day, '07:00'))).toEqual({
      primera: 'next',
      segunda: 'later',
      tercera: 'later',
    })
  })

  it('calcula el día y la hora en la zona del perfil', () => {
    // Viernes 13 de noviembre de 2026, 02:30 UTC = jueves 12, 23:30 en Buenos Aires.
    const now = new Date('2026-11-13T02:30:00.000Z')

    expect(zonedWeekdayAndTime(now, 'America/Argentina/Buenos_Aires')).toEqual({
      weekday: 4,
      time: '23:30',
    })
    expect(zonedWeekdayAndTime(now, 'UTC')).toEqual({ weekday: 5, time: '02:30' })
  })
})

describe('superposiciones y colores', () => {
  const week = [entry('mate', 1, '08:00', '09:30'), entry('lengua', 1, '10:00', '11:30')]

  it('avisa si un bloque nuevo se superpone, sin contar los que solo se tocan', () => {
    expect(
      findScheduleConflicts({ weekday: 1, starts_at: '09:00', ends_at: '10:30' }, week).map(
        (item) => item.id,
      ),
    ).toEqual(['mate', 'lengua'])
    expect(
      findScheduleConflicts({ weekday: 1, starts_at: '09:30', ends_at: '10:00' }, week),
    ).toEqual([])
    expect(
      findScheduleConflicts({ weekday: 2, starts_at: '08:00', ends_at: '09:30' }, week),
    ).toEqual([])
  })

  it('al editar, el bloque no choca consigo mismo', () => {
    expect(
      findScheduleConflicts({ id: 'mate', weekday: 1, starts_at: '08:00', ends_at: '09:00' }, week),
    ).toEqual([])
  })

  it('usa el color de la materia o, si no tiene, el del tipo', () => {
    expect(entryColor({ entry_type: 'class' }, '#2F6BFF')).toBe('#2F6BFF')
    expect(entryColor({ entry_type: 'break' }, undefined)).toBe('#7D8592')
    expect(entryColor({ entry_type: 'activity' }, undefined)).toBe('#9A15AF')
  })

  it('resume el horario de una materia', () => {
    expect(
      describeSubjectSchedule([entry('b', 3, '10:00', '11:30'), entry('a', 1, '08:00', '09:30')]),
    ).toBe('Lun 08:00–09:30 · Mié 10:00–11:30')
  })
})

describe('formulario de bloques', () => {
  const valid = { ...emptyScheduleFormValues({ subjectId: 'subject-1', weekday: 1 }) }

  it('una clase necesita asignatura', () => {
    const result = scheduleFormSchema.safeParse({ ...valid, subject_id: '' })

    expect(result.error?.issues.map((issue) => issue.path[0])).toContain('subject_id')
  })

  it('un descanso sin asignatura necesita nombre', () => {
    expect(
      scheduleFormSchema.safeParse({ ...valid, entry_type: 'break', subject_id: '', title: '' })
        .success,
    ).toBe(false)
    expect(
      scheduleFormSchema.safeParse({
        ...valid,
        entry_type: 'break',
        subject_id: '',
        title: 'Recreo',
      }).success,
    ).toBe(true)
  })

  it('la hora de fin debe ser posterior a la de inicio', () => {
    const result = scheduleFormSchema.safeParse({ ...valid, starts_at: '10:00', ends_at: '10:00' })

    expect(result.error?.issues.map((issue) => issue.path[0])).toContain('ends_at')
  })

  it('exige al menos un día', () => {
    expect(scheduleFormSchema.safeParse({ ...valid, weekdays: [] }).success).toBe(false)
  })

  it('crea un bloque por día elegido y usa el nombre de la materia si no se escribió otro', () => {
    const payloads = toSchedulePayloads({ ...valid, weekdays: [3, 1, 3] }, subject)

    expect(payloads.map((payload) => payload.weekday)).toEqual([1, 3])
    expect(payloads[0]).toMatchObject({
      title: 'Matemática',
      subject_id: 'subject-1',
      location: null,
    })
  })

  it('carga un bloque existente con sus horas en formato de formulario', () => {
    expect(scheduleEntryToFormValues(entry('mate', 2, '08:00', '09:30'))).toMatchObject({
      weekdays: [2],
      starts_at: '08:00',
      ends_at: '09:30',
    })
  })
})
