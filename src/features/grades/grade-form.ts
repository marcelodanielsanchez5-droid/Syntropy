import type { Assessment, GradingSettings } from '@/types/database'
import { formatPlain, parseDecimal, type GradingRules } from './grade-math'
import type { AssessmentFormInput, GradingSettingsFormInput } from './grade-schemas'

/** Las cifras se muestran con coma, como se escriben en español. */
function toInput(value: number): string {
  return formatPlain(value)
}

export function gradingSettingsToFormValues(rules: GradingRules): GradingSettingsFormInput {
  const decimals = String(Math.min(2, Math.max(0, rules.rounding_decimals)))

  return {
    scale_min: toInput(rules.scale_min),
    scale_max: toInput(rules.scale_max),
    passing_score: toInput(rules.passing_score),
    rounding_decimals: decimals as GradingSettingsFormInput['rounding_decimals'],
  }
}

export function toGradingSettingsPayload(values: GradingSettingsFormInput, now = new Date()) {
  return {
    scale_min: parseDecimal(values.scale_min) as number,
    scale_max: parseDecimal(values.scale_max) as number,
    passing_score: parseDecimal(values.passing_score) as number,
    rounding_decimals: Number(values.rounding_decimals),
    configured_at: now.toISOString(),
  } satisfies Partial<GradingSettings>
}

export function emptyAssessmentFormValues(subjectId = ''): AssessmentFormInput {
  return {
    title: '',
    subject_id: subjectId,
    assessed_on: '',
    score: '',
    weight: '',
    notes: '',
    node_id: '',
  }
}

export function assessmentToFormValues(assessment: Assessment): AssessmentFormInput {
  return {
    title: assessment.title,
    subject_id: assessment.subject_id,
    assessed_on: assessment.assessed_on ?? '',
    score: assessment.score === null ? '' : toInput(assessment.score),
    weight: toInput(assessment.weight),
    notes: assessment.notes ?? '',
    node_id: assessment.node_id ?? '',
  }
}

/** Datos editables de una evaluación. La escala se fija al crearla y no cambia después. */
export function toAssessmentPayload(values: AssessmentFormInput) {
  return {
    subject_id: values.subject_id,
    title: values.title,
    assessed_on: values.assessed_on || null,
    score: values.score === '' ? null : parseDecimal(values.score),
    weight: parseDecimal(values.weight) as number,
    notes: values.notes || null,
    node_id: values.node_id || null,
  }
}

export type AssessmentPayload = ReturnType<typeof toAssessmentPayload>
