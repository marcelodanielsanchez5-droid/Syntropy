import { useEffect, useMemo, useState } from 'react'
import { HardDrive, Library, ListFilter, Plus, RotateCcw, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog, DialogContent, DialogTitle, mobileSheetClassName } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { flattenTree } from '@/features/nodes/node-tree'
import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/cn'
import { getErrorMessage } from '@/lib/errors'
import type { KnowledgeNode, Source, Subject, Task } from '@/types/database'
import { SourceCard } from './SourceCard'
import { SourceDetail } from './SourceDetail'
import { SourceFormDialog } from './SourceFormDialog'
import { useLibraryMutations, useSignedUrls } from './library-hooks'
import {
  EMPTY_FILTERS,
  LIBRARY_MAX_BYTES,
  LIBRARY_MAX_SOURCES,
  SOURCE_TYPES,
  SOURCE_TYPE_LABELS,
  activeFilterCount,
  filterSources,
  formatBytes,
  type LibraryFilters,
} from './library-rules'
import { openSourceInNewTab } from './library-service'

const PAGE_SIZE = 24

function StorageMeter({ usedBytes, sourceCount }: { usedBytes: number; sourceCount: number }) {
  const percent = Math.min(100, (usedBytes / LIBRARY_MAX_BYTES) * 100)
  const tone = percent >= 90 ? 'bg-danger' : percent >= 70 ? 'bg-warning' : 'bg-success'

  return (
    <div className="w-full space-y-1.5 sm:w-auto sm:min-w-56">
      <p className="flex items-center justify-between gap-2 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5 font-semibold text-ink-secondary">
          <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
          Espacio
        </span>
        <span className="tabular-nums">
          {formatBytes(usedBytes)} de {formatBytes(LIBRARY_MAX_BYTES)}
        </span>
      </p>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-line"
        role="meter"
        aria-label="Espacio usado de la biblioteca"
        aria-valuemin={0}
        aria-valuemax={LIBRARY_MAX_BYTES}
        aria-valuenow={usedBytes}
        aria-valuetext={`${formatBytes(usedBytes)} de ${formatBytes(LIBRARY_MAX_BYTES)}`}
      >
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${percent}%` }} />
      </div>
      <p className="text-[11px] text-ink-disabled tabular-nums">
        {sourceCount} de {LIBRARY_MAX_SOURCES} fuentes
      </p>
    </div>
  )
}

type Dialogs =
  { type: 'none' } | { type: 'form'; source: Source | null } | { type: 'delete'; source: Source }

interface LibraryViewProps {
  userId: string
  subjects: Subject[]
  subjectsById: Map<string, Subject>
  lockedSubject?: Subject
  /** Fuentes de las asignaturas que se ven. */
  sources: Source[]
  usedBytes: number
  sourceCount: number
  nodes: KnowledgeNode[]
  tasks: Task[]
  isLoading: boolean
  isError: boolean
  error?: unknown
  onRetry: () => void
}

export function LibraryView({
  userId,
  subjects,
  subjectsById,
  lockedSubject,
  sources,
  usedBytes,
  sourceCount,
  nodes,
  tasks,
  isLoading,
  isError,
  error,
  onRetry,
}: LibraryViewProps) {
  const { remove } = useLibraryMutations(userId)
  const [filters, setFilters] = useState<LibraryFilters>(EMPTY_FILTERS)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialogs>({ type: 'none' })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const isWide = useMediaQuery('(min-width: 1024px)')

  const effectiveFilters = lockedSubject ? { ...filters, subjectId: lockedSubject.id } : filters
  const filtered = useMemo(
    () => filterSources(sources, effectiveFilters),
    [sources, effectiveFilters],
  )
  const visible = filtered.slice(0, visibleCount)
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const selected = sources.find((source) => source.id === selectedId) ?? null

  // Miniaturas de lo que está en pantalla (y de la fuente abierta en el detalle).
  const thumbnailPaths = useMemo(
    () =>
      [...visible, ...(selected ? [selected] : [])]
        .map((source) => source.thumbnail_path)
        .filter((path): path is string => Boolean(path)),
    [visible, selected],
  )
  const signed = useSignedUrls(thumbnailPaths)
  const thumbnailUrl = (source: Source) =>
    source.thumbnail_path ? signed.data?.[source.thumbnail_path] : undefined

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [filters])

  const filterSubjectId =
    lockedSubject?.id ?? (filters.subjectId === 'all' ? '' : filters.subjectId)
  const nodeOptions = useMemo(
    () =>
      flattenTree(
        nodes.filter((node) => !filterSubjectId || node.subject_id === filterSubjectId),
      ).filter(({ node }) => !node.is_root),
    [nodes, filterSubjectId],
  )
  const taskOptions = useMemo(
    () => tasks.filter((task) => !filterSubjectId || task.subject_id === filterSubjectId),
    [tasks, filterSubjectId],
  )
  const activeCount = activeFilterCount(effectiveFilters) - (lockedSubject ? 1 : 0)
  const hasFilters = activeCount > 0 || filters.query.trim().length > 0

  function setFilter<K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      // El tema y la tarea dependen de la asignatura elegida.
      ...(key === 'subjectId' ? { nodeId: 'all', taskId: 'all' } : {}),
    }))
  }

  async function open(source: Source) {
    try {
      await openSourceInNewTab(source)
    } catch (nextError) {
      toast.error(getErrorMessage(nextError, 'No pudimos abrir la fuente.'))
    }
  }

  async function handleDelete(source: Source) {
    try {
      await remove.mutateAsync(source)
      setDialog({ type: 'none' })

      if (selectedId === source.id) {
        setSelectedId(null)
      }

      toast.success(
        source.storage_path ? 'Archivo eliminado de la biblioteca.' : 'Enlace eliminado.',
      )
    } catch (nextError) {
      setDialog({ type: 'none' })
      toast.error(getErrorMessage(nextError, 'No pudimos eliminar la fuente.'))
    }
  }

  const detail = selected ? (
    <SourceDetail
      source={selected}
      subject={subjectsById.get(selected.subject_id)}
      nodeName={selected.node_id ? nodeById.get(selected.node_id)?.name : undefined}
      taskTitle={selected.task_id ? taskById.get(selected.task_id)?.title : undefined}
      thumbnailUrl={thumbnailUrl(selected)}
      onClose={() => setSelectedId(null)}
      onOpen={(source) => void open(source)}
      onEdit={(source) => setDialog({ type: 'form', source })}
      onDelete={(source) => setDialog({ type: 'delete', source })}
    />
  ) : null

  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-shell/85 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Buscar en la biblioteca</span>
              <Input
                value={filters.query}
                onChange={(event) => setFilter('query', event.target.value)}
                placeholder="Buscar por título, descripción o etiqueta"
                leftIcon={<Search className="h-4 w-4" />}
                type="search"
              />
            </label>
            <Button
              variant="secondary"
              className="lg:hidden"
              onClick={() => setFiltersOpen((value) => !value)}
              aria-expanded={filtersOpen}
              leftIcon={<ListFilter className="h-4 w-4" />}
            >
              Filtros{activeCount > 0 ? ` (${activeCount})` : ''}
            </Button>
          </div>

          <div
            className={cn(
              'grid gap-2 sm:grid-cols-2 lg:grid-cols-4',
              !filtersOpen && 'max-lg:hidden',
            )}
          >
            {lockedSubject ? null : (
              <label>
                <span className="sr-only">Asignatura</span>
                <Select
                  value={filters.subjectId}
                  onChange={(event) => setFilter('subjectId', event.target.value)}
                  className="h-10"
                >
                  <option value="all">Todas las asignaturas</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            <label>
              <span className="sr-only">Tipo</span>
              <Select
                value={filters.type}
                onChange={(event) =>
                  setFilter('type', event.target.value as LibraryFilters['type'])
                }
                className="h-10"
              >
                <option value="all">Todos los tipos</option>
                {SOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {SOURCE_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span className="sr-only">Tema</span>
              <Select
                value={filters.nodeId}
                onChange={(event) => setFilter('nodeId', event.target.value)}
                className="h-10"
              >
                <option value="all">Todos los temas</option>
                <option value="none">Sin tema</option>
                {nodeOptions.map(({ node, level }) => (
                  <option key={node.id} value={node.id}>
                    {`${' '.repeat(Math.max(0, level - 1))}${node.name}`}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span className="sr-only">Tarea</span>
              <Select
                value={filters.taskId}
                onChange={(event) => setFilter('taskId', event.target.value)}
                className="h-10"
              >
                <option value="all">Todas las tareas</option>
                <option value="none">Sin tarea</option>
                {taskOptions.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between lg:flex-col lg:items-end">
          <StorageMeter usedBytes={usedBytes} sourceCount={sourceCount} />
          <Button
            onClick={() => setDialog({ type: 'form', source: null })}
            leftIcon={<Plus className="h-4 w-4" />}
            disabled={subjects.length === 0}
          >
            Agregar fuente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Fuentes" className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-2" aria-live="polite">
            <p className="text-sm text-ink-muted">
              {isLoading
                ? 'Cargando la biblioteca…'
                : filtered.length === sources.length
                  ? `${sources.length} fuente${sources.length === 1 ? '' : 's'}`
                  : `${filtered.length} de ${sources.length} fuentes`}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-bright hover:text-rose-soft"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Limpiar filtros
              </button>
            ) : null}
          </div>

          {isError ? (
            <Card>
              <CardContent className="flex flex-col items-center px-4 py-14 text-center">
                <p className="text-base font-bold text-ink">No pudimos cargar la biblioteca</p>
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
          ) : isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-6 w-6" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong/70 bg-sunken/40 px-6 py-14 text-center">
              <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-rose/20 bg-rose/10 text-rose-bright">
                <Library className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-base font-bold text-ink">
                {sources.length === 0
                  ? 'Tu biblioteca está vacía'
                  : 'No hay fuentes con estos filtros'}
              </p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-ink-muted">
                {sources.length === 0
                  ? 'Subí apuntes, libros, fotos del pizarrón o enlaces, y ubicalos en su materia y su tema.'
                  : 'Probá con otra búsqueda o limpiá los filtros.'}
              </p>
              <div className="mt-4">
                {sources.length === 0 ? (
                  <Button
                    onClick={() => setDialog({ type: 'form', source: null })}
                    leftIcon={<Plus className="h-4 w-4" />}
                    disabled={subjects.length === 0}
                  >
                    Agregar fuente
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((source) => (
                  <li key={source.id} className="flex">
                    <SourceCard
                      source={source}
                      subject={subjectsById.get(source.subject_id)}
                      nodeName={source.node_id ? nodeById.get(source.node_id)?.name : undefined}
                      taskTitle={source.task_id ? taskById.get(source.task_id)?.title : undefined}
                      thumbnailUrl={thumbnailUrl(source)}
                      selected={source.id === selectedId}
                      onSelect={(item) => setSelectedId(item.id === selectedId ? null : item.id)}
                      onOpen={(item) => void open(item)}
                      onEdit={(item) => setDialog({ type: 'form', source: item })}
                      onDelete={(item) => setDialog({ type: 'delete', source: item })}
                    />
                  </li>
                ))}
              </ul>
              {filtered.length > visible.length ? (
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  >
                    Mostrar más ({filtered.length - visible.length})
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </section>

        {isWide ? (
          <aside>
            <Card className="lg:sticky lg:top-24">
              <CardContent className="p-5">
                {detail ?? (
                  <div className="py-6 text-center text-sm leading-6 text-ink-muted">
                    <Library
                      className="mx-auto mb-2 h-5 w-5 text-ink-disabled"
                      aria-hidden="true"
                    />
                    Tocá una fuente para ver su detalle: tema, tarea, etiquetas y descripción.
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        ) : null}
      </div>

      {!isWide ? (
        <Dialog open={Boolean(selected)} onOpenChange={(value) => !value && setSelectedId(null)}>
          <DialogContent className={mobileSheetClassName} showClose={false}>
            <DialogTitle className="sr-only">Detalle de la fuente</DialogTitle>
            {detail}
          </DialogContent>
        </Dialog>
      ) : null}

      <SourceFormDialog
        open={dialog.type === 'form'}
        onOpenChange={(value) => !value && setDialog({ type: 'none' })}
        userId={userId}
        source={dialog.type === 'form' ? dialog.source : null}
        subjects={subjects}
        lockedSubjectId={lockedSubject?.id}
        usedBytes={usedBytes}
        sourceCount={sourceCount}
        onSaved={(source) => setSelectedId(source.id)}
      />

      <ConfirmDialog
        open={dialog.type === 'delete'}
        onOpenChange={(value) => !value && setDialog({ type: 'none' })}
        title="Eliminar fuente"
        description={
          dialog.type === 'delete'
            ? dialog.source.storage_path
              ? `Se va a eliminar «${dialog.source.title}» y su archivo. Esta acción no se puede deshacer.`
              : `Se va a eliminar el enlace «${dialog.source.title}».`
            : ''
        }
        confirmLabel="Eliminar fuente"
        onConfirm={() => dialog.type === 'delete' && void handleDelete(dialog.source)}
        loading={remove.isPending}
        destructive
      />
    </>
  )
}
