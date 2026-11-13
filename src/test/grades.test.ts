import { describe, expect, it } from 'vitest'
import {
  assessmentToFormValues,
  gradingSettingsToFormValues,
  toAssessmentPayload,
  toGradingSettingsPayload,
} from '@/features/grades/grade-form'
import {
  contribution,
  effectiveWeights,
  formatNumber,
  fromPercent,
  gradeStatus,
  nextPendingAssessment,
  parseDecimal,
  requiredScore,
  roundTo,
  scaleLabel,
  toPercent,
  weightedAverage,
  weightsSumTo100,
  type GradingRules,
} from '@/features/grades/grade-math'
import { gradingSettingsSchema, makeAssessmentSchema } from '@/features/grades/grade-schemas'
import { describeRequirement, summarizeSubject } from '@/features/grades/grade-summary'
import type { Assessment } from '@/types/database'

const ONE_TO_TEN = { min: 1, max: 10 }
const RULES: GradingRules = { scale_min: 1, scale_max: 10, passing_score: 6, rounding_decimals: 1 }

let sequence = 0

function assessment(overrides: Partial<Assessment> = {}): Assessment {
  sequence += 1

  return {
    id: `a-${sequence}`,
    user_id: 'user-1',
    subject_id: 'subject-1',
    node_id: null,
    title: `Evaluación ${sequence}`,
    score: null,
    scale_min: 1,
    scale_max: 10,
    weight: 1,
    assessed_on: null,
    notes: null,
    created_at: `2026-03-0${Math.min(sequence, 9)}T12:00:00.000Z`,
    updated_at: '2026-03-01T12:00:00.000Z',
    ...overrides,
  }
}

describe('porcentajes y escalas (sección 5.1)', () => {
  it('convierte notas de distintas escalas a porcentaje', () => {
    expect(toPercent(7, ONE_TO_TEN)).toBeCloseTo(66.67, 2)
    expect(toPercent(15, { min: 0, max: 20 })).toBe(75)
    expect(toPercent(82, { min: 0, max: 100 })).toBe(82)
    expect(toPercent(3.5, { min: 0, max: 5 })).toBe(70)
  })

  it('vuelve de porcentaje a nota', () => {
    expect(fromPercent(50, ONE_TO_TEN)).toBe(5.5)
    expect(fromPercent(75, { min: 0, max: 20 })).toBe(15)
  })
})

describe('casos obligatorios del documento (sección 5.4)', () => {
  it('1. Escala 1–10, pesos 30/20/25/25, notas 7,0 y 8,5', () => {
    const items = [
      assessment({ score: 7, weight: 30 }),
      assessment({ score: 8.5, weight: 20 }),
      assessment({ weight: 25, assessed_on: '2026-05-15' }),
      assessment({ weight: 25, assessed_on: '2026-06-20' }),
    ]
    const summary = summarizeSubject(items, RULES)

    expect(summary.average?.percent).toBeCloseTo(73.33, 2)
    expect(roundTo(summary.average?.score ?? 0, 1)).toBe(7.6)
    expect(summary.status).toBe('passing')
    expect(summary.next?.id).toBe(items[2].id)
    // (55,56 % × 75 − 3666,67) / 25 = 20 % → 2,8
    expect(summary.requirement.kind).toBe('needed')
    expect(roundTo((summary.requirement as { score: number }).score, 1)).toBe(2.8)
  })

  it('2. Escala 0–20, nota 15 con peso 40', () => {
    const average = weightedAverage(
      [assessment({ score: 15, scale_min: 0, scale_max: 20, weight: 40 })],
      {
        min: 0,
        max: 20,
      },
    )

    expect(average?.percent).toBe(75)
    expect(average?.score).toBe(15)
  })

  it('3. Escala 0–100, nota 82 con peso 100', () => {
    const average = weightedAverage(
      [assessment({ score: 82, scale_min: 0, scale_max: 100, weight: 100 })],
      {
        min: 0,
        max: 100,
      },
    )

    expect(average?.score).toBe(82)
  })

  it('4. Pesos que no suman 100: se normalizan y se avisa', () => {
    const items = [assessment({ score: 10, weight: 3 }), assessment({ score: 1, weight: 1 })]

    expect(weightsSumTo100(items)).toBe(false)
    expect(weightedAverage(items, ONE_TO_TEN)?.percent).toBe(75)
    expect(effectiveWeights(items).get(items[0].id)).toBe(0.75)
    expect(weightsSumTo100([assessment({ weight: 60 }), assessment({ weight: 40 })])).toBe(true)
  })

  it('5. Una evaluación futura sin nota no cambia el promedio', () => {
    const graded = assessment({ score: 8, weight: 50 })
    const withPending = [graded, assessment({ weight: 50 })]

    expect(weightedAverage(withPending, ONE_TO_TEN)).toEqual(weightedAverage([graded], ONE_TO_TEN))
    expect(summarizeSubject(withPending, RULES).pendingCount).toBe(1)
  })

  it('6. Nota necesaria mayor que la máxima: no es posible', () => {
    const result = requiredScore({
      graded: [assessment({ score: 1, weight: 90 })],
      nextWeight: 10,
      target: 6,
      scale: ONE_TO_TEN,
    })

    expect(result.kind).toBe('impossible')
  })

  it('7. Nota necesaria menor que la mínima: ya está asegurada', () => {
    const result = requiredScore({
      graded: [assessment({ score: 10, weight: 90 })],
      nextWeight: 10,
      target: 6,
      scale: ONE_TO_TEN,
    })

    expect(result.kind).toBe('secured')
  })

  it('8. Cambio de escala después de cargar notas: cada nota conserva la suya', () => {
    const oldScale = assessment({ score: 7, scale_min: 1, scale_max: 10, weight: 1 })
    const newScale = assessment({ score: 15, scale_min: 0, scale_max: 20, weight: 1 })
    const average = weightedAverage([oldScale, newScale], { min: 0, max: 20 })

    // 66,67 % y 75 % → 70,83 % → 14,17 sobre 20
    expect(average?.percent).toBeCloseTo(70.83, 2)
    expect(average?.score).toBeCloseTo(14.17, 2)
  })

  it('9. Redondeo a 0, 1 y 2 decimales', () => {
    expect(formatNumber(7.3333, 0)).toBe('7')
    expect(formatNumber(7.3333, 1)).toBe('7,3')
    expect(formatNumber(7.3333, 2)).toBe('7,33')
    expect(formatNumber(6.25, 1)).toBe('6,3')
    expect(formatNumber(8, 2)).toBe('8,00')
  })

  // El caso 10 (nodo con notas de escalas distintas) corresponde a la Fase 5.
})

describe('aprobación', () => {
  it('compara con el valor que ve el usuario', () => {
    expect(gradeStatus({ percent: 0, score: 5.96, gradedCount: 1 }, RULES)).toBe('passing')
    expect(gradeStatus({ percent: 0, score: 5.94, gradedCount: 1 }, RULES)).toBe('failing')
    expect(gradeStatus(null, RULES)).toBe('no-data')
  })

  it('el aporte de cada evaluación suma el promedio cuando están todas cargadas', () => {
    const items = [assessment({ score: 7, weight: 30 }), assessment({ score: 8.5, weight: 70 })]
    const weights = effectiveWeights(items)
    const total = items.reduce(
      (sum, item) => sum + (contribution(item, weights.get(item.id) ?? 0, ONE_TO_TEN) ?? 0),
      0,
    )

    expect(contribution(items[0], 0.3, ONE_TO_TEN)).toBeCloseTo(2.1, 5)
    expect(total).toBeCloseTo(weightedAverage(items, ONE_TO_TEN)?.score ?? 0, 5)
  })

  it('sin notas, la nota necesaria es la de aprobación', () => {
    const result = requiredScore({ graded: [], nextWeight: 30, target: 6, scale: ONE_TO_TEN })

    expect(result).toMatchObject({ kind: 'needed', score: 6 })
  })

  it('sin evaluaciones pendientes no hay proyección', () => {
    const summary = summarizeSubject([assessment({ score: 8, weight: 1 })], RULES)

    expect(summary.requirement.kind).toBe('no-next')
    expect(describeRequirement(summary, RULES).detail).toBe(
      'Agregá una evaluación futura para calcular la proyección.',
    )
  })

  it('la próxima evaluación es la de fecha más cercana; las sin fecha van al final', () => {
    const noDate = assessment({ created_at: '2026-01-01T00:00:00.000Z' })
    const later = assessment({ assessed_on: '2026-07-01' })
    const sooner = assessment({ assessed_on: '2026-06-01' })
    const graded = assessment({ score: 8, assessed_on: '2026-05-01' })

    expect(nextPendingAssessment([noDate, later, sooner, graded])?.id).toBe(sooner.id)
    expect(nextPendingAssessment([noDate])?.id).toBe(noDate.id)
    expect(nextPendingAssessment([graded])).toBeNull()
  })

  it('describe la nota necesaria en español', () => {
    const summary = summarizeSubject(
      [assessment({ score: 7, weight: 50 }), assessment({ title: 'Final', weight: 50 })],
      RULES,
    )

    expect(describeRequirement(summary, RULES)).toMatchObject({
      tone: 'info',
      title: 'Necesitás 5,0',
      detail: 'en «Final» para llegar a 6,0.',
    })
    expect(scaleLabel(RULES)).toBe('Escala 1–10 · aprueba 6')
  })
})

describe('formularios de calificaciones', () => {
  it('acepta coma o punto como separador decimal', () => {
    expect(parseDecimal('7,5')).toBe(7.5)
    expect(parseDecimal(' 7.5 ')).toBe(7.5)
    expect(parseDecimal('10')).toBe(10)
    expect(parseDecimal('siete')).toBeNull()
    expect(parseDecimal('7,5,1')).toBeNull()
    expect(parseDecimal('')).toBeNull()
  })

  const schema = makeAssessmentSchema(ONE_TO_TEN)
  const valid = {
    title: 'Parcial',
    subject_id: 's-1',
    assessed_on: '',
    score: '',
    weight: '30',
    notes: '',
    node_id: '',
  }

  it('una evaluación puede no tener nota todavía', () => {
    expect(schema.safeParse(valid).success).toBe(true)
  })

  it('la nota debe estar dentro de la escala de la evaluación', () => {
    expect(schema.safeParse({ ...valid, score: '7,25' }).success).toBe(true)
    expect(schema.safeParse({ ...valid, score: '11' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, score: '0' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, score: '7,255' }).success).toBe(false)
    expect(
      makeAssessmentSchema({ min: 0, max: 20 }).safeParse({ ...valid, score: '18' }).success,
    ).toBe(true)
  })

  it('el peso es obligatorio y mayor que cero', () => {
    expect(schema.safeParse({ ...valid, weight: '' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, weight: '0' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, weight: '0,5' }).success).toBe(true)
  })

  it('guarda la nota como número y sin nota como vacío', () => {
    expect(toAssessmentPayload({ ...valid, score: '7,5', weight: '25,5' })).toMatchObject({
      score: 7.5,
      weight: 25.5,
      assessed_on: null,
    })
    expect(toAssessmentPayload(valid).score).toBeNull()
  })

  it('muestra las cifras guardadas con coma al editar', () => {
    expect(assessmentToFormValues(assessment({ score: 7.5, weight: 30 }))).toMatchObject({
      score: '7,5',
      weight: '30',
    })
  })

  it('valida la escala: máximo mayor que mínimo y aprobación dentro', () => {
    const base = {
      scale_min: '1',
      scale_max: '10',
      passing_score: '6',
      rounding_decimals: '1' as const,
    }

    expect(gradingSettingsSchema.safeParse(base).success).toBe(true)
    expect(gradingSettingsSchema.safeParse({ ...base, scale_max: '1' }).success).toBe(false)
    expect(gradingSettingsSchema.safeParse({ ...base, passing_score: '11' }).success).toBe(false)
    expect(gradingSettingsSchema.safeParse({ ...base, scale_min: 'uno' }).success).toBe(false)
  })

  it('al guardar la escala la marca como confirmada', () => {
    const now = new Date('2026-11-13T12:00:00.000Z')
    const payload = toGradingSettingsPayload(
      { scale_min: '0', scale_max: '20', passing_score: '10', rounding_decimals: '2' },
      now,
    )

    expect(payload).toEqual({
      scale_min: 0,
      scale_max: 20,
      passing_score: 10,
      rounding_decimals: 2,
      configured_at: now.toISOString(),
    })
    expect(gradingSettingsToFormValues(RULES)).toEqual({
      scale_min: '1',
      scale_max: '10',
      passing_score: '6',
      rounding_decimals: '1',
    })
  })
})
