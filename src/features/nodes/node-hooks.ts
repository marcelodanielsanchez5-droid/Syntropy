import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { KnowledgeNode, Source, Subject } from '@/types/database'
import type { Position } from './node-tree'
import {
  createLinkSource,
  createNode,
  createNodeLink,
  deleteNode,
  deleteNodeLink,
  deleteSource,
  ensureRoot,
  listNodeLinks,
  listNodeSources,
  listNodes,
  savePositions,
  updateNode,
  uploadFileSource,
  type NodeInput,
  type NodePatch,
} from './node-service'

export function useNodes(userId: string | undefined, subjectIds: string[]) {
  return useQuery({
    queryKey: queryKeys.nodes(userId ?? 'sin-usuario', subjectIds),
    queryFn: () => listNodes(userId as string, subjectIds),
    enabled: Boolean(userId) && subjectIds.length > 0,
  })
}

export function useNodeLinks(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.nodeLinks(userId ?? 'sin-usuario'),
    queryFn: () => listNodeLinks(userId as string),
    enabled: Boolean(userId),
  })
}

export function useNodeMutations(userId: string) {
  const queryClient = useQueryClient()
  const allNodesKey = queryKeys.allNodes(userId)
  const refreshNodes = () => queryClient.invalidateQueries({ queryKey: allNodesKey })
  const refreshLinks = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.nodeLinks(userId) })

  const ensureRootMutation = useMutation({
    mutationFn: ({
      subject,
      position,
    }: {
      subject: Pick<Subject, 'id' | 'name'>
      position: Position
    }) => ensureRoot(userId, subject, position),
    onSuccess: refreshNodes,
  })

  const create = useMutation({
    mutationFn: (input: NodeInput) => createNode(userId, input),
    onSuccess: refreshNodes,
  })

  const update = useMutation({
    mutationFn: ({ nodeId, patch }: { nodeId: string; patch: NodePatch }) =>
      updateNode(userId, nodeId, patch),
    onSuccess: refreshNodes,
  })

  /**
   * Posiciones del lienzo: se aplican al instante en la caché para que el nodo
   * no «salte» de vuelta mientras se guarda.
   */
  const move = useMutation({
    mutationFn: (positions: Array<{ id: string } & Position>) => savePositions(userId, positions),
    onMutate: async (positions) => {
      await queryClient.cancelQueries({ queryKey: allNodesKey })
      const byId = new Map(positions.map((position) => [position.id, position]))

      queryClient.setQueriesData<KnowledgeNode[]>({ queryKey: allNodesKey }, (nodes) =>
        nodes?.map((node) => {
          const position = byId.get(node.id)
          return position
            ? { ...node, position_x: Math.round(position.x), position_y: Math.round(position.y) }
            : node
        }),
      )
    },
    onSettled: refreshNodes,
  })

  const remove = useMutation({
    mutationFn: (nodeId: string) => deleteNode(userId, nodeId),
    onSuccess: async () => {
      await refreshNodes()
      await refreshLinks()
      // Las tareas, exámenes y notas del subárbol quedaron sin tema.
      await queryClient.invalidateQueries({ queryKey: queryKeys.allTasks(userId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.allExams(userId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.allAssessments(userId) })
    },
  })

  const link = useMutation({
    mutationFn: (input: { source_node_id: string; target_node_id: string; label: string | null }) =>
      createNodeLink(userId, input),
    onSuccess: refreshLinks,
  })

  const unlink = useMutation({
    mutationFn: (linkId: string) => deleteNodeLink(userId, linkId),
    onSuccess: refreshLinks,
  })

  return { ensureRoot: ensureRootMutation, create, update, move, remove, link, unlink }
}

export function useNodeSources(userId: string | undefined, nodeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.nodeSources(userId ?? 'sin-usuario', nodeId ?? 'sin-nodo'),
    queryFn: () => listNodeSources(userId as string, nodeId as string),
    enabled: Boolean(userId && nodeId),
  })
}

export function useSourceMutations(userId: string) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.allSources(userId) })

  const addLink = useMutation({
    mutationFn: ({ node, title, url }: { node: KnowledgeNode; title: string; url: string }) =>
      createLinkSource(userId, node, { title, url }),
    onSuccess: refresh,
  })

  const addFile = useMutation({
    mutationFn: ({ node, file }: { node: KnowledgeNode; file: File }) =>
      uploadFileSource(userId, node, file),
    onSuccess: refresh,
  })

  const remove = useMutation({
    mutationFn: (source: Source) => deleteSource(userId, source),
    onSuccess: refresh,
  })

  return { addLink, addFile, remove }
}
