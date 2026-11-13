import { describe, expect, it } from 'vitest'
import {
  describeStudyPlan,
  examToStudyPlan,
  findOverlaps,
  generateStudySessions,
  isReplaceableSession,
  reconcileStudySessions,
  studyScheduleChanged,
  type StudyPlan,
} from '@/features/exams/study-plan'
import { zonedToUtcIso } from '@/lib/datetime'

const TZ = 'America/Argentina/Buenos_Aires' // UTC-3, sin horario de verano

function at(date: string, time: string, timeZone = TZ) {
  return zonedToUtcIso(date, time, timeZone)
}

function plan(overrides: Partial<StudyPlan> = {}): StudyPlan {
  return { daysBefore: 7, frequencyDays: 1, sessionMinutes: 45, time: '18:00', ...overrides }
}

function starts(sessions: Array<{ scheduled_at: string }>) {
  return sessions.map((session) => session.scheduled_at)
}

describe('generateStudySessions', () => {
  it('genera una sesión cada N días a la hora elegida', () => {
    const sessions = generateStudySessions({
      examAt: at('2026-11-20', '08:00'),
      plan: plan({ frequencyDays: 2 }),
      timeZone: TZ,
      now: new Date(at('2026-11-10', '10:00')),
    })

    expect(starts(sessions)).toEqual([
      at('2026-11-13', '18:00'),
      at('2026-11-15', '18:00'),
      at('2026-11-17', '18:00'),
      at('2026-11-19', '18:00'),
    ])
    expect(sessions.every((session) => session.duration_minutes === 45)).toBe(true)
  })

  it('no estudia el día del examen si la hora de estudio es posterior', () => {
    const sessions = generateStudySessions({
      examAt: at('2026-11-20', '08:00'),
      plan: plan({ daysBefore: 3 }),
      timeZone: TZ,
      now: new Date(at('2026-11-10', '10:00')),
    })

    expect(starts(sessions)).toEqual([
      at('2026-11-17', '18:00'),
      at('2026-11-18', '18:00'),
      at('2026-11-19', '18:00'),
    ])
  })

  it('sí estudia el día del examen si la sesión termina antes', () => {
    const sessions = generateStudySessions({
      examAt: at('2026-11-20', '20:00'),
      plan: plan({ daysBefore: 2 }),
      timeZone: TZ,
      now: new Date(at('2026-11-10', '10:00')),
    })

    expect(starts(sessions)).toEqual([
      at('2026-11-18', '18:00'),
      at('2026-11-19', '18:00'),
      at('2026-11-20', '18:00'),
    ])
  })

  it('descarta la sesión que se superpondría con el examen', () => {
    const sessions = generateStudySessions({
      examAt: at('2026-11-20', '19:00'),
      plan: plan({ daysBefore: 1, sessionMinutes: 90 }),
      timeZone: TZ,
      now: new Date(at('2026-11-10', '10:00')),
    })

    expect(starts(sessions)).toEqual([at('2026-11-19', '18:00')])
  })

  it('con cero días antes solo estudia el día del examen', () => {
    const sessions = generateStudySessions({
      examAt: at('2026-11-20', '20:00'),
      plan: plan({ daysBefore: 0 }),
      timeZone: TZ,
      now: new Date(at('2026-11-10', '10:00')),
    })

    expect(starts(sessions)).toEqual([at('2026-11-20', '18:00')])
  })

  it('si la fecha de inicio ya pasó, empieza hoy', () => {
    const sessions = generateStudySessions({
      examAt: at('2026-11-20', '08:00'),
      plan: plan(),
      timeZone: TZ,
      now: new Date(at('2026-11-18', '10:00')),
    })

    expect(starts(sessions)).toEqual([at('2026-11-18', '18:00'), at('2026-11-19', '18:00')])
  })

  it('al empezar hoy, cuenta la frecuencia desde hoy', () => {
    const sessions = generateStudySessions({
      examAt: at('2026-11-23', '08:00'),
      plan: plan({ daysBefore: 30, frequencyDays: 2 }),
      timeZone: TZ,
      now: new Date(at('2026-11-18', '10:00')),
    })

    expect(starts(sessions)).toEqual([
      at('2026-11-18', '18:00'),
      at('2026-11-20', '18:00'),
      at('2026-11-22', '18:00'),
    ])
  })

  it('si hoy la hora ya pasó, corre la sesión de hoy a la próxima hora en punto', () => {
    const sessions = generateStudySessions({
      examAt: at('2026-11-20', '08:00'),
      plan: plan(),
      timeZone: TZ,
      now: new Date(at('2026-11-18', '19:20')),
    })

    expect(starts(sessions)).toEqual([at('2026-11-18', '20:00'), at('2026-11-19', '18:00')])
  })

  it('si la próxima hora ya es mañana, hoy no se estudia', () => {
    const sessions = generateStudySessions({
      examAt: at('2026-11-20', '08:00'),
      plan: plan(),
      timeZone: TZ,
      now: new Date(at('2026-11-18', '23:30')),
    })

    expect(starts(sessions)).toEqual([at('2026-11-19', '18:00')])
  })

  it('la sesión corrida a la próxima hora también debe terminar antes del examen', () => {
    const fits = generateStudySessions({
      examAt: at('2026-11-20', '08:00'),
      plan: plan({ time: '05:00' }),
      timeZone: TZ,
      now: new Date(at('2026-11-20', '05:10')),
    })
    const doesNotFit = generateStudySessions({
      examAt: at('2026-11-20', '08:00'),
      plan: plan({ time: '05:00', sessionMinutes: 180 }),
      timeZone: TZ,
      now: new Date(at('2026-11-20', '05:10')),
    })

    expect(starts(fits)).toEqual([at('2026-11-20', '06:00')])
    expect(doesNotFit).toEqual([])
  })

  it('no genera nada si ya no queda tiempo o el examen ya pasó', () => {
    const noRoom = generateStudySessions({
      examAt: at('2026-11-20', '08:00'),
      plan: plan(),
      timeZone: TZ,
      now: new Date(at('2026-11-20', '07:30')),
    })
    const pastExam = generateStudySessions({
      examAt: at('2026-11-01', '08:00'),
      plan: plan(),
      timeZone: TZ,
      now: new Date(at('2026-11-10', '10:00')),
    })

    expect(noRoom).toEqual([])
    expect(pastExam).toEqual([])
  })

  it('con una frecuencia mayor que el período, queda una sola sesión', () => {
    const sessions = generateStudySessions({
      examAt: at('2026-11-20', '08:00'),
      plan: plan({ daysBefore: 3, frequencyDays: 30 }),
      timeZone: TZ,
      now: new Date(at('2026-11-10', '10:00')),
    })

    expect(starts(sessions)).toEqual([at('2026-11-17', '18:00')])
  })

  it('usa la zona horaria del perfil y no la del dispositivo', () => {
    const sessions = generateStudySessions({
      examAt: at('2026-11-20', '08:00', 'Europe/Madrid'),
      plan: plan({ daysBefore: 1 }),
      timeZone: 'Europe/Madrid',
      now: new Date(at('2026-11-10', '10:00', 'Europe/Madrid')),
    })

    // 18:00 en Madrid en noviembre es 17:00 UTC.
    expect(starts(sessions)).toEqual(['2026-11-19T17:00:00.000Z'])
  })

  it('conserva la hora local cuando cambia el horario de verano', () => {
    const NEW_YORK = 'America/New_York'
    const sessions = generateStudySessions({
      examAt: at('2026-03-10', '09:00', NEW_YORK),
      plan: plan({ daysBefore: 4 }),
      timeZone: NEW_YORK,
      now: new Date('2026-03-01T12:00:00.000Z'),
    })

    // El 8 de marzo de 2026 Nueva York pasa de UTC-5 a UTC-4.
    expect(starts(sessions)).toEqual([
      '2026-03-06T23:00:00.000Z',
      '2026-03-07T23:00:00.000Z',
      '2026-03-08T22:00:00.000Z',
      '2026-03-09T22:00:00.000Z',
    ])
  })

  it('respeta el máximo de la base: un año de anticipación, todos los días', () => {
    const sessions = generateStudySessions({
      examAt: at('2027-11-20', '08:00'),
      plan: plan({ daysBefore: 365 }),
      timeZone: TZ,
      now: new Date(at('2026-11-10', '10:00')),
    })

    expect(sessions).toHaveLength(365)
    expect(new Set(starts(sessions)).size).toBe(365)
  })
})

describe('reconcileStudySessions', () => {
  const now = new Date(at('2026-11-12', '10:00'))

  it('una sesión se regenera solo si sigue programada y todavía no ocurrió', () => {
    expect(
      isReplaceableSession({ scheduled_at: at('2026-11-13', '18:00'), status: 'scheduled' }, now),
    ).toBe(true)
    expect(
      isReplaceableSession({ scheduled_at: at('2026-11-11', '18:00'), status: 'scheduled' }, now),
    ).toBe(false)
    expect(
      isReplaceableSession({ scheduled_at: at('2026-11-13', '18:00'), status: 'completed' }, now),
    ).toBe(false)
    expect(
      isReplaceableSession({ scheduled_at: at('2026-11-13', '18:00'), status: 'skipped' }, now),
    ).toBe(false)
  })

  it('reemplaza las futuras programadas y conserva el historial', () => {
    const existing = [
      { scheduled_at: at('2026-11-10', '18:00'), status: 'completed' as const },
      { scheduled_at: at('2026-11-11', '18:00'), status: 'scheduled' as const },
      { scheduled_at: at('2026-11-13', '18:00'), status: 'scheduled' as const },
      { scheduled_at: at('2026-11-14', '18:00'), status: 'skipped' as const },
    ]
    const planned = [
      { scheduled_at: at('2026-11-13', '18:00'), duration_minutes: 45 },
      { scheduled_at: at('2026-11-14', '18:00'), duration_minutes: 45 },
      { scheduled_at: at('2026-11-15', '18:00'), duration_minutes: 45 },
    ]

    const result = reconcileStudySessions(existing, planned, now)

    expect(result.hasReplaceable).toBe(true)
    // El 14 ya tiene una sesión salteada: no se duplica.
    expect(starts(result.toInsert)).toEqual([at('2026-11-13', '18:00'), at('2026-11-15', '18:00')])
  })

  it('sin sesiones previas guarda todo el plan', () => {
    const planned = [{ scheduled_at: at('2026-11-13', '18:00'), duration_minutes: 45 }]

    expect(reconcileStudySessions([], planned, now)).toEqual({
      hasReplaceable: false,
      toInsert: planned,
    })
  })

  it('al quitar el plan solo queda borrar las futuras programadas', () => {
    const existing = [
      { scheduled_at: at('2026-11-10', '18:00'), status: 'completed' as const },
      { scheduled_at: at('2026-11-13', '18:00'), status: 'scheduled' as const },
    ]

    expect(reconcileStudySessions(existing, [], now)).toEqual({
      hasReplaceable: true,
      toInsert: [],
    })
  })
})

describe('plan guardado en el examen', () => {
  const withPlan = {
    exam_at: at('2026-11-20', '08:00'),
    study_days_before: 7,
    study_frequency_days: 2,
    study_session_minutes: 45,
    study_time: '18:00:00',
  }
  const withoutPlan = {
    exam_at: at('2026-11-20', '08:00'),
    study_days_before: null,
    study_frequency_days: null,
    study_session_minutes: null,
    study_time: null,
  }

  it('lee el plan y normaliza la hora de PostgreSQL', () => {
    expect(examToStudyPlan(withPlan)).toEqual({
      daysBefore: 7,
      frequencyDays: 2,
      sessionMinutes: 45,
      time: '18:00',
    })
    expect(examToStudyPlan(withoutPlan)).toBeNull()
  })

  it('detecta cuándo hay que regenerar las sesiones', () => {
    expect(studyScheduleChanged(withPlan, { ...withPlan })).toBe(false)
    expect(studyScheduleChanged(withPlan, { ...withPlan, study_time: '18:00' })).toBe(false)
    expect(
      studyScheduleChanged(withPlan, { ...withPlan, exam_at: at('2026-11-21', '08:00') }),
    ).toBe(true)
    expect(studyScheduleChanged(withPlan, { ...withPlan, study_frequency_days: 1 })).toBe(true)
    expect(studyScheduleChanged(withPlan, withoutPlan)).toBe(true)
    expect(studyScheduleChanged(withoutPlan, { ...withoutPlan })).toBe(false)
  })

  it('describe el plan en una frase', () => {
    expect(describeStudyPlan(plan())).toBe('Desde 7 días antes, todos los días, 45 min a las 18:00')
    expect(
      describeStudyPlan(
        plan({ daysBefore: 1, frequencyDays: 2, sessionMinutes: 30, time: '07:30' }),
      ),
    ).toBe('Desde 1 día antes, cada 2 días, 30 min a las 07:30')
    expect(describeStudyPlan(plan({ daysBefore: 0, sessionMinutes: 60 }))).toBe(
      'El día del examen, 60 min a las 18:00',
    )
  })
})

describe('findOverlaps', () => {
  const session = { scheduled_at: at('2026-11-18', '18:00'), duration_minutes: 45 }

  it('avisa de los bloques que se superponen con la sesión', () => {
    const blocks = [
      { id: 'antes', label: 'Termina justo antes', start: at('2026-11-18', '17:00'), minutes: 60 },
      { id: 'encima', label: 'Examen de Inglés', start: at('2026-11-18', '18:30'), minutes: 60 },
      {
        id: 'despues',
        label: 'Empieza justo después',
        start: at('2026-11-18', '18:45'),
        minutes: 30,
      },
      { id: 'otro-dia', label: 'Otro día', start: at('2026-11-19', '18:00'), minutes: 45 },
    ]

    expect(findOverlaps(session, blocks).map((block) => block.id)).toEqual(['encima'])
  })

  it('sin bloques no hay conflicto', () => {
    expect(findOverlaps(session, [])).toEqual([])
  })
})
