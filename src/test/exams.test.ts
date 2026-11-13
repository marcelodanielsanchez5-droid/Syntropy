import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Exam } from '@/types/database'

/**
 * Cliente de Supabase simulado: registra cada consulta (tabla, acción, filtros
 * y datos) y responde con lo que el caso de prueba haya preparado.
 */
const harness = vi.hoisted(() => {
  type Call = {
    table: string
    action: 'select' | 'insert' | 'update' | 'delete'
    filters: Array<[string, string, unknown]>
    payload?: unknown
  }

  const state = {
    calls: [] as Call[],
    examRow: null as unknown,
    existingSessions: [] as unknown[],
    insertSessionsError: null as unknown,
  }

  function from(table: string) {
    const call: Call = { table, action: 'select', filters: [] }

    function result() {
      state.calls.push(call)

      if (table === 'study_sessions' && call.action === 'select') {
        return { data: state.existingSessions, error: null }
      }

      if (table === 'study_sessions' && call.action === 'insert') {
        return { data: null, error: state.insertSessionsError }
      }

      return { data: null, error: null }
    }

    const builder = {
      select: () => builder,
      order: () => builder,
      insert: (payload: unknown) => {
        call.action = 'insert'
        call.payload = payload
        return builder
      },
      update: (payload: unknown) => {
        call.action = 'update'
        call.payload = payload
        return builder
      },
      delete: () => {
        call.action = 'delete'
        return builder
      },
      eq: (column: string, value: unknown) => {
        call.filters.push(['eq', column, value])
        return builder
      },
      in: (column: string, value: unknown) => {
        call.filters.push(['in', column, value])
        return builder
      },
      gt: (column: string, value: unknown) => {
        call.filters.push(['gt', column, value])
        return builder
      },
      single: () => {
        state.calls.push(call)
        return Promise.resolve({ data: state.examRow, error: null })
      },
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(result()).then(resolve, reject),
    }

    return builder
  }

  return { state, from }
})

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => ({ from: harness.from }),
}))

import { createExam, updateExam } from '@/features/exams/exam-service'
import { examFormSchema, isIntegerInRange } from '@/features/exams/exam-schemas'
import {
  emptyExamFormValues,
  examToFormValues,
  formValuesToStudyPlan,
  getExamCountdown,
  toExamPayload,
} from '@/features/exams/exam-utils'
import { zonedToUtcIso } from '@/lib/datetime'

const TZ = 'America/Argentina/Buenos_Aires'
const NOW = new Date('2026-11-12T13:00:00.000Z')
const DAY_MS = 86_400_000

function makeExam(overrides: Partial<Exam> = {}): Exam {
  return {
    id: 'exam-1',
    user_id: 'user-1',
    subject_id: 'subject-1',
    node_id: null,
    title: 'Parcial 1',
    description: null,
    exam_at: zonedToUtcIso('2026-11-20', '08:00', TZ),
    duration_minutes: 90,
    location: 'Aula 12',
    study_days_before: null,
    study_frequency_days: null,
    study_session_minutes: null,
    study_time: null,
    created_at: '2026-11-01T12:00:00.000Z',
    updated_at: '2026-11-01T12:00:00.000Z',
    ...overrides,
  }
}

const validForm = {
  ...emptyExamFormValues({ subjectId: 'subject-1', examDate: '2026-11-20' }),
  title: 'Parcial 1',
}

describe('examFormSchema', () => {
  it('acepta un examen sin plan de estudio', () => {
    expect(examFormSchema.safeParse(validForm).success).toBe(true)
  })

  it('exige título, asignatura, fecha y hora', () => {
    const result = examFormSchema.safeParse({
      ...validForm,
      title: ' ',
      subject_id: '',
      exam_date: '',
      exam_time: '',
    })
    const paths = result.error?.issues.map((issue) => issue.path[0])

    expect(result.success).toBe(false)
    expect(paths).toEqual(expect.arrayContaining(['title', 'subject_id', 'exam_date', 'exam_time']))
  })

  it('la duración es opcional, pero si se carga debe estar entre 1 y 1440 minutos', () => {
    expect(examFormSchema.safeParse({ ...validForm, duration_minutes: '' }).success).toBe(true)
    expect(examFormSchema.safeParse({ ...validForm, duration_minutes: '90' }).success).toBe(true)
    expect(examFormSchema.safeParse({ ...validForm, duration_minutes: '0' }).success).toBe(false)
    expect(examFormSchema.safeParse({ ...validForm, duration_minutes: '1441' }).success).toBe(false)
    expect(examFormSchema.safeParse({ ...validForm, duration_minutes: 'una hora' }).success).toBe(
      false,
    )
  })

  it('con el plan apagado no valida los campos del plan', () => {
    const result = examFormSchema.safeParse({
      ...validForm,
      plan_enabled: false,
      study_days_before: '',
      study_frequency_days: '99',
      study_session_minutes: '',
      study_time: '',
    })

    expect(result.success).toBe(true)
  })

  it('con el plan encendido exige los cuatro datos dentro de los límites de la base', () => {
    const complete = { ...validForm, plan_enabled: true }

    expect(examFormSchema.safeParse(complete).success).toBe(true)
    expect(examFormSchema.safeParse({ ...complete, study_days_before: '366' }).success).toBe(false)
    expect(examFormSchema.safeParse({ ...complete, study_days_before: '0' }).success).toBe(true)
    expect(examFormSchema.safeParse({ ...complete, study_frequency_days: '0' }).success).toBe(false)
    expect(examFormSchema.safeParse({ ...complete, study_frequency_days: '31' }).success).toBe(
      false,
    )
    expect(examFormSchema.safeParse({ ...complete, study_session_minutes: '4' }).success).toBe(
      false,
    )
    expect(examFormSchema.safeParse({ ...complete, study_session_minutes: '481' }).success).toBe(
      false,
    )
    expect(examFormSchema.safeParse({ ...complete, study_time: '' }).success).toBe(false)
  })

  it('señala cada campo del plan que falta', () => {
    const result = examFormSchema.safeParse({
      ...validForm,
      plan_enabled: true,
      study_days_before: '',
      study_frequency_days: '',
      study_session_minutes: '',
      study_time: '',
    })

    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      'study_days_before',
      'study_frequency_days',
      'study_session_minutes',
      'study_time',
    ])
  })

  it('valida enteros dentro de un rango', () => {
    expect(isIntegerInRange('7', 0, 365)).toBe(true)
    expect(isIntegerInRange(' 7 ', 0, 365)).toBe(true)
    expect(isIntegerInRange('7.5', 0, 365)).toBe(false)
    expect(isIntegerInRange('-1', 0, 365)).toBe(false)
    expect(isIntegerInRange('', 0, 365)).toBe(false)
  })
})

describe('formulario de examen', () => {
  it('sin plan, los cuatro campos del plan van vacíos', () => {
    expect(toExamPayload({ ...validForm, location: '', duration_minutes: '' }, TZ)).toEqual({
      subject_id: 'subject-1',
      title: 'Parcial 1',
      description: null,
      exam_at: '2026-11-20T11:00:00.000Z',
      duration_minutes: null,
      location: null,
      study_days_before: null,
      study_frequency_days: null,
      study_session_minutes: null,
      study_time: null,
      node_id: null,
    })
  })

  it('con plan, los cuatro campos van completos', () => {
    const payload = toExamPayload(
      {
        ...validForm,
        duration_minutes: '90',
        location: 'Aula 12',
        plan_enabled: true,
        study_days_before: '5',
        study_frequency_days: '2',
        study_session_minutes: '60',
        study_time: '19:30',
      },
      TZ,
    )

    expect(payload).toMatchObject({
      duration_minutes: 90,
      location: 'Aula 12',
      study_days_before: 5,
      study_frequency_days: 2,
      study_session_minutes: 60,
      study_time: '19:30',
    })
  })

  it('carga un examen existente con su fecha, hora y plan', () => {
    const exam = makeExam({
      study_days_before: 5,
      study_frequency_days: 2,
      study_session_minutes: 60,
      study_time: '19:30:00',
    })

    expect(examToFormValues(exam, TZ)).toMatchObject({
      exam_date: '2026-11-20',
      exam_time: '08:00',
      duration_minutes: '90',
      location: 'Aula 12',
      plan_enabled: true,
      study_days_before: '5',
      study_frequency_days: '2',
      study_session_minutes: '60',
      study_time: '19:30',
    })
  })

  it('un examen sin plan abre el formulario con el plan apagado y valores sugeridos', () => {
    expect(
      examToFormValues(makeExam({ duration_minutes: null, location: null }), TZ),
    ).toMatchObject({
      duration_minutes: '',
      location: '',
      plan_enabled: false,
      study_days_before: '7',
      study_time: '18:00',
    })
  })

  it('la vista previa solo existe cuando el plan está completo y es válido', () => {
    expect(formValuesToStudyPlan(validForm)).toBeNull()
    expect(formValuesToStudyPlan({ ...validForm, plan_enabled: true })).toEqual({
      daysBefore: 7,
      frequencyDays: 1,
      sessionMinutes: 45,
      time: '18:00',
    })
    expect(
      formValuesToStudyPlan({ ...validForm, plan_enabled: true, study_frequency_days: '' }),
    ).toBeNull()
  })
})

describe('getExamCountdown', () => {
  const options = { timeZone: TZ, now: NOW }

  it('siempre devuelve un texto', () => {
    expect(
      getExamCountdown(makeExam({ exam_at: zonedToUtcIso('2026-11-12', '18:00', TZ) }), options)
        .label,
    ).toBe('Hoy')
    expect(
      getExamCountdown(makeExam({ exam_at: zonedToUtcIso('2026-11-13', '08:00', TZ) }), options)
        .label,
    ).toBe('Mañana')
    expect(getExamCountdown(makeExam(), options)).toMatchObject({
      kind: 'upcoming',
      days: 8,
      label: 'En 8 días',
    })
    expect(
      getExamCountdown(makeExam({ exam_at: zonedToUtcIso('2026-11-12', '08:00', TZ) }), options)
        .label,
    ).toBe('Ya pasó')
  })
})

describe('guardado de exámenes y sesiones de estudio', () => {
  const inTenDays = new Date(Date.now() + 10 * DAY_MS).toISOString()
  const plan = {
    study_days_before: 3,
    study_frequency_days: 1,
    study_session_minutes: 45,
    study_time: '18:00',
  }

  function sessionCalls() {
    return harness.state.calls.filter((call) => call.table === 'study_sessions')
  }

  beforeEach(() => {
    harness.state.calls = []
    harness.state.examRow = null
    harness.state.existingSessions = []
    harness.state.insertSessionsError = null
  })

  it('un examen sin plan no toca las sesiones de estudio', async () => {
    harness.state.examRow = makeExam({ exam_at: inTenDays })

    const result = await createExam('user-1', toExamPayload(validForm, TZ), TZ)

    expect(result.plan).toBeNull()
    expect(sessionCalls()).toEqual([])
  })

  it('un examen con plan guarda sus sesiones a nombre del usuario', async () => {
    harness.state.examRow = makeExam({ exam_at: inTenDays, ...plan })

    const result = await createExam('user-1', toExamPayload(validForm, TZ), TZ)
    const insert = sessionCalls().find((call) => call.action === 'insert')
    const rows = insert?.payload as Array<Record<string, unknown>>

    expect(result.plan?.planned).toBeGreaterThanOrEqual(3)
    expect(result.plan?.created).toBe(rows.length)
    expect(rows.every((row) => row.user_id === 'user-1' && row.exam_id === 'exam-1')).toBe(true)
    expect(rows.every((row) => row.duration_minutes === 45)).toBe(true)
    expect(sessionCalls().some((call) => call.action === 'delete')).toBe(false)
  })

  it('editar sin cambiar la fecha ni el plan no regenera las sesiones', async () => {
    const previous = makeExam({ exam_at: inTenDays, ...plan })
    harness.state.examRow = { ...previous, title: 'Parcial 1 (aula nueva)' }

    const result = await updateExam('user-1', previous, toExamPayload(validForm, TZ), TZ)

    expect(result.plan).toBeNull()
    expect(sessionCalls()).toEqual([])
  })

  it('al mover el examen borra solo las sesiones futuras programadas y vuelve a generar', async () => {
    const previous = makeExam({ exam_at: inTenDays, ...plan })
    const future = new Date(Date.now() + 8 * DAY_MS).toISOString()
    harness.state.examRow = {
      ...previous,
      exam_at: new Date(Date.now() + 12 * DAY_MS).toISOString(),
    }
    harness.state.existingSessions = [
      { scheduled_at: future, status: 'scheduled' },
      { scheduled_at: new Date(Date.now() - DAY_MS).toISOString(), status: 'completed' },
    ]

    const result = await updateExam('user-1', previous, toExamPayload(validForm, TZ), TZ)
    const remove = sessionCalls().find((call) => call.action === 'delete')

    expect(remove?.filters).toEqual(
      expect.arrayContaining([
        ['eq', 'user_id', 'user-1'],
        ['eq', 'exam_id', 'exam-1'],
        ['eq', 'status', 'scheduled'],
      ]),
    )
    expect(
      remove?.filters.some(([operator, column]) => operator === 'gt' && column === 'scheduled_at'),
    ).toBe(true)
    expect(result.plan?.created).toBeGreaterThanOrEqual(3)
  })

  it('al quitar el plan borra las sesiones futuras y no crea ninguna', async () => {
    const previous = makeExam({ exam_at: inTenDays, ...plan })
    harness.state.examRow = makeExam({ exam_at: inTenDays })
    harness.state.existingSessions = [
      { scheduled_at: new Date(Date.now() + 8 * DAY_MS).toISOString(), status: 'scheduled' },
    ]

    const result = await updateExam('user-1', previous, toExamPayload(validForm, TZ), TZ)

    expect(result.plan).toBeNull()
    expect(sessionCalls().some((call) => call.action === 'delete')).toBe(true)
    expect(sessionCalls().some((call) => call.action === 'insert')).toBe(false)
  })

  it('si falla el guardado de las sesiones, el error llega a la pantalla', async () => {
    harness.state.examRow = makeExam({ exam_at: inTenDays, ...plan })
    harness.state.insertSessionsError = { code: '23505', message: 'duplicate key value' }

    await expect(createExam('user-1', toExamPayload(validForm, TZ), TZ)).rejects.toMatchObject({
      code: '23505',
    })
  })
})
