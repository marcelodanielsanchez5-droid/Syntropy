import type { ReactNode } from 'react'

export function AuthPageHeader({
  title,
  description,
  eyebrow,
}: {
  title: string
  description: ReactNode
  eyebrow?: string
}) {
  return (
    <div className="mb-7 space-y-2">
      {eyebrow ? (
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-bright">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="text-sm leading-6 text-ink-muted">{description}</p>
    </div>
  )
}
