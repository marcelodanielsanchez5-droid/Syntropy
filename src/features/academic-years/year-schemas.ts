import { z } from 'zod'
import { isIsoDate } from '@/lib/dates'

export const academicYearSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Poné un nombre para el año de curso.')
      .max(80, 'El nombre no puede superar los 80 caracteres.'),
    starts_on: z
      .string()
      .min(1, 'Elegí la fecha de inicio.')
      .refine(isIsoDate, 'La fecha de inicio no es válida.'),
    ends_on: z
      .string()
      .min(1, 'Elegí la fecha de fin.')
      .refine(isIsoDate, 'La fecha de fin no es válida.'),
    activate: z.boolean(),
  })
  .refine((data) => data.ends_on >= data.starts_on, {
    path: ['ends_on'],
    message: 'La fecha de fin debe ser igual o posterior a la de inicio.',
  })

export type AcademicYearInput = z.infer<typeof academicYearSchema>
