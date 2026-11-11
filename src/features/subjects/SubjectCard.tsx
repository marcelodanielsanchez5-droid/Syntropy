import { Link } from 'react-router-dom'
import { ArrowUpRight, FolderOpen } from 'lucide-react'
import type { Subject } from '@/types/database'
import { withAlpha } from '@/lib/colors'
import { formatTeacherNames } from './subject-utils'

export function SubjectCard({ subject }: { subject: Subject }) {
  return (
    <Link
      to={`/asignaturas/${subject.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-shell/85 p-5 transition hover:-translate-y-0.5 hover:border-line-strong hover:bg-shell focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/50"
      style={{ boxShadow: `inset 3px 0 0 ${subject.color_hex}` }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-60"
        style={{
          background: `linear-gradient(135deg, ${withAlpha(subject.color_hex, 0.16)}, transparent 70%)`,
        }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border"
          style={{
            borderColor: withAlpha(subject.color_hex, 0.28),
            backgroundColor: withAlpha(subject.color_hex, 0.14),
            color: subject.color_hex,
          }}
        >
          <FolderOpen className="h-5 w-5" />
        </span>
        <ArrowUpRight className="h-4 w-4 text-ink-disabled transition group-hover:text-ink-secondary" />
      </div>

      <div className="relative mt-4 min-w-0 flex-1">
        <h3 className="truncate text-base font-bold text-ink">{subject.name}</h3>
        <p className="mt-1 truncate text-xs text-ink-muted">
          {formatTeacherNames(subject.teacher_names)}
        </p>
        <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-ink-muted">
          {subject.description || 'Sin descripción todavía.'}
        </p>
      </div>

      <div className="relative mt-4 flex items-center gap-2 border-t border-line/70 pt-3">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: subject.color_hex }}
        />
        <span className="text-[11px] font-medium text-ink-disabled">Ver información</span>
      </div>
    </Link>
  )
}
