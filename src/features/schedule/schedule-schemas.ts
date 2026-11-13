import { z } from 'zod'
import { isTimeValue } from '@/lib/datetime'
import { timeToMinutes } from './schedule-utils'

export const scheduleFormSchema = z
  .object({
    entry_type: z.enum(['class', 'break', 'activity', 'other']),
    // Vacío = sin asignatura (solo para descansos, actividades y otros).
    subject_id: z.string(),
    title: z.string().trim().max(120, 'El nombre no puede superar los 120 caracteres.'),
    /** Al crear se pueden elegir varios días: se guarda un bloque por día. */
    weekdays: z.array(z.number().int().min(1).max(7)).min(1, 'Elegí al menos un día.'),
    starts_at: z.string().refine(isTimeValue, 'Indicá la hora de inicio.'),
    ends_at: z.string().refine(isTimeValue, 'Indicá la hora de fin.'),
    location: z.string().trim().max(160, 'El lugar no puede superar los 160 caracteres.'),
    notes: z.string().trim().max(2000, 'Las notas no pueden superar los 2000 caracteres.'),
  })
  .superRefine((data, context) => {
    if (data.entry_type === 'class' && !data.subject_id) {
      context.addIssue({
        code: 'custom',
        path: ['subject_id'],
        message: 'Una clase necesita su asignatura.',
      })
    }

    // Sin asignatura, el nombre es lo único que identifica al bloque.
    if (!data.subject_id && data.title.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['title'],
        message: 'Poné un nombre para el bloque.',
      })
    }

    if (
      isTimeValue(data.starts_at) &&
      isTimeValue(data.ends_at) &&
      timeToMinutes(data.ends_at) <= timeToMinutes(data.starts_at)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['ends_at'],
        message: 'La hora de fin debe ser posterior a la de inicio.',
      })
    }
  })

export type ScheduleFormInput = z.infer<typeof scheduleFormSchema>
