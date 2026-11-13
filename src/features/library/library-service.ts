import { requireSupabase } from '@/lib/supabase'
import type { Source, SourceType } from '@/types/database'
import { safeFileName, sourceTypeForMime } from './library-rules'

const BUCKET = 'academic-files'

export interface SourceFields {
  subject_id: string
  node_id: string | null
  task_id: string | null
  title: string
  description: string | null
  source_type: SourceType
  tags: string[]
}

export async function listUserSources(userId: string): Promise<Source[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data.map((row) => ({
    ...row,
    size_bytes: row.size_bytes === null ? null : Number(row.size_bytes),
  }))
}

export async function createLinkSource(
  userId: string,
  fields: SourceFields & { url: string },
): Promise<Source> {
  const supabase = requireSupabase()
  const { url, ...rest } = fields
  const { data, error } = await supabase
    .from('sources')
    .insert({ user_id: userId, ...rest, external_url: url })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

/**
 * Miniatura JPEG de una imagen, de hasta `max` px por lado. Se genera en el
 * navegador para no descargar la imagen completa en la grilla.
 */
export async function makeImageThumbnail(file: Blob, max = 480): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return null
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')

    if (!context) {
      return null
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()

    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  } catch {
    // Si la imagen no se puede leer, la tarjeta usa el ícono del tipo.
    return null
  }
}

/**
 * Sube un archivo y crea su fuente. La ruta sigue el modelo de datos:
 * `{user_id}/{source_id}/archivo`. Si falla el alta, se borran los archivos
 * subidos para no dejarlos huérfanos.
 */
export async function uploadFileSource(
  userId: string,
  fields: Omit<SourceFields, 'source_type'> & { source_type?: SourceType },
  file: File,
): Promise<Source> {
  const supabase = requireSupabase()
  const sourceId = crypto.randomUUID()
  const folder = `${userId}/${sourceId}`
  const path = `${folder}/${safeFileName(file.name)}`
  const uploaded: string[] = []

  const upload = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (upload.error) {
    throw upload.error
  }

  uploaded.push(path)
  let thumbnailPath: string | null = null

  if (file.type.startsWith('image/')) {
    const thumbnail = await makeImageThumbnail(file)

    if (thumbnail) {
      const candidate = `${folder}/miniatura.jpg`
      const result = await supabase.storage.from(BUCKET).upload(candidate, thumbnail, {
        contentType: 'image/jpeg',
        upsert: true,
      })

      if (!result.error) {
        thumbnailPath = candidate
        uploaded.push(candidate)
      }
    }
  }

  const { data, error } = await supabase
    .from('sources')
    .insert({
      id: sourceId,
      user_id: userId,
      ...fields,
      source_type: fields.source_type ?? sourceTypeForMime(file.type),
      storage_path: path,
      thumbnail_path: thumbnailPath,
      size_bytes: file.size,
      mime_type: file.type,
    })
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from(BUCKET).remove(uploaded)
    throw error
  }

  return data
}

export type SourcePatch = Partial<SourceFields> & { external_url?: string }

export async function updateSource(
  userId: string,
  sourceId: string,
  patch: SourcePatch,
): Promise<Source> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('sources')
    .update(patch)
    .eq('id', sourceId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteSource(userId: string, source: Source): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase
    .from('sources')
    .delete()
    .eq('id', source.id)
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  const files = [source.storage_path, source.thumbnail_path].filter((path): path is string =>
    Boolean(path),
  )

  if (files.length > 0) {
    // La fila ya no existe: si falla el borrado, los archivos se limpian al eliminar la cuenta.
    await supabase.storage.from(BUCKET).remove(files)
  }
}

/** Enlaces firmados (10 minutos) para varias rutas a la vez: miniaturas de la grilla. */
export async function signPaths(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) {
    return {}
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 600)

  if (error) {
    throw error
  }

  const result: Record<string, string> = {}

  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) {
      result[item.path] = item.signedUrl
    }
  }

  return result
}

/** Dirección para abrir una fuente: el enlace externo o un enlace firmado del archivo. */
export async function openSourceUrl(source: Source): Promise<string> {
  if (source.external_url) {
    return source.external_url
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(source.storage_path as string, 600)

  if (error) {
    throw error
  }

  return data.signedUrl
}

/**
 * Abre una fuente en otra pestaña. La pestaña se abre antes de pedir el
 * enlace firmado para que el navegador no la bloquee.
 */
export async function openSourceInNewTab(source: Source): Promise<void> {
  const target = window.open('', '_blank')

  if (target) {
    target.opener = null
  }

  try {
    const href = await openSourceUrl(source)

    if (target) {
      target.location.href = href
    } else {
      window.open(href, '_blank', 'noopener,noreferrer')
    }
  } catch (error) {
    target?.close()
    throw error
  }
}
