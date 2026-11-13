import { z } from 'zod'
import { isIsoDate } from '@/lib/dates'
import { formatPlain, parseDecimal, type Scale } from './grade-math'

/** Límite de `numeric(6,2)` y `numeric(7,2)` en la base. */
const SCALE_LIMIT = 9999.99
const WEIGHT_LIMIT = 99999.99

function hasAtMostTwoDecimals(value: string): boolean {
  return /^-?\d+([.,]\d{1,2})?$/.test(value.trim())
}

export const gradingSettingsSchema = z
  .object({
    scale_min: z.string(),
    scale_max: z.string(),
    passing_score: z.string(),
    rounding_decimals: z.enum(['0', '1', '2']),
  })
  .superRefine((data, context) => {
    const values = {
      scale_min: parseDecimal(data.scale_min),
      scale_max: parseDecimal(data.scale_max),
      passing_score: parseDecimal(data.passing_score),
    }

    for (const [field, value] of Object.entries(values)) {
      const text = data[field as keyof typeof values]

      if (value === null || !hasAtMostTwoDecimals(text) || value < 0 || value > SCALE_LIMIT) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: 'Usá un número entre 0 y 9999, con hasta dos decimales.',
        })
      }
    }

    const { scale_min: min, scale_max: max, passing_score: passing } = values

    if (min !== null && max !== null && max <= min) {
      context.addIssue({
        code: 'custom',
        path: ['scale_max'],
        message: 'La nota máxima debe ser mayor que la mínima.',
      })
    }

    if (
      min !== null &&
      max !== null &&
      passing !== null &&
      max > min &&
      (passing < min || passing > max)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['passing_score'],
        message: 'La nota para aprobar debe estar dentro de la escala.',
      })
    }
  })

export type GradingSettingsFormInput = z.infer<typeof gradingSettingsSchema>

/**
 * El esquema de una evaluación depende de su escala: la de la evaluación si
 * ya existe, o la escala actual si es nueva.
 */
export function makeAssessmentSchema(scale: Scale) {
  return z
    .object({
      title: z
        .string()
        .trim()
        .min(1, 'Poné un nombre para la evaluación.')
        .max(160, 'El nombre no puede superar los 160 caracteres.'),
      subject_id: z.string().min(1, 'Elegí una asignatura.'),
      assessed_on: z
        .string()
        .refine((value) => value === '' || isIsoDate(value), 'La fecha no es válida.'),
      // Vacío = todavía no tiene nota.
      score: z.string().trim(),
      weight: z.string().trim(),
      notes: z.string().trim().max(2000, 'Las notas no pueden superar los 2000 caracteres.'),
      // Vacío = sin tema. Las notas vinculadas definen el contorno del nodo.
      node_id: z.string(),
    })
    .superRefine((data, context) => {
      if (data.score !== '') {
        const score = parseDecimal(data.score)

        if (score === null || !hasAtMostTwoDecimals(data.score)) {
          context.addIssue({
            code: 'custom',
            path: ['score'],
            message: 'Escribí la nota como número, con hasta dos decimales.',
          })
        } else if (score < scale.min || score > scale.max) {
          context.addIssue({
            code: 'custom',
            path: ['score'],
            message: `La nota debe estar entre ${formatPlain(scale.min)} y ${formatPlain(scale.max)}.`,
          })
        }
      }

      const weight = parseDecimal(data.weight)

      if (
        weight === null ||
        !hasAtMostTwoDecimals(data.weight) ||
        weight <= 0 ||
        weight > WEIGHT_LIMIT
      ) {
        context.addIssue({
          code: 'custom',
          path: ['weight'],
          message: 'El peso debe ser un número mayor que 0.',
        })
      }
    })
}

export type AssessmentFormInput = z.infer<ReturnType<typeof makeAssessmentSchema>>
