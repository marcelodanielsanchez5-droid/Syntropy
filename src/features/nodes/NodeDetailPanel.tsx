import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarClock,
  GitBranchPlus,
  GraduationCap,
  ListTodo,
  Network,
  NotebookText,
  Pencil,
  Plus,
  Trash2,
  Unlink,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatPlain } from '@/features/grades/grade-math'
import { formatShortDayAndTime } from '@/lib/datetime'
import { getErrorMessage } from '@/lib/errors'
import type { Assessment, Exam, KnowledgeNode, NodeLink, Subject, Task } from '@/types/database'
import { NodeAttachments } from './NodeAttachments'
import { NodeShape } from './NodeShape'
import { useNodeMutations } from './node-hooks'
import { LEVEL_NAMES, describeContour, masteryOpacity, shapeName, type Contour } from './node-rules'
import { canAddChild, linksOf, subtreeIds } from './node-tree'

interface NodeDetailPanelProps {
  userId: string
  node: KnowledgeNode
  level: number
  subject: Subject | undefined
  /** Todos los nodos cargados (para contar subtemas y nombrar conexiones). */
  nodes: KnowledgeNode[]
  links: NodeLink[]
  subjectsById: Map<string, Subject>
  contour: Contour | null
  assessments: Assessment[]
  tasks: Task[]
  exams: Exam[]
  timeZone: string
  onClose: () => void
  onSelect: (nodeId: string) => void
  onEdit: (node: KnowledgeNode) => void
  onAddChild: (parent: KnowledgeNode) => void
  onLink: (node: KnowledgeNode) => void
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof ListTodo
  children: React.ReactNode
}) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
      <Icon className="h-4 w-4 text-rose-bright" aria-hidden="true" />
      {children}
    </h3>
  )
}

/** Panel de un nodo: datos, resumen, notas, tareas, conexiones y adjuntos. */
export function NodeDetailPanel({
  userId,
  node,
  level,
  subject,
  nodes,
  links,
  subjectsById,
  contour,
  assessments,
  tasks,
  exams,
  timeZone,
  onClose,
  onSelect,
  onEdit,
  onAddChild,
  onLink,
}: NodeDetailPanelProps) {
  const { remove, unlink } = useNodeMutations(userId)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const color = subject?.color_hex ?? '#98A2B3'
  const nodeById = new Map(nodes.map((item) => [item.id, item]))
  const children = nodes.filter((item) => item.parent_id === node.id)
  const removedCount = subtreeIds(node.id, nodes).length
  const connections = linksOf(links, node.id)

  async function handleDelete() {
    try {
      await remove.mutateAsync(node.id)
      setConfirmDelete(false)
      toast.success(removedCount > 1 ? `Se eliminaron ${removedCount} temas.` : 'Tema eliminado.')
      onClose()
    } catch (error) {
      setConfirmDelete(false)
      toast.error(getErrorMessage(error, 'No pudimos eliminar el tema.'))
    }
  }

  async function handleUnlink(link: NodeLink) {
    try {
      await unlink.mutateAsync(link.id)
      toast.success('Conexión quitada.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'No pudimos quitar la conexión.'))
    }
  }

  const header = (
    <div className="flex items-start gap-3">
      <NodeShape
        size={44}
        color={color}
        difficulty={node.is_root ? null : node.difficulty}
        mastery={node.mastery}
        contour={contour}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rose-bright">
          {LEVEL_NAMES[level]} · {subject?.name ?? 'Asignatura'}
        </p>
        <h2 className="mt-0.5 text-lg font-bold leading-6 text-ink">{node.name}</h2>
        {node.description ? (
          <p className="mt-1 text-sm leading-5 text-ink-muted">{node.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-white/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60"
        aria-label="Cerrar el detalle"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )

  if (node.is_root) {
    const topicCount = nodes.filter(
      (item) => item.subject_id === node.subject_id && !item.is_root,
    ).length

    return (
      <div className="space-y-5">
        {header}
        <p className="text-sm leading-6 text-ink-muted">
          Es el nodo principal de la materia: agrupa sus temas y no tiene dificultad, dominio ni
          notas propias.{' '}
          {topicCount === 0
            ? 'Todavía no tiene temas.'
            : `Tiene ${topicCount} tema${topicCount === 1 ? '' : 's'}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => onAddChild(node)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Agregar tema principal
          </Button>
          {subject ? (
            <Link
              to={`/asignaturas/${subject.id}/nodos`}
              className="inline-flex h-9 items-center rounded-lg border border-line bg-white/5 px-3 text-sm font-semibold text-ink transition hover:bg-white/10"
            >
              Ver solo esta materia
            </Link>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {header}

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-line bg-sunken/40 p-2.5">
          <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-disabled">
            Dificultad
          </dt>
          <dd className="mt-1 text-lg font-extrabold text-ink tabular-nums">{node.difficulty}</dd>
          <dd className="text-[11px] text-ink-muted">{shapeName(node.difficulty ?? 1)}</dd>
        </div>
        <div className="rounded-xl border border-line bg-sunken/40 p-2.5">
          <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-disabled">
            Dominio
          </dt>
          <dd className="mt-1 text-lg font-extrabold text-ink tabular-nums">{node.mastery}/10</dd>
          <dd className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${(node.mastery ?? 0) * 10}%`,
                backgroundColor: color,
                opacity: masteryOpacity(node.mastery ?? 1) + 0.1,
              }}
            />
          </dd>
        </div>
        <div className="rounded-xl border border-line bg-sunken/40 p-2.5">
          <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-disabled">
            Contorno
          </dt>
          <dd
            className="mt-1 text-sm font-extrabold leading-6"
            style={{ color: contour?.tier === 'ungraded' ? undefined : contour?.color }}
          >
            {contour ? contour.label : 'Sin calificar'}
          </dd>
          <dd className="text-[11px] text-ink-muted">
            {contour?.percent != null ? `${Math.round(contour.percent)} %` : 'sin notas'}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onEdit(node)}
          leftIcon={<Pencil className="h-3.5 w-3.5" />}
        >
          Editar
        </Button>
        {canAddChild(level) ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onAddChild(node)}
            leftIcon={<GitBranchPlus className="h-3.5 w-3.5" />}
          >
            Subtema
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onLink(node)}
          leftIcon={<Network className="h-3.5 w-3.5" />}
        >
          Conectar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-danger hover:bg-danger/10 hover:text-danger"
          onClick={() => setConfirmDelete(true)}
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
        >
          Eliminar
        </Button>
      </div>

      <section className="space-y-2" aria-label="Resumen">
        <SectionTitle icon={NotebookText}>Resumen</SectionTitle>
        {node.summary ? (
          <p className="whitespace-pre-wrap rounded-xl border border-line bg-sunken/40 p-3 font-mono text-[13px] leading-6 text-ink-secondary">
            {node.summary}
          </p>
        ) : (
          <p className="text-xs leading-5 text-ink-muted">
            Escribí las ideas clave del tema, como un mapa conceptual. Se edita desde «Editar».
          </p>
        )}
      </section>

      <section className="space-y-2" aria-label="Notas vinculadas">
        <SectionTitle icon={GraduationCap}>Notas</SectionTitle>
        {assessments.length > 0 ? (
          <>
            <p className="text-xs text-ink-muted">
              {contour ? describeContour(contour) : ''} · promedio simple de sus notas
            </p>
            <ul className="space-y-1">
              {assessments.map((assessment) => (
                <li
                  key={assessment.id}
                  className="flex justify-between gap-2 rounded-lg bg-sunken/40 px-3 py-1.5 text-sm"
                >
                  <span className="truncate text-ink-secondary">{assessment.title}</span>
                  <span className="shrink-0 tabular-nums text-ink">
                    {assessment.score === null
                      ? 'Pendiente'
                      : `${formatPlain(assessment.score)} / ${formatPlain(assessment.scale_max)}`}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-xs leading-5 text-ink-muted">
            Vinculá evaluaciones a este tema desde Calificaciones: su promedio define el contorno.
          </p>
        )}
      </section>

      {tasks.length > 0 || exams.length > 0 ? (
        <section className="space-y-2" aria-label="Tareas y exámenes vinculados">
          <SectionTitle icon={CalendarClock}>Tareas y exámenes</SectionTitle>
          <ul className="space-y-1">
            {exams.map((exam) => (
              <li
                key={exam.id}
                className="flex justify-between gap-2 rounded-lg bg-sunken/40 px-3 py-1.5 text-sm"
              >
                <span className="truncate text-ink-secondary">Examen: {exam.title}</span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {formatShortDayAndTime(exam.exam_at, timeZone)}
                </span>
              </li>
            ))}
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex justify-between gap-2 rounded-lg bg-sunken/40 px-3 py-1.5 text-sm"
              >
                <span className="truncate text-ink-secondary">{task.title}</span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {formatShortDayAndTime(task.due_at, timeZone)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2" aria-label="Subtemas y conexiones">
        <SectionTitle icon={Network}>Subtemas y conexiones</SectionTitle>
        {children.length === 0 && connections.length === 0 ? (
          <p className="text-xs leading-5 text-ink-muted">
            Sin subtemas ni conexiones con otros temas.
          </p>
        ) : (
          <ul className="space-y-1">
            {children.map((child) => (
              <li key={child.id}>
                <button
                  type="button"
                  onClick={() => onSelect(child.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg bg-sunken/40 px-3 py-1.5 text-left text-sm text-ink-secondary transition hover:text-ink"
                >
                  <span className="truncate">{child.name}</span>
                  <Badge variant="muted">Subtema</Badge>
                </button>
              </li>
            ))}
            {connections.map(({ link, otherId }) => {
              const other = nodeById.get(otherId)
              const otherSubject = other ? subjectsById.get(other.subject_id) : undefined

              return (
                <li key={link.id} className="flex items-center gap-1 rounded-lg bg-sunken/40 pr-1">
                  <button
                    type="button"
                    onClick={() => other && onSelect(other.id)}
                    disabled={!other}
                    className="min-w-0 flex-1 px-3 py-1.5 text-left text-sm text-ink-secondary transition hover:text-ink"
                  >
                    <span className="block truncate">{other?.name ?? 'Tema de otro año'}</span>
                    <span className="block truncate text-[11px] text-ink-muted">
                      {[link.label, otherSubject?.name].filter(Boolean).join(' · ') || 'Conexión'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUnlink(link)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-disabled transition hover:bg-danger/10 hover:text-danger"
                    aria-label={`Quitar la conexión con ${other?.name ?? 'otro tema'}`}
                  >
                    <Unlink className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <NodeAttachments userId={userId} node={node} />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminar tema"
        description={
          removedCount > 1
            ? `Se van a eliminar «${node.name}» y ${removedCount - 1} subtema${removedCount - 1 === 1 ? '' : 's'}. Las tareas, exámenes y notas vinculados se conservan, sin tema. Esta acción no se puede deshacer.`
            : `Se va a eliminar «${node.name}». Las tareas, exámenes y notas vinculados se conservan, sin tema. Esta acción no se puede deshacer.`
        }
        confirmLabel={removedCount > 1 ? `Eliminar ${removedCount} temas` : 'Eliminar tema'}
        onConfirm={() => void handleDelete()}
        loading={remove.isPending}
        destructive
      />
    </div>
  )
}
