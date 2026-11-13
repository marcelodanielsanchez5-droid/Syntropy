import { useCallback, useState } from 'react'
import { ExternalLink, MoreHorizontal, Network, Pencil, SquareCheck, Trash2 } from 'lucide-react'
import { withAlpha } from '@/lib/colors'
import { cn } from '@/lib/cn'
import { useClickOutside } from '@/hooks/use-click-outside'
import type { Source, Subject } from '@/types/database'
import { SourceIcon } from './SourceIcon'
import { SOURCE_TYPE_LABELS } from './library-rules'

/** Vista previa de una fuente: la miniatura si es una imagen, o el ícono de su tipo. */
export function SourceThumb({
  source,
  color,
  thumbnailUrl,
  className,
}: {
  source: Source
  color: string
  thumbnailUrl?: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (thumbnailUrl && !failed) {
    return (
      <img
        src={thumbnailUrl}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn('h-full w-full object-cover', className)}
      />
    )
  }

  return (
    <div
      className={cn('flex h-full w-full items-center justify-center', className)}
      style={{
        background: `linear-gradient(135deg, ${withAlpha(color, 0.22)}, ${withAlpha(color, 0.06)})`,
      }}
    >
      <SourceIcon type={source.source_type} className="h-9 w-9 text-ink-secondary" />
    </div>
  )
}

interface SourceCardProps {
  source: Source
  subject: Subject | undefined
  nodeName?: string
  taskTitle?: string
  thumbnailUrl?: string
  selected: boolean
  onSelect: (source: Source) => void
  onOpen: (source: Source) => void
  onEdit: (source: Source) => void
  onDelete: (source: Source) => void
}

function CardMenu({
  title,
  onOpen,
  onEdit,
  onDelete,
}: {
  title: string
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useClickOutside<HTMLDivElement>(close, open)
  const item =
    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        aria-label={`Opciones de ${title}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition hover:bg-white/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.25rem)] z-20 w-40 rounded-xl border border-line bg-shell p-1 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className={cn(item, 'text-ink-secondary')}
            onClick={() => {
              close()
              onOpen()
            }}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Abrir
          </button>
          <button
            type="button"
            role="menuitem"
            className={cn(item, 'text-ink-secondary')}
            onClick={() => {
              close()
              onEdit()
            }}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Editar
          </button>
          <button
            type="button"
            role="menuitem"
            className={cn(item, 'text-danger hover:bg-danger/10')}
            onClick={() => {
              close()
              onDelete()
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Eliminar
          </button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Tarjeta de la biblioteca: barra y contorno con el color de la asignatura,
 * miniatura, título, tipo, tema y tarea (wireframe 2.10).
 */
export function SourceCard({
  source,
  subject,
  nodeName,
  taskTitle,
  thumbnailUrl,
  selected,
  onSelect,
  onOpen,
  onEdit,
  onDelete,
}: SourceCardProps) {
  const color = subject?.color_hex ?? '#98A2B3'

  return (
    <article
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-2xl border bg-shell/85 transition',
        selected
          ? 'border-rose-bright/60 ring-1 ring-rose-bright/40'
          : 'border-line hover:border-line-strong',
      )}
    >
      <span
        className="h-1.5 w-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={() => onSelect(source)}
        className="flex flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-bright/60"
        aria-label={`${source.title}: ${SOURCE_TYPE_LABELS[source.source_type]} de ${subject?.name ?? 'una asignatura'}. Ver detalle`}
        aria-pressed={selected}
      >
        <div className="aspect-[16/9] w-full overflow-hidden border-b border-line/70">
          <SourceThumb source={source} color={color} thumbnailUrl={thumbnailUrl} />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3.5 pr-11">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-ink">{source.title}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[11px] font-semibold text-ink-secondary"
              style={{ borderColor: color }}
            >
              {subject?.name ?? 'Asignatura'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-ink-muted">
              <SourceIcon type={source.source_type} className="h-3 w-3" />
              {SOURCE_TYPE_LABELS[source.source_type]}
            </span>
          </div>
          <div className="mt-auto space-y-0.5 text-[11px] text-ink-muted">
            <p className="flex items-center gap-1 truncate">
              <Network className="h-3 w-3 shrink-0" aria-hidden="true" />
              {nodeName ?? 'Sin tema'}
            </p>
            {taskTitle ? (
              <p className="flex items-center gap-1 truncate">
                <SquareCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                {taskTitle}
              </p>
            ) : null}
          </div>
        </div>
      </button>
      <div className="absolute bottom-2.5 right-2">
        <CardMenu
          title={source.title}
          onOpen={() => onOpen(source)}
          onEdit={() => onEdit(source)}
          onDelete={() => onDelete(source)}
        />
      </div>
    </article>
  )
}
