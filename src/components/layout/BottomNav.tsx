import { NavLink, useLocation } from 'react-router-dom'
import { CalendarDays, Clock3, GraduationCap, Home } from 'lucide-react'
import { cn } from '@/lib/cn'
import { MobileMoreSheet } from './MobileMoreSheet'

const items = [
  { to: '/inicio', label: 'Inicio', icon: Home, end: true },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/horario', label: 'Horario', icon: Clock3 },
  { to: '/calificaciones', label: 'Notas', icon: GraduationCap },
]

const morePaths = ['/nodos', '/biblioteca', '/perfil', '/configuracion']

export function BottomNav() {
  const location = useLocation()
  const moreActive = morePaths.some((path) => location.pathname.startsWith(path))

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-shell/95 pb-safe backdrop-blur-md lg:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition',
                isActive ? 'text-rose-bright' : 'text-ink-muted hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-6 w-9 items-center justify-center rounded-lg transition',
                    isActive && 'bg-rose/12',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
        <div className={cn('flex flex-1', moreActive && 'text-rose-bright')}>
          <MobileMoreSheet />
        </div>
      </div>
    </nav>
  )
}
