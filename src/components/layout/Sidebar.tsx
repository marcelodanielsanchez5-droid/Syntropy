import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  Clock3,
  GraduationCap,
  Home,
  Library,
  Network,
  Settings,
  UserRound,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/cn'
import { YearSwitcher } from './YearSwitcher'

const primaryItems = [
  { to: '/inicio', label: 'Inicio', icon: Home, end: true },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays, phase: 'F3' },
  { to: '/horario', label: 'Horario', icon: Clock3, phase: 'F4' },
  { to: '/calificaciones', label: 'Calificaciones', icon: GraduationCap, phase: 'F4' },
]

const knowledgeItems = [
  { to: '/nodos', label: 'Nodos', icon: Network, phase: 'F5' },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library, phase: 'F6' },
]

const accountItems = [
  { to: '/perfil', label: 'Perfil', icon: UserRound },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
]

function SidebarLink({
  to,
  label,
  icon: Icon,
  phase,
  end,
}: {
  to: string
  label: string
  icon: typeof Home
  phase?: string
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
          isActive
            ? 'bg-rose/10 text-white'
            : 'text-ink-muted hover:bg-white/5 hover:text-ink-secondary',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-rose-bright transition-opacity',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Icon
            className={cn(
              'h-[18px] w-[18px] shrink-0 transition-colors',
              isActive ? 'text-rose-bright' : 'text-ink-disabled group-hover:text-ink-secondary',
            )}
          />
          <span className="flex-1">{label}</span>
          {phase ? (
            <span className="rounded-full border border-line bg-white/5 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-ink-disabled">
              {phase}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-shell lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-line px-5">
        <Logo to="/inicio" size="sm" />
      </div>

      <div className="border-b border-line py-3">
        <YearSwitcher />
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-disabled">
          Espacio
        </p>
        <div className="space-y-0.5">
          {primaryItems.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </div>

        <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-disabled">
          Conocimiento
        </p>
        <div className="space-y-0.5">
          {knowledgeItems.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </div>

        <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-disabled">
          Cuenta
        </p>
        <div className="space-y-0.5">
          {accountItems.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-line p-4">
        <div className="rounded-xl border border-line bg-sunken/60 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
            <BookOpen className="h-3.5 w-3.5 text-rose-bright" />
            Syntropy 0.1.0
          </div>
          <p className="mt-1 text-[11px] leading-4 text-ink-disabled">
            Fase 2 en desarrollo. El logo es provisional.
          </p>
        </div>
      </div>
    </aside>
  )
}
