import { requireSupabase } from '@/lib/supabase'
import { sourceTypeForUrl, titleFromFileName } from '@/features/library/library-rules'
import {
  createLinkSource as createLibraryLink,
  uploadFileSource as uploadLibraryFile,
} from '@/features/library/library-service'
import type { KnowledgeNode, NodeLink, Source, Subject } from '@/types/database'
import type { Position } from './node-tree'

export const NODE_HAS_SOURCES_MESSAGE =
  'Este tema (o uno de sus subtemas) tiene archivos o enlaces adjuntos. Quitalos antes de eliminarlo para no perderlos.'

function normalizeNode(row: KnowledgeNode): KnowledgeNode {
  return {
    ...row,
    position_x: Number(row.position_x),
    position_y: Number(row.position_y),
  }
}

export async function listNodes(userId: string, subjectIds: string[]): Promise<KnowledgeNode[]> {
  if (subjectIds.length === 0) {
    return []
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nodes')
    .select('*')
    .eq('user_id', userId)
    .in('subject_id', subjectIds)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data.map(normalizeNode)
}

/**
 * La app genera el nodo raíz de cada asignatura (D5). Si dos pestañas lo
 * crean a la vez, la base rechaza el segundo y se usa el que ya existe.
 */
export async function ensureRoot(
  userId: string,
  subject: Pick<Subject, 'id' | 'name'>,
  position: Position,
): Promise<KnowledgeNode> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nodes')
    .insert({
      user_id: userId,
      subject_id: subject.id,
      is_root: true,
      name: subject.name.slice(0, 120),
      position_x: position.x,
      position_y: position.y,
    })
    .select('*')
    .single()

  if (!error) {
    return normalizeNode(data)
  }

  if (error.code !== '23505') {
    throw error
  }

  const existing = await supabase
    .from('nodes')
    .select('*')
    .eq('user_id', userId)
    .eq('subject_id', subject.id)
    .eq('is_root', true)
    .single()

  if (existing.error) {
    throw existing.error
  }

  return normalizeNode(existing.data)
}

export interface NodeInput {
  subject_id: string
  parent_id: string
  name: string
  description: string | null
  summary: string | null
  difficulty: number
  mastery: number
  position_x: number
  position_y: number
}

export async function createNode(userId: string, input: NodeInput): Promise<KnowledgeNode> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nodes')
    .insert({ user_id: userId, ...input })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return normalizeNode(data)
}

export type NodePatch = Partial<
  Pick<
    KnowledgeNode,
    'name' | 'description' | 'summary' | 'difficulty' | 'mastery' | 'position_x' | 'position_y'
  >
>

export async function updateNode(
  userId: string,
  nodeId: string,
  patch: NodePatch,
): Promise<KnowledgeNode> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nodes')
    .update(patch)
    .eq('id', nodeId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return normalizeNode(data)
}

/** Guarda posiciones del lienzo, de a pocas a la vez. */
export async function savePositions(
  userId: string,
  positions: Array<{ id: string } & Position>,
): Promise<void> {
  const supabase = requireSupabase()
  const batchSize = 6

  for (let index = 0; index < positions.length; index += batchSize) {
    const results = await Promise.all(
      positions.slice(index, index + batchSize).map(({ id, x, y }) =>
        supabase
          .from('nodes')
          .update({ position_x: Math.round(x), position_y: Math.round(y) })
          .eq('id', id)
          .eq('user_id', userId),
      ),
    )
    const failed = results.find((result) => result.error)

    if (failed?.error) {
      throw failed.error
    }
  }
}

/**
 * Borra el tema y su subárbol. Las tareas, exámenes y notas vinculados quedan
 * sin tema; si hay fuentes adjuntas la base bloquea el borrado.
 */
export async function deleteNode(userId: string, nodeId: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase.from('nodes').delete().eq('id', nodeId).eq('user_id', userId)

  if (error) {
    if (error.code === '23503') {
      throw new Error(NODE_HAS_SOURCES_MESSAGE)
    }

    throw error
  }
}

export async function listNodeLinks(userId: string): Promise<NodeLink[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('node_links')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

export async function createNodeLink(
  userId: string,
  input: { source_node_id: string; target_node_id: string; label: string | null },
): Promise<NodeLink> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('node_links')
    .insert({ user_id: userId, ...input })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Esos dos temas ya están conectados.')
    }

    throw error
  }

  return data
}

export async function deleteNodeLink(userId: string, linkId: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase
    .from('node_links')
    .delete()
    .eq('id', linkId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}

// ---------------------------------------------------------------------------
// Adjuntos del tema (Fase 5B). Son fuentes de la biblioteca vinculadas al
// nodo: usan el mismo servicio, los mismos límites y las mismas miniaturas.
// ---------------------------------------------------------------------------

export {
  ALLOWED_MIME_TYPES as ATTACHMENT_MIME_TYPES,
  FILE_MAX_BYTES as ATTACHMENT_MAX_BYTES,
  safeFileName,
  sourceTypeForMime,
} from '@/features/library/library-rules'
export { deleteSource, openSourceUrl } from '@/features/library/library-service'

export async function listNodeSources(userId: string, nodeId: string): Promise<Source[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .eq('user_id', userId)
    .eq('node_id', nodeId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

export function createLinkSource(
  userId: string,
  node: Pick<KnowledgeNode, 'id' | 'subject_id'>,
  input: { title: string; url: string },
): Promise<Source> {
  return createLibraryLink(userId, {
    subject_id: node.subject_id,
    node_id: node.id,
    task_id: null,
    title: input.title,
    description: null,
    source_type: sourceTypeForUrl(input.url),
    tags: [],
    url: input.url,
  })
}

export function uploadFileSource(
  userId: string,
  node: Pick<KnowledgeNode, 'id' | 'subject_id'>,
  file: File,
): Promise<Source> {
  return uploadLibraryFile(
    userId,
    {
      subject_id: node.subject_id,
      node_id: node.id,
      task_id: null,
      title: titleFromFileName(file.name),
      description: null,
      tags: [],
    },
    file,
  )
}
