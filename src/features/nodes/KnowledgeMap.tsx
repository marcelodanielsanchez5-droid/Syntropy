import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type BuiltInEdge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Crosshair, Hand, MousePointerClick } from 'lucide-react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { withAlpha } from '@/lib/colors'
import { cn } from '@/lib/cn'
import type { KnowledgeNode, NodeLink, Subject } from '@/types/database'
import { NodeShape, SHAPE_PADDING } from './NodeShape'
import { LEVEL_NAMES, describeContour, nodeSize, shapeName, type Contour } from './node-rules'
import type { Position as XY } from './node-tree'

type MapNodeData = {
  node: KnowledgeNode
  level: number
  color: string
  contour: Contour | null
  highlighted: boolean
}

type MapNode = Node<MapNodeData, 'knowledge'>

const HIDDEN_HANDLE = '!h-px !w-px !min-h-0 !min-w-0 !border-0 !bg-transparent'

function describeNode(data: MapNodeData, subjectName: string): string {
  const { node, level, contour } = data

  if (node.is_root) {
    return `${node.name}: nodo principal de la asignatura`
  }

  return [
    `${node.name}`,
    LEVEL_NAMES[level],
    subjectName,
    `dificultad ${node.difficulty} (${shapeName(node.difficulty ?? 1).toLowerCase()})`,
    `dominio ${node.mastery} de 10`,
    contour ? `contorno ${describeContour(contour)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

const KnowledgeNodeView = memo(function KnowledgeNodeView({ data, selected }: NodeProps<MapNode>) {
  const { node, level, color, contour, highlighted } = data
  const size = nodeSize(level)

  return (
    <div
      className="relative"
      style={{ width: size + SHAPE_PADDING * 2, height: size + SHAPE_PADDING * 2 }}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className={HIDDEN_HANDLE}
      />
      <NodeShape
        size={size}
        color={color}
        difficulty={node.is_root ? null : node.difficulty}
        mastery={node.mastery}
        contour={contour}
        selected={selected || highlighted}
      />
      <span
        className={cn(
          'pointer-events-none absolute left-1/2 top-full mt-0.5 w-max max-w-[150px] -translate-x-1/2 rounded-md bg-canvas/85 px-1.5 py-0.5 text-center leading-tight text-ink',
          node.is_root ? 'text-[13px] font-extrabold' : 'line-clamp-2 text-[11px] font-semibold',
          selected && 'ring-1 ring-rose-bright/60',
        )}
      >
        {node.name}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className={HIDDEN_HANDLE}
      />
    </div>
  )
})

const NODE_TYPES = { knowledge: KnowledgeNodeView }

export interface KnowledgeMapProps {
  nodes: KnowledgeNode[]
  links: NodeLink[]
  levels: Map<string, number>
  subjectsById: Map<string, Subject>
  contours: Map<string, Contour>
  selectedId: string | null
  onSelect: (nodeId: string | null) => void
  onMove: (positions: Array<{ id: string } & XY>) => void
  /** Accesos rápidos al nodo raíz de cada asignatura (plano general). */
  quickRoots?: Array<{ subject: Subject; root: KnowledgeNode }>
  className?: string
}

function MapInner({
  nodes,
  links,
  levels,
  subjectsById,
  contours,
  selectedId,
  onSelect,
  onMove,
  quickRoots,
  className,
}: KnowledgeMapProps) {
  const { fitView, setCenter } = useReactFlow()
  const [mode, setMode] = useState<'explore' | 'move'>('explore')

  // Nodos conectados al seleccionado (padre, hijos y enlaces), para resaltarlos.
  const related = useMemo(() => {
    const ids = new Set<string>()

    if (!selectedId) {
      return ids
    }

    for (const node of nodes) {
      if (node.parent_id === selectedId) {
        ids.add(node.id)
      }

      if (node.id === selectedId && node.parent_id) {
        ids.add(node.parent_id)
      }
    }

    for (const link of links) {
      if (link.source_node_id === selectedId) {
        ids.add(link.target_node_id)
      }

      if (link.target_node_id === selectedId) {
        ids.add(link.source_node_id)
      }
    }

    return ids
  }, [nodes, links, selectedId])

  const mapNodes = useMemo<MapNode[]>(
    () =>
      nodes.map((node) => {
        const subject = subjectsById.get(node.subject_id)
        const data: MapNodeData = {
          node,
          level: levels.get(node.id) ?? 1,
          color: subject?.color_hex ?? '#98A2B3',
          contour: node.is_root ? null : (contours.get(node.id) ?? null),
          highlighted: related.has(node.id),
        }

        return {
          id: node.id,
          type: 'knowledge',
          position: { x: node.position_x, y: node.position_y },
          data,
          selected: node.id === selectedId,
          ariaLabel: describeNode(data, subject?.name ?? 'Asignatura'),
        }
      }),
    [nodes, subjectsById, levels, contours, related, selectedId],
  )

  // Estado local para que el arrastre sea fluido; se sincroniza cuando cambian los datos.
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<MapNode>(mapNodes)

  useEffect(() => {
    setFlowNodes(mapNodes)
  }, [mapNodes, setFlowNodes])

  const visibleIds = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes])

  const edges = useMemo<BuiltInEdge[]>(() => {
    const hierarchy = nodes
      .filter((node) => node.parent_id && visibleIds.has(node.parent_id))
      .map((node) => {
        const active = node.id === selectedId || node.parent_id === selectedId

        return {
          id: `tree:${node.id}`,
          source: node.parent_id as string,
          target: node.id,
          type: 'smoothstep',
          pathOptions: { borderRadius: 8 },
          selectable: false,
          style: { stroke: active ? '#C7CED8' : '#7D8592', strokeWidth: active ? 2.25 : 1.5 },
        } satisfies BuiltInEdge
      })

    const nodeById = new Map(nodes.map((node) => [node.id, node]))
    const crossLinks = links
      .filter((link) => visibleIds.has(link.source_node_id) && visibleIds.has(link.target_node_id))
      .map((link) => {
        const sourceSubject = subjectsById.get(nodeById.get(link.source_node_id)?.subject_id ?? '')
        const active = link.source_node_id === selectedId || link.target_node_id === selectedId

        return {
          id: `link:${link.id}`,
          source: link.source_node_id,
          target: link.target_node_id,
          type: 'default',
          label: link.label ?? undefined,
          selectable: false,
          style: {
            stroke: withAlpha(sourceSubject?.color_hex ?? '#98A2B3', active ? 1 : 0.7),
            strokeWidth: active ? 2.25 : 1.5,
            strokeDasharray: '6 5',
          },
          labelStyle: { fill: '#C7CED8', fontSize: 11, fontWeight: 600 },
          labelBgStyle: { fill: '#161E2B' },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 6,
        } satisfies BuiltInEdge
      })

    return [...hierarchy, ...crossLinks]
  }, [nodes, links, visibleIds, selectedId, subjectsById])

  const centerOn = useCallback(
    (node: KnowledgeNode) => {
      void setCenter(node.position_x, node.position_y, { zoom: 1, duration: 400 })
      onSelect(node.id)
    },
    [setCenter, onSelect],
  )

  return (
    <div
      className={cn(
        'syntropy-map relative overflow-hidden rounded-2xl border border-line',
        className,
      )}
    >
      <ReactFlow<MapNode>
        nodes={flowNodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        nodeOrigin={[0.5, 0.5]}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1.2 }}
        minZoom={0.15}
        maxZoom={2.5}
        nodesDraggable={mode === 'move'}
        nodesConnectable={false}
        elementsSelectable
        selectNodesOnDrag={false}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        onNodeDragStop={(_, _node, dragged) =>
          onMove(dragged.map((item) => ({ id: item.id, x: item.position.x, y: item.position.y })))
        }
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#2F3947" />
        <Controls
          showInteractive={false}
          position="bottom-left"
          className="syntropy-map-controls"
        />

        {/* Abajo a la derecha: arriba queda libre para el menú rápido de materias. */}
        <Panel position="bottom-right">
          <SegmentedControl
            label="Modo del mapa"
            value={mode}
            onChange={setMode}
            size="sm"
            className="bg-shell/90 backdrop-blur"
            options={[
              {
                value: 'explore',
                label: (
                  <>
                    <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
                    Explorar
                  </>
                ),
              },
              {
                value: 'move',
                label: (
                  <>
                    <Hand className="h-3.5 w-3.5" aria-hidden="true" />
                    Mover temas
                  </>
                ),
              },
            ]}
          />
        </Panel>

        {quickRoots && quickRoots.length > 0 ? (
          <Panel position="top-left" className="max-w-[calc(100%-1.5rem)]">
            <div className="scrollbar-thin flex gap-1.5 overflow-x-auto rounded-xl border border-line bg-shell/90 p-1.5 backdrop-blur">
              <button
                type="button"
                onClick={() => void fitView({ padding: 0.25, duration: 400 })}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-ink-secondary transition hover:bg-white/5 hover:text-ink"
              >
                <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
                Todo
              </button>
              {quickRoots.map(({ subject, root }) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => centerOn(root)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-ink-secondary transition hover:bg-white/5 hover:text-ink"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: subject.color_hex }}
                    aria-hidden="true"
                  />
                  {subject.name}
                </button>
              ))}
            </div>
          </Panel>
        ) : null}
      </ReactFlow>
    </div>
  )
}

/** Lienzo de nodos: zoom, paneo, arrastre opcional y selección. */
export function KnowledgeMap(props: KnowledgeMapProps) {
  return (
    <ReactFlowProvider>
      <MapInner {...props} />
    </ReactFlowProvider>
  )
}
