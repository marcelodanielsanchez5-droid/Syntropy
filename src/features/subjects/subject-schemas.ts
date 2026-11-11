import { z } from 'zod'
import { isHexColor } from '@/lib/colors'

export const subjectFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Poné un nombre para la asignatura.')
    .max(80, 'El nombre no puede superar los 80 caracteres.'),
  color_hex: z
    .string()
    .min(1, 'Elegí un color.')
    .refine(isHexColor, 'El color no es válido.'),
  teachersText: z.string().max(500, 'La lista de docentes es demasiado larga.'),
  description: z.string().trim().max(1000, 'La descripción no puede superar los 1000 caracteres.'),
  evaluationCriteria: z
    .string()
    .trim()
    .max(2000, 'Los criterios no pueden superar los 2000 caracteres.'),
  methodology: z
    .string()
    .trim()
    .max(2000, 'La metodología no puede superar los 2000 caracteres.'),
  notes: z.string().trim().max(2000, 'Las notas no pueden superar los 2000 caracteres.'),
})

export type SubjectFormInput = z.infer<typeof subjectFormSchema>
