import { z } from 'zod'
import { isHexColor } from '@/lib/colors'
import { isIsoDate } from '@/lib/dates'
import { isTimeValue } from '@/lib/datetime'

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Poné un título para la tarea.')
    .max(160, 'El título no puede superar los 160 caracteres.'),
  description: z.string().trim().max(4000, 'La descripción no puede superar los 4000 caracteres.'),
  subject_id: z.string().min(1, 'Elegí una asignatura.'),
  kind: z.enum(['task', 'project']),
  status: z.enum(['pending', 'waiting', 'done']),
  due_date: z
    .string()
    .min(1, 'Elegí la fecha límite.')
    .refine(isIsoDate, 'La fecha límite no es válida.'),
  due_time: z.string().refine(isTimeValue, 'La hora no es válida.'),
  // Vacío = sin tema. El tema tiene que ser de la misma asignatura.
  node_id: z.string(),
  // Vacío significa «usar el color de la asignatura».
  color_hex: z
    .string()
    .refine((value) => value === '' || isHexColor(value), 'El color no es válido.'),
})

export type TaskFormInput = z.infer<typeof taskFormSchema>
