import { Link } from 'react-router-dom'
import { CalendarRange, Plus } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/features/auth/auth-provider'
import { getActiveYear } from '@/features/academic-years/year-service'
import { useYears } from '@/features/academic-years/year-hooks'
import { NotificationBell } from './NotificationBell'
import { UserMenu } from './UserMenu'

export function TopBar() {
  const { user } = useAuth()
  const { data: years } = useYears(user?.id)
  const activeYear = getActiveYear(years)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-shell/85 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="lg:hidden">
          <Logo to="/inicio" size="sm" showText={false} />
        </div>
        <div className="hidden min-w-0 items-center gap-2 md:flex">
          <span className="text-xs font-medium text-ink-muted">Espacio académico</span>
          <span className="text-ink-disabled">/</span>
          <Link
            to="/configuracion"
            className="inline-flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-semibold text-ink-secondary transition hover:bg-white/5 hover:text-ink"
          >
            <CalendarRange className="h-3.5 w-3.5 text-rose-bright" />
            <span className="max-w-48 truncate">{activeYear?.name ?? 'Sin año activo'}</span>
          </Link>
          {activeYear ? <Badge variant="success">Activo</Badge> : <Badge variant="warning">Configurar</Badge>}
        </div>
        <div className="min-w-0 md:hidden">
          <p className="truncate text-sm font-bold text-ink">Syntropy</p>
          <p className="truncate text-[10px] text-ink-muted">{activeYear?.name ?? 'Sin año activo'}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Link
          to="/asignaturas/nueva"
          className="hidden h-9 items-center gap-1.5 rounded-lg border border-line bg-white/5 px-3 text-xs font-semibold text-ink-secondary transition hover:bg-white/10 hover:text-ink sm:inline-flex"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva asignatura
        </Link>
        <NotificationBell />
        <div className="ml-1 h-6 w-px bg-line" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  )
}
