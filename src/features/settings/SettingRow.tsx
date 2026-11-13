import type { ReactNode } from 'react'

/** Fila de Configuración: título y explicación a la izquierda, control a la derecha. */
export function SettingRow({
  title,
  description,
  titleId,
  children,
}: {
  title: string
  description: ReactNode
  /** Para asociar el título al control (`aria-labelledby`). */
  titleId?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line/70 py-4 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p id={titleId} className="text-sm font-semibold text-ink">
          {title}
        </p>
        <p className="mt-0.5 text-xs leading-5 text-ink-muted">{description}</p>
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  )
}
