import type { Source, SourceType } from '@/types/database'

/**
 * Reglas de la biblioteca (Fase 6). Los límites por usuario tienen que
 * coincidir con `public.library_limits()` de la migración 004: la base es la
 * que los hace cumplir; acá se usan para avisar antes de subir.
 */
export const FILE_MAX_BYTES = 25 * 1024 * 1024
export const LIBRARY_MAX_BYTES = 200 * 1024 * 1024
export const LIBRARY_MAX_SOURCES = 1000
export const MAX_TAGS = 20
export const MAX_TAG_LENGTH = 40

/** Los mismos tipos que acepta el bucket `academic-files`. */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'video/mp4',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

export const SOURCE_TYPES: SourceType[] = [
  'document',
  'book',
  'link',
  'video',
  'image',
  'audio',
  'other',
]

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  document: 'Documento',
  book: 'Libro',
  link: 'Enlace',
  video: 'Video',
  image: 'Imagen',
  audio: 'Audio',
  other: 'Otro',
}

export function sourceTypeForMime(mime: string): SourceType {
  if (mime.startsWith('image/')) {
    return 'image'
  }

  if (mime.startsWith('audio/')) {
    return 'audio'
  }

  if (mime.startsWith('video/')) {
    return 'video'
  }

  return 'document'
}

/** Tipo sugerido para un enlace según su dirección. */
export function sourceTypeForUrl(url: string): SourceType {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')

    if (/(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/.test(host)) {
      return 'video'
    }

    if (/\.pdf($|\?)/i.test(url)) {
      return 'document'
    }
  } catch {
    // Dirección inválida: la valida el formulario.
  }

  return 'link'
}

/** Nombre de archivo seguro para la ruta de Storage. */
export function safeFileName(name: string): string {
  const cleaned = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return cleaned.slice(-80) || 'archivo'
}

/** Título sugerido a partir del nombre del archivo, sin la extensión. */
export function titleFromFileName(name: string): string {
  const base = name
    .replace(/\.[A-Za-z0-9]{1,5}$/, '')
    .replace(/[_]+/g, ' ')
    .trim()
  return (base || name).slice(0, 200)
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

/** «etiqueta, otra , otra» → ['etiqueta', 'otra'] sin repetir ni vacías. */
export function parseTags(text: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []

  for (const raw of text.split(',')) {
    const tag = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH)
    const key = tag.toLowerCase()

    if (tag && !seen.has(key)) {
      seen.add(key)
      tags.push(tag)
    }
  }

  return tags.slice(0, MAX_TAGS)
}

export function storageUsed(sources: Array<Pick<Source, 'size_bytes'>>): number {
  return sources.reduce((sum, source) => sum + (source.size_bytes ?? 0), 0)
}

export type UploadCheck =
  { ok: true } | { ok: false; reason: 'type' | 'size' | 'quota' | 'count'; message: string }

/** Revisa un archivo antes de subirlo, con los mismos límites que la base y el bucket. */
export function checkUpload(
  file: Pick<File, 'type' | 'size'>,
  { usedBytes, sourceCount }: { usedBytes: number; sourceCount: number },
): UploadCheck {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      ok: false,
      reason: 'type',
      message:
        'Ese tipo de archivo no se puede subir. Usá PDF, Word, PowerPoint, texto, imagen, audio o video MP4.',
    }
  }

  if (file.size > FILE_MAX_BYTES) {
    return { ok: false, reason: 'size', message: 'El archivo no puede superar los 25 MB.' }
  }

  if (sourceCount >= LIBRARY_MAX_SOURCES) {
    return {
      ok: false,
      reason: 'count',
      message: 'Llegaste al máximo de 1000 fuentes en la biblioteca.',
    }
  }

  if (usedBytes + file.size > LIBRARY_MAX_BYTES) {
    return {
      ok: false,
      reason: 'quota',
      message: `No hay espacio: te quedan ${formatBytes(LIBRARY_MAX_BYTES - usedBytes)} de ${formatBytes(LIBRARY_MAX_BYTES)}. Borrá archivos que ya no uses.`,
    }
  }

  return { ok: true }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${Math.max(0, Math.round(bytes))} B`
  }

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }

  return `${new Intl.NumberFormat('es', { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value)} ${units[unit]}`
}

export interface LibraryFilters {
  query: string
  subjectId: string
  type: 'all' | SourceType
  /** 'all', 'none' (sin tema) o el id de un nodo. */
  nodeId: string
  /** 'all', 'none' (sin tarea) o el id de una tarea. */
  taskId: string
}

export const EMPTY_FILTERS: LibraryFilters = {
  query: '',
  subjectId: 'all',
  type: 'all',
  nodeId: 'all',
  taskId: 'all',
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Búsqueda por título, descripción y etiquetas (sin distinguir tildes) y filtros. */
export function filterSources(sources: Source[], filters: LibraryFilters): Source[] {
  const terms = normalize(filters.query).split(/\s+/).filter(Boolean)

  return sources.filter((source) => {
    if (filters.subjectId !== 'all' && source.subject_id !== filters.subjectId) {
      return false
    }

    if (filters.type !== 'all' && source.source_type !== filters.type) {
      return false
    }

    if (
      filters.nodeId === 'none'
        ? source.node_id !== null
        : filters.nodeId !== 'all' && source.node_id !== filters.nodeId
    ) {
      return false
    }

    if (
      filters.taskId === 'none'
        ? source.task_id !== null
        : filters.taskId !== 'all' && source.task_id !== filters.taskId
    ) {
      return false
    }

    if (terms.length === 0) {
      return true
    }

    const haystack = normalize([source.title, source.description ?? '', ...source.tags].join(' '))
    return terms.every((term) => haystack.includes(term))
  })
}

export function activeFilterCount(filters: LibraryFilters): number {
  return (['subjectId', 'type', 'nodeId', 'taskId'] as const).filter(
    (key) => filters[key] !== 'all',
  ).length
}
