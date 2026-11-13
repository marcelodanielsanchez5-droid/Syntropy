import { z } from 'zod'
import { isIsoDate } from '@/lib/dates'
import { isTimeValue } from '@/lib/datetime'
import { STUDY_PLAN_LIMITS, isIntegerInRange } from './study-plan'

// Vive en study-plan.ts (sin zod) para que la campana de avisos no cargue zod.
export { isIntegerInRange } from './study-plan'

const { daysBefore, frequencyDays, sessionMinutes } = STUDY_PLAN_LIMITS

export const examFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Poné un título para el examen.')
      .max(160, 'El título no puede superar los 160 caracteres.'),
    description: z
      .string()
      .trim()
      .max(4000, 'La descripción no puede superar los 4000 caracteres.'),
    subject_id: z.string().min(1, 'Elegí una asignatura.'),
    exam_date: z
      .string()
      .min(1, 'Elegí la fecha del examen.')
      .refine(isIsoDate, 'La fecha del examen no es válida.'),
    exam_time: z
      .string()
      .min(1, 'Indicá la hora del examen.')
      .refine(isTimeValue, 'La hora no es válida.'),
    // Vacío significa «sin duración definida».
    duration_minutes: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || isIntegerInRange(value, 1, 1440),
        'La duración debe estar entre 1 y 1440 minutos.',
      ),
    location: z.string().trim().max(160, 'El lugar no puede superar los 160 caracteres.'),
    plan_enabled: z.boolean(),
    study_days_before: z.string().trim(),
    study_frequency_days: z.string().trim(),
    study_session_minutes: z.string().trim(),
    study_time: z.string(),
    // Vacío = sin tema.
    node_id: z.string(),
  })
  .superRefine((data, context) => {
    // El plan de estudio va completo o no va: es la misma regla de la base.
    if (!data.plan_enabled) {
      return
    }

    if (!isIntegerInRange(data.study_days_before, daysBefore.min, daysBefore.max)) {
      context.addIssue({
        code: 'custom',
        path: ['study_days_before'],
        message: `Indicá cuántos días antes empezar (${daysBefore.min} a ${daysBefore.max}).`,
      })
    }

    if (!isIntegerInRange(data.study_frequency_days, frequencyDays.min, frequencyDays.max)) {
      context.addIssue({
        code: 'custom',
        path: ['study_frequency_days'],
        message: `La frecuencia debe estar entre ${frequencyDays.min} y ${frequencyDays.max} días.`,
      })
    }

    if (!isIntegerInRange(data.study_session_minutes, sessionMinutes.min, sessionMinutes.max)) {
      context.addIssue({
        code: 'custom',
        path: ['study_session_minutes'],
        message: `Cada sesión debe durar entre ${sessionMinutes.min} y ${sessionMinutes.max} minutos.`,
      })
    }

    if (!isTimeValue(data.study_time)) {
      context.addIssue({
        code: 'custom',
        path: ['study_time'],
        message: 'Indicá a qué hora preferís estudiar.',
      })
    }
  })

export type ExamFormInput = z.infer<typeof examFormSchema>
