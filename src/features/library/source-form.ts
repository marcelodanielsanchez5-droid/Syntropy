import { z } from 'zod'
import type { Source, SourceType } from '@/types/database'
import { MAX_TAGS, isHttpUrl, parseTags, sourceTypeForUrl } from './library-rules'
import type { SourceFields } from './library-service'

export const sourceFormSchema = z
  .object({
    mode: z.enum(['file', 'link']),
    // En modo archivo puede quedar vacío: se usa el nombre del archivo.
    title: z.string().trim().max(200, 'El título no puede superar los 200 caracteres.'),
    description: z
      .string()
      .trim()
      .max(2000, 'La descripción no puede superar los 2000 caracteres.'),
    subject_id: z.string().min(1, 'Elegí una asignatura.'),
    node_id: z.string(),
    task_id: z.string(),
    source_type: z.enum(['document', 'book', 'link', 'video', 'image', 'audio', 'other']),
    url: z.string().trim(),
    tagsText: z.string().max(1000, 'Demasiadas etiquetas.'),
  })
  .superRefine((data, context) => {
    if (data.mode === 'link') {
      if (!isHttpUrl(data.url)) {
        context.addIssue({
          code: 'custom',
          path: ['url'],
          message: 'Pegá un enlace completo, que empiece con https://',
        })
      }

      if (data.title.length === 0) {
        context.addIssue({
          code: 'custom',
          path: ['title'],
          message: 'Poné un título para el enlace.',
        })
      }
    }

    if (data.tagsText.split(',').filter((tag) => tag.trim()).length > MAX_TAGS) {
      context.addIssue({
        code: 'custom',
        path: ['tagsText'],
        message: `Hasta ${MAX_TAGS} etiquetas.`,
      })
    }
  })

export type SourceFormInput = z.infer<typeof sourceFormSchema>

export function emptySourceFormValues({
  subjectId = '',
  nodeId = '',
  taskId = '',
  mode = 'file',
}: {
  subjectId?: string
  nodeId?: string
  taskId?: string
  mode?: 'file' | 'link'
} = {}): SourceFormInput {
  return {
    mode,
    title: '',
    description: '',
    subject_id: subjectId,
    node_id: nodeId,
    task_id: taskId,
    source_type: mode === 'link' ? 'link' : 'document',
    url: '',
    tagsText: '',
  }
}

export function sourceToFormValues(source: Source): SourceFormInput {
  return {
    mode: source.external_url ? 'link' : 'file',
    title: source.title,
    description: source.description ?? '',
    subject_id: source.subject_id,
    node_id: source.node_id ?? '',
    task_id: source.task_id ?? '',
    source_type: source.source_type,
    url: source.external_url ?? '',
    tagsText: source.tags.join(', '),
  }
}

/** Campos comunes listos para guardar. `fallbackTitle` es el nombre del archivo. */
export function toSourceFields(values: SourceFormInput, fallbackTitle = ''): SourceFields {
  return {
    subject_id: values.subject_id,
    node_id: values.node_id || null,
    task_id: values.task_id || null,
    title: (values.title || fallbackTitle).slice(0, 200),
    description: values.description || null,
    source_type: values.source_type as SourceType,
    tags: parseTags(values.tagsText),
  }
}

/** Tipo sugerido al pegar un enlace, salvo que ya se haya elegido otro a mano. */
export function suggestedLinkType(url: string, current: SourceType, touched: boolean): SourceType {
  return touched ? current : sourceTypeForUrl(url)
}
