import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { Source } from '@/types/database'
import { storageUsed } from './library-rules'
import {
  createLinkSource,
  deleteSource,
  listUserSources,
  signPaths,
  updateSource,
  uploadFileSource,
  type SourceFields,
  type SourcePatch,
} from './library-service'

const NO_SOURCES: Source[] = []

/** Todas las fuentes del usuario (de todos los años): alimentan la grilla y el espacio usado. */
export function useLibrarySources(userId: string | undefined) {
  const query = useQuery({
    queryKey: [...queryKeys.allSources(userId ?? 'sin-usuario'), 'todas'],
    queryFn: () => listUserSources(userId as string),
    enabled: Boolean(userId),
  })
  const sources = query.data ?? NO_SOURCES
  const usedBytes = useMemo(() => storageUsed(sources), [sources])

  return { ...query, sources, usedBytes, sourceCount: sources.length }
}

export function useLibraryMutations(userId: string) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.allSources(userId) })

  const addLink = useMutation({
    mutationFn: (fields: SourceFields & { url: string }) => createLinkSource(userId, fields),
    onSuccess: refresh,
  })

  const addFile = useMutation({
    mutationFn: ({
      fields,
      file,
    }: {
      fields: Omit<SourceFields, 'source_type'> & Partial<Pick<SourceFields, 'source_type'>>
      file: File
    }) => uploadFileSource(userId, fields, file),
    onSuccess: refresh,
  })

  const update = useMutation({
    mutationFn: ({ sourceId, patch }: { sourceId: string; patch: SourcePatch }) =>
      updateSource(userId, sourceId, patch),
    onSuccess: refresh,
  })

  const remove = useMutation({
    mutationFn: (source: Source) => deleteSource(userId, source),
    onSuccess: refresh,
  })

  return { addLink, addFile, update, remove }
}

/**
 * Enlaces firmados de las miniaturas visibles. Duran 10 minutos; se renuevan
 * a los 8 para que una imagen no quede rota mientras la pantalla está abierta.
 */
export function useSignedUrls(paths: string[]) {
  const sorted = useMemo(() => [...new Set(paths)].sort(), [paths])

  return useQuery({
    queryKey: ['signed-urls', sorted.join('|')],
    queryFn: () => signPaths(sorted),
    enabled: sorted.length > 0,
    staleTime: 8 * 60_000,
    refetchInterval: 8 * 60_000,
    // Los enlaces vencen: no se guardan en la caché persistente.
    gcTime: 9 * 60_000,
    meta: { persist: false },
  })
}
