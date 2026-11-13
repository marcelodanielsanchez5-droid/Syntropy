import { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutGrid, ListTree, Plus, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { getErrorMessage } from '@/lib/errors'
import type { Assessment, Exam, KnowledgeNode, NodeLink, Subject, Task } from '@/types/database'
import { KnowledgeMap } from './KnowledgeMap'
import { LinkNodeDialog } from './LinkNodeDialog'
import { NodeDetailPanel } from './NodeDetailPanel'
import { NodeFormDialog } from './NodeFormDialog'
import { NodeLegend } from './NodeLegend'
import { NodeShape } from './NodeShape'
import { useNodeMutations } from './node-hooks'
import { nodeContour, type Contour } from './node-rules'
import { flattenTree, layoutPlane, layoutTree, newRootPosition, nodeLevels } from './node-tree'

type FormState =
  { open: false } | { open: true; node: KnowledgeNode | null; parent: KnowledgeNode | null }

interface KnowledgeWorkspaceProps {
  mode: 'general' | 'subject'
  userId: string
  timeZone: string
  /** Asignaturas que se ven en el lienzo. */
  subjects: Subject[]
  subjectsById: Map<string, Subject>
  /** Nodos de esas asignaturas. */
  nodes: KnowledgeNode[]
  /** Todos los nodos del año: destinos posibles para conectar y nombres de conexiones. */
  yearNodes: KnowledgeNode[]
  yearSubjects: Subject[]
  links: NodeLink[]
  assessments: Assessment[]
  tasks: Task[]
  exams: Exam[]
  isLoading: boolean
  isError: boolean
  error?: unknown
  onRetry: () => void
}

export function KnowledgeWorkspace({
  mode,
  userId,
  timeZone,
  subjects,
  subjectsById,
  nodes,
  yearNodes,
  yearSubjects,
  links,
  assessments,
  tasks,
  exams,
  isLoading,
  isError,
  error,
  onRetry,
}: KnowledgeWorkspaceProps) {
  const mutations = useNodeMutations(userId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ open: false })
  const [linkFrom, setLinkFrom] = useState<KnowledgeNode | null>(null)
  const attemptedRoots = useRef(new Set<string>())

  // La app genera el nodo principal de cada asignatura que todavía no lo tiene (D5).
  useEffect(() => {
    if (isLoading || isError) {
      return
    }

    const missing = subjects.filter(
      (subject) =>
        !nodes.some((node) => node.subject_id === subject.id && node.is_root) &&
        !attemptedRoots.current.has(subject.id),
    )

    if (missing.length === 0) {
      return
    }

    for (const subject of missing) {
      attemptedRoots.current.add(subject.id)
    }

    void (async () => {
      const placed = [...yearNodes]

      for (const subject of missing) {
        try {
          const root = await mutations.ensureRoot.mutateAsync({
            subject,
            position: newRootPosition(placed),
          })
          placed.push(root)
        } catch (nextError) {
          attemptedRoots.current.delete(subject.id)
          toast.error(getErrorMessage(nextError, `No pudimos crear el mapa de ${subject.name}.`))
        }
      }
    })()
    // `mutations` cambia en cada render; el efecto depende solo de los datos.
  }, [isLoading, isError, subjects, nodes, yearNodes])

  // Los nodos del lienzo más los del resto del año (sin repetir), para niveles y conexiones.
  const knownNodes = useMemo(() => {
    const byId = new Map(yearNodes.map((node) => [node.id, node]))

    for (const node of nodes) {
      byId.set(node.id, node)
    }

    return Array.from(byId.values())
  }, [yearNodes, nodes])
  const levels = useMemo(() => nodeLevels(knownNodes), [knownNodes])

  const contours = useMemo(() => {
    const byNode = new Map<string, Assessment[]>()

    for (const assessment of assessments) {
      if (assessment.node_id) {
        byNode.set(assessment.node_id, [...(byNode.get(assessment.node_id) ?? []), assessment])
      }
    }

    const result = new Map<string, Contour>()

    for (const node of nodes) {
      if (!node.is_root) {
        result.set(node.id, nodeContour(byNode.get(node.id) ?? []))
      }
    }

    return result
  }, [nodes, assessments])

  const selected = nodes.find((node) => node.id === selectedId) ?? null
  const outline = useMemo(() => flattenTree(nodes), [nodes])
  const topicCount = nodes.filter((node) => !node.is_root).length
  const quickRoots = useMemo(
    () =>
      mode === 'general'
        ? subjects
            .map((subject) => ({
              subject,
              root: nodes.find((node) => node.subject_id === subject.id && node.is_root),
            }))
            .filter((item): item is { subject: Subject; root: KnowledgeNode } => Boolean(item.root))
        : undefined,
    [mode, subjects, nodes],
  )
  const subjectRoot = mode === 'subject' ? nodes.find((node) => node.is_root) : undefined

  function handleMove(positions: Array<{ id: string; x: number; y: number }>) {
    mutations.move.mutate(positions, {
      onError: (nextError) =>
        toast.error(getErrorMessage(nextError, 'No pudimos guardar la posición.')),
    })
  }

  function arrange() {
    const positions =
      mode === 'subject' && subjectRoot
        ? layoutTree(nodes, subjectRoot.id, {
            x: subjectRoot.position_x,
            y: subjectRoot.position_y,
          }).positions
        : layoutPlane(
            nodes,
            subjects.map((subject) => subject.id),
          )

    handleMove(Array.from(positions, ([id, position]) => ({ id, ...position })))
    toast.success('Mapa ordenado.')
  }

  const formParent = form.open ? form.parent : null
  const formLevel = form.open
    ? form.node
      ? (levels.get(form.node.id) ?? 1)
      : (levels.get(formParent?.id ?? '') ?? 0) + 1
    : 1

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">
          {topicCount === 0
            ? 'Todavía no hay temas. Empezá por los temas principales de cada materia.'
            : `${topicCount} tema${topicCount === 1 ? '' : 's'} en el mapa. Tocá uno para ver su detalle.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={arrange}
            disabled={nodes.length < 2 || mutations.move.isPending}
            leftIcon={<LayoutGrid className="h-3.5 w-3.5" />}
          >
            Ordenar mapa
          </Button>
          {subjectRoot ? (
            <Button
              size="sm"
              onClick={() => setForm({ open: true, node: null, parent: subjectRoot })}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Agregar tema
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {isError ? (
            <Card>
              <CardContent className="flex flex-col items-center px-4 py-16 text-center">
                <p className="text-base font-bold text-ink">No pudimos cargar el mapa</p>
                <p className="mt-1 max-w-sm text-sm text-ink-muted">
                  {getErrorMessage(error, 'Revisá tu conexión e intentá de nuevo.')}
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={onRetry}
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                >
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          ) : isLoading || nodes.length === 0 ? (
            <div className="flex h-[60vh] min-h-[420px] items-center justify-center rounded-2xl border border-line bg-sunken">
              <Spinner className="h-6 w-6" />
              <span className="sr-only">Preparando el mapa…</span>
            </div>
          ) : (
            <KnowledgeMap
              className="h-[60vh] min-h-[420px] lg:h-[calc(100dvh-16rem)]"
              nodes={nodes}
              links={links}
              levels={levels}
              subjectsById={subjectsById}
              contours={contours}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={handleMove}
              quickRoots={quickRoots}
            />
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="p-5">
              {selected ? (
                <NodeDetailPanel
                  userId={userId}
                  node={selected}
                  level={levels.get(selected.id) ?? 1}
                  subject={subjectsById.get(selected.subject_id)}
                  nodes={knownNodes}
                  links={links}
                  subjectsById={subjectsById}
                  contour={contours.get(selected.id) ?? null}
                  assessments={assessments.filter(
                    (assessment) => assessment.node_id === selected.id,
                  )}
                  tasks={tasks.filter((task) => task.node_id === selected.id)}
                  exams={exams.filter((exam) => exam.node_id === selected.id)}
                  timeZone={timeZone}
                  onClose={() => setSelectedId(null)}
                  onSelect={setSelectedId}
                  onEdit={(node) => setForm({ open: true, node, parent: null })}
                  onAddChild={(parent) => setForm({ open: true, node: null, parent })}
                  onLink={setLinkFrom}
                />
              ) : (
                <div className="space-y-3">
                  <h2 className="flex items-center gap-2 text-base font-bold text-ink">
                    <ListTree className="h-4 w-4 text-rose-bright" aria-hidden="true" />
                    Temas
                  </h2>
                  {outline.length === 0 ? (
                    <p className="text-sm text-ink-muted">Cargando…</p>
                  ) : (
                    <ul className="scrollbar-thin max-h-[40vh] space-y-0.5 overflow-y-auto pr-1">
                      {outline.map(({ node, level }) => (
                        <li key={node.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(node.id)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-sm transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60',
                              node.is_root ? 'font-bold text-ink' : 'text-ink-secondary',
                            )}
                            style={{ paddingLeft: `${0.5 + level * 0.9}rem` }}
                          >
                            <NodeShape
                              size={14}
                              color={subjectsById.get(node.subject_id)?.color_hex ?? '#98A2B3'}
                              difficulty={node.is_root ? null : node.difficulty}
                              mastery={node.mastery}
                              contour={contours.get(node.id) ?? null}
                            />
                            <span className="truncate">{node.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {mode === 'general' ? (
                    <p className="text-xs leading-5 text-ink-muted">
                      Tocá el nodo grande de una materia para agregarle temas.
                    </p>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <NodeLegend color={mode === 'subject' ? subjects[0]?.color_hex : undefined} />
            </CardContent>
          </Card>
        </aside>
      </div>

      <NodeFormDialog
        open={form.open}
        onOpenChange={(open) => !open && setForm({ open: false })}
        userId={userId}
        subject={subjectsById.get(
          (form.open ? (form.node ?? form.parent) : null)?.subject_id ?? '',
        )}
        node={form.open ? form.node : null}
        parent={formParent}
        level={formLevel}
        siblings={formParent ? nodes.filter((node) => node.parent_id === formParent.id) : []}
        onSaved={(node) => setSelectedId(node.id)}
      />

      <LinkNodeDialog
        open={linkFrom !== null}
        onOpenChange={(open) => !open && setLinkFrom(null)}
        userId={userId}
        from={linkFrom}
        nodes={knownNodes}
        links={links}
        subjects={yearSubjects}
      />
    </>
  )
}
