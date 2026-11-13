import type { Assessment } from '@/types/database'
import {
  effectiveWeights,
  formatNumber,
  gradeStatus,
  isGraded,
  nextPendingAssessment,
  requiredScore,
  rulesScale,
  totalWeight,
  weightedAverage,
  weightsSumTo100,
  type Average,
  type GradingRules,
  type Requirement,
  type SubjectGradeStatus,
} from './grade-math'

export interface SubjectGradeSummary {
  assessments: Assessment[]
  average: Average | null
  status: SubjectGradeStatus
  gradedCount: number
  pendingCount: number
  next: Assessment | null
  requirement: Requirement
  weights: Map<string, number>
  totalWeight: number
  weightsSumTo100: boolean
}

/** Todo lo que muestra la pantalla de una materia, calculado en un solo lugar. */
export function summarizeSubject(
  assessments: Assessment[],
  rules: GradingRules,
): SubjectGradeSummary {
  const scale = rulesScale(rules)
  const graded = assessments.filter(isGraded)
  const average = weightedAverage(graded, scale)
  const next = nextPendingAssessment(assessments)

  return {
    assessments,
    average,
    status: gradeStatus(average, rules),
    gradedCount: graded.length,
    pendingCount: assessments.length - graded.length,
    next,
    requirement: requiredScore({
      graded,
      nextWeight: next ? Number(next.weight) : null,
      target: Number(rules.passing_score),
      scale,
    }),
    weights: effectiveWeights(assessments),
    totalWeight: totalWeight(assessments),
    weightsSumTo100: assessments.length === 0 || weightsSumTo100(assessments),
  }
}

/** Mensaje de la tarjeta «¿Qué necesito?», con los textos del documento de diseño. */
export function describeRequirement(
  summary: Pick<SubjectGradeSummary, 'requirement' | 'next'>,
  rules: GradingRules,
): { tone: 'success' | 'info' | 'danger' | 'muted'; title: string; detail: string } {
  const { requirement, next } = summary
  const decimals = rules.rounding_decimals

  switch (requirement.kind) {
    case 'no-next':
      return {
        tone: 'muted',
        title: 'Sin evaluaciones pendientes',
        detail: 'Agregá una evaluación futura para calcular la proyección.',
      }
    case 'secured':
      return {
        tone: 'success',
        title: 'Ya tenés asegurada la aprobación',
        detail: `Aunque saques la nota mínima en «${next?.title ?? 'la próxima'}», llegás a ${formatNumber(Number(rules.passing_score), decimals)}.`,
      }
    case 'impossible':
      return {
        tone: 'danger',
        title: 'No alcanza con la próxima evaluación',
        detail: `Con el peso de «${next?.title ?? 'la próxima'}» no es posible llegar a ${formatNumber(Number(rules.passing_score), decimals)}. Harían falta más evaluaciones o recuperatorios.`,
      }
    case 'needed':
      return {
        tone: 'info',
        title: `Necesitás ${formatNumber(requirement.score, decimals)}`,
        detail: `en «${next?.title ?? 'la próxima evaluación'}» para llegar a ${formatNumber(Number(rules.passing_score), decimals)}.`,
      }
  }
}
