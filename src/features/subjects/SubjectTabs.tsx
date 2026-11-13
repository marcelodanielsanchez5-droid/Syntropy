import { Link } from 'react-router-dom'
import { CalendarDays, GraduationCap, Info, Library, Network, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export type SubjectTab = 'calendario' | 'informacion' | 'calificaciones' | 'nodos' | 'biblioteca'

const TABS: Array<{
  key: SubjectTab
  label: string
  icon: LucideIcon
  phase?: string
}> = [
  { key: 'calendario', label: 'Calendario', icon: CalendarDays },
  { key: 'informacion', label: 'Información', icon: Info },
  { key: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
  { key: 'nodos', label: 'Nodos', icon: Network },
  { key: 'biblioteca', label: 'Biblioteca', icon: Library },
]

/** Pestañas de la asignatura. Las de fases futuras se ven, pero marcadas como próximas. */
export function SubjectTabs({ subjectId, active }: { subjectId: string; active: SubjectTab }) {
  return (
    <nav
      aria-label="Secciones de la asignatura"
      className="-mx-4 overflow-x-auto px-4 scrollbar-thin sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max gap-1 border-b border-line">
        {TABS.map(({ key, label, icon: Icon, phase }) => {
          const isActive = key === active

          return (
            <li key={key}>
              <Link
                to={`/asignaturas/${subjectId}/${key}`}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative -mb-px inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-bright/60',
                  isActive
                    ? 'border-rose-bright text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink-secondary',
                  phase && !isActive && 'text-ink-disabled',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
                {phase ? (
                  <span className="rounded-full border border-line bg-white/5 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-ink-disabled">
                    {phase}
                    <span className="sr-only"> · próximamente</span>
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
