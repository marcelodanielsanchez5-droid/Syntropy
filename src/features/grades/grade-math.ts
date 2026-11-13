import type { Assessment, GradingSettings } from '@/types/database'

/**
 * Cálculos de calificaciones (documento de modelo de datos, sección 5).
 *
 * - Cada evaluación conserva su escala: se convierte a porcentaje con la suya.
 * - Los pesos son relativos: no hace falta que sumen 100.
 * - El promedio se muestra en la escala actual del usuario.
 * - Se redondea solo para mostrar; los cálculos conservan la precisión.
 */

export interface Scale {
  min: number
  max: number
}

export type GradingRules = Pick<
  GradingSettings,
  'scale_min' | 'scale_max' | 'passing_score' | 'rounding_decimals'
>

export const DEFAULT_GRADING_RULES: GradingRules = {
  scale_min: 1,
  scale_max: 10,
  passing_score: 6,
  rounding_decimals: 1,
}

type ScoredFields = Pick<Assessment, 'score' | 'scale_min' | 'scale_max' | 'weight'>

/** Porcentaje (0–100) de una nota dentro de su escala. */
export function toPercent(score: number, scale: Scale): number {
  return ((score - scale.min) / (scale.max - scale.min)) * 100
}

/** Nota en una escala a partir de un porcentaje (0–100). */
export function fromPercent(percent: number, scale: Scale): number {
  return scale.min + ((scale.max - scale.min) * percent) / 100
}

export function rulesScale(rules: GradingRules): Scale {
  return { min: Number(rules.scale_min), max: Number(rules.scale_max) }
}

function assessmentScale(assessment: ScoredFields): Scale {
  return { min: Number(assessment.scale_min), max: Number(assessment.scale_max) }
}

export function isGraded<T extends Pick<Assessment, 'score'>>(
  assessment: T,
): assessment is T & { score: number } {
  return assessment.score !== null && assessment.score !== undefined
}

/** Porcentaje de una evaluación con nota, o `null` si todavía no tiene. */
export function assessmentPercent(assessment: ScoredFields): number | null {
  return isGraded(assessment)
    ? toPercent(Number(assessment.score), assessmentScale(assessment))
    : null
}

export interface WeightedTotals {
  /** Σ(peso × porcentaje) de las evaluaciones con nota. */
  weightedPercent: number
  /** Σ(peso) de las evaluaciones con nota. */
  gradedWeight: number
  gradedCount: number
}

export function weightedTotals(assessments: ScoredFields[]): WeightedTotals {
  let weightedPercent = 0
  let gradedWeight = 0
  let gradedCount = 0

  for (const assessment of assessments) {
    const percent = assessmentPercent(assessment)

    if (percent === null) {
      continue
    }

    const weight = Number(assessment.weight)
    weightedPercent += weight * percent
    gradedWeight += weight
    gradedCount += 1
  }

  return { weightedPercent, gradedWeight, gradedCount }
}

export interface Average {
  /** Promedio ponderado en porcentaje (0–100). */
  percent: number
  /** El mismo promedio en la escala actual. */
  score: number
  gradedCount: number
}

/** Promedio ponderado de las evaluaciones con nota, o `null` si no hay ninguna. */
export function weightedAverage(assessments: ScoredFields[], scale: Scale): Average | null {
  const { weightedPercent, gradedWeight, gradedCount } = weightedTotals(assessments)

  if (gradedCount === 0 || gradedWeight <= 0) {
    return null
  }

  const percent = weightedPercent / gradedWeight

  return { percent, score: fromPercent(percent, scale), gradedCount }
}

export type Requirement =
  | { kind: 'no-next' }
  | { kind: 'secured'; score: number; percent: number }
  | { kind: 'needed'; score: number; percent: number }
  | { kind: 'impossible'; score: number; percent: number }

/**
 * Nota necesaria en la próxima evaluación para llegar al objetivo
 * (por defecto, la nota de aprobación), en la escala actual.
 */
export function requiredScore({
  graded,
  nextWeight,
  target,
  scale,
}: {
  graded: ScoredFields[]
  /** Peso de la próxima evaluación; `null` si no hay ninguna cargada. */
  nextWeight: number | null
  target: number
  scale: Scale
}): Requirement {
  if (nextWeight === null || nextWeight <= 0) {
    return { kind: 'no-next' }
  }

  const { weightedPercent, gradedWeight } = weightedTotals(graded)
  const targetPercent = toPercent(target, scale)
  const percent = (targetPercent * (gradedWeight + nextWeight) - weightedPercent) / nextWeight
  const score = fromPercent(percent, scale)

  if (score <= scale.min) {
    return { kind: 'secured', score, percent }
  }

  if (score > scale.max) {
    return { kind: 'impossible', score, percent }
  }

  return { kind: 'needed', score, percent }
}

/**
 * Próxima evaluación sin nota: la de fecha más cercana; las que no tienen
 * fecha van al final, en el orden en que se cargaron.
 */
export function nextPendingAssessment<
  T extends Pick<Assessment, 'score' | 'assessed_on' | 'created_at'>,
>(assessments: T[]): T | null {
  const pending = assessments.filter((assessment) => !isGraded(assessment))

  pending.sort((a, b) => {
    if (a.assessed_on && b.assessed_on && a.assessed_on !== b.assessed_on) {
      return a.assessed_on < b.assessed_on ? -1 : 1
    }

    if (a.assessed_on && !b.assessed_on) {
      return -1
    }

    if (!a.assessed_on && b.assessed_on) {
      return 1
    }

    return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0
  })

  return pending[0] ?? null
}

/** Peso efectivo de cada evaluación: su peso sobre el total de la asignatura (0–1). */
export function effectiveWeights<T extends Pick<Assessment, 'id' | 'weight'>>(
  assessments: T[],
): Map<string, number> {
  const total = totalWeight(assessments)

  return new Map(
    assessments.map((assessment) => [
      assessment.id,
      total > 0 ? Number(assessment.weight) / total : 0,
    ]),
  )
}

export function totalWeight(assessments: Array<Pick<Assessment, 'weight'>>): number {
  return assessments.reduce((sum, assessment) => sum + Number(assessment.weight), 0)
}

/** D3: la interfaz advierte cuando los pesos no suman 100. */
export function weightsSumTo100(assessments: Array<Pick<Assessment, 'weight'>>): boolean {
  return Math.abs(totalWeight(assessments) - 100) < 0.005
}

/**
 * Aporte de una evaluación a la nota final, en la escala actual: peso
 * efectivo × nota convertida. Con todas las notas cargadas, la suma de los
 * aportes es el promedio final.
 */
export function contribution(
  assessment: ScoredFields,
  effectiveWeight: number,
  scale: Scale,
): number | null {
  const percent = assessmentPercent(assessment)

  return percent === null ? null : effectiveWeight * fromPercent(percent, scale)
}

export type SubjectGradeStatus = 'no-data' | 'passing' | 'failing'

export function gradeStatus(average: Average | null, rules: GradingRules): SubjectGradeStatus {
  if (!average) {
    return 'no-data'
  }

  // Se compara con el valor redondeado que ve el usuario: un 5,96 que se
  // muestra como 6,0 con un decimal cuenta como aprobado.
  return roundTo(average.score, rules.rounding_decimals) >= Number(rules.passing_score)
    ? 'passing'
    : 'failing'
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/** Número en formato español: coma decimal y la cantidad de decimales indicada. */
export function formatNumber(value: number, decimals: number): string {
  return new Intl.NumberFormat('es', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(roundTo(value, decimals))
}

/** Números de escala o peso sin ceros de más: «10», «7,5», «0,25». */
export function formatPlain(value: number): string {
  return new Intl.NumberFormat('es', { maximumFractionDigits: 2, useGrouping: false }).format(
    Number(value),
  )
}

/** «Escala 1–10 · aprueba 6» */
export function scaleLabel(rules: GradingRules): string {
  return `Escala ${formatPlain(rules.scale_min)}–${formatPlain(rules.scale_max)} · aprueba ${formatPlain(rules.passing_score)}`
}

export function formatPercent(fraction: number): string {
  return `${formatPlain(roundTo(fraction * 100, 1))} %`
}

/** Acepta «7,5» y «7.5». Devuelve `null` si el texto no es un número. */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.')

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null
  }

  return Number(normalized)
}
