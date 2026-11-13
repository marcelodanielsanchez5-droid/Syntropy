import { Link } from 'react-router-dom'
import { ExternalLink, Network, Pencil, SquareCheck, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/dates'
import type { Source, Subject } from '@/types/database'
import { SourceThumb } from './SourceCard'
import { SOURCE_TYPE_LABELS, formatBytes } from './library-rules'

interface SourceDetailProps {
  source: Source
  subject: Subject | undefined
  nodeName?: string
  taskTitle?: string
  thumbnailUrl?: string
  onClose: () => void
  onOpen: (source: Source) => void
  onEdit: (source: Source) => void
  onDelete: (source: Source) => void
}

/** Panel de detalle de una fuente (panel derecho del wireframe 2.10). */
export function SourceDetail({
  source,
  subject,
  nodeName,
  taskTitle,
  thumbnailUrl,
  onClose,
  onOpen,
  onEdit,
  onDelete,
}: SourceDetailProps) {
  const color = subject?.color_hex ?? '#98A2B3'
  const host = source.external_url ? safeHost(source.external_url) : null

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rose-bright">
          Detalle
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition hover:bg-white/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60"
          aria-label="Cerrar el detalle"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        className="aspect-[16/10] overflow-hidden rounded-xl border-2"
        style={{ borderColor: color }}
      >
        <SourceThumb source={source} color={color} thumbnailUrl={thumbnailUrl} />
      </div>

      <div>
        <h2 className="text-lg font-bold leading-6 text-ink">{source.title}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span
            className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold text-ink-secondary"
            style={{ borderColor: color }}
          >
            {subject?.name ?? 'Asignatura'}
          </span>
          <Badge variant="default">{SOURCE_TYPE_LABELS[source.source_type]}</Badge>
        </div>
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <Network className="mt-0.5 h-4 w-4 shrink-0 text-ink-disabled" aria-hidden="true" />
          <dt className="sr-only">Tema</dt>
          <dd className="text-ink-secondary">
            {nodeName ?? 'Sin tema'}
            {subject && source.node_id ? (
              <Link
                to={`/asignaturas/${subject.id}/nodos`}
                className="ml-2 text-xs font-semibold text-rose-bright hover:text-rose-soft"
              >
                Ver en el mapa
              </Link>
            ) : null}
          </dd>
        </div>
        <div className="flex items-start gap-2">
          <SquareCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-disabled" aria-hidden="true" />
          <dt className="sr-only">Tarea</dt>
          <dd className="text-ink-secondary">{taskTitle ?? 'No está asociada a una tarea'}</dd>
        </div>
      </dl>

      {source.description ? (
        <p className="whitespace-pre-line rounded-xl border border-line bg-sunken/40 p-3 text-sm leading-6 text-ink-secondary">
          {source.description}
        </p>
      ) : null}

      {source.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Etiquetas">
          {source.tags.map((tag) => (
            <li key={tag}>
              <Badge variant="muted">#{tag}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-xs text-ink-muted">
        {source.storage_path
          ? `Archivo${source.size_bytes ? ` de ${formatBytes(source.size_bytes)}` : ''}`
          : `Enlace a ${host ?? 'un sitio externo'}`}{' '}
        · agregado el {formatDate(source.created_at, "d 'de' MMMM")}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => onOpen(source)}
          leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
        >
          Abrir
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onEdit(source)}
          leftIcon={<Pencil className="h-3.5 w-3.5" />}
        >
          Editar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-danger hover:bg-danger/10 hover:text-danger"
          onClick={() => onDelete(source)}
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
        >
          Eliminar
        </Button>
      </div>
    </div>
  )
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}
