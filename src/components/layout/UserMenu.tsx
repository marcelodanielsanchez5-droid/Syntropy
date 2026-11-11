import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/features/auth/auth-provider'
import { useAvatarUrl } from '@/features/profile/use-avatar-url'
import { useClickOutside } from '@/hooks/use-click-outside'
import { cn } from '@/lib/cn'

export function UserMenu() {
  const { profile, user, signOut } = useAuth()
  const { data: avatarUrl } = useAvatarUrl(profile?.avatar_path)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const close = useCallback(() => setOpen(false), [])
  const ref = useClickOutside<HTMLDivElement>(close, open)

  const displayName = profile?.full_name?.trim() || profile?.username || 'Mi cuenta'
  const secondary = user?.email ?? (profile ? `@${profile.username}` : '')

  async function handleSignOut() {
    setOpen(false)

    try {
      await signOut()
      navigate('/ingresar', { replace: true })
      toast.success('Cerraste sesión.')
    } catch {
      toast.error('No pudimos cerrar la sesión. Intentá de nuevo.')
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex items-center gap-2.5 rounded-xl border border-transparent p-1 pr-1.5 transition hover:border-line hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/40',
          open && 'border-line bg-white/5',
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar name={displayName} src={avatarUrl} size="md" />
        <span className="hidden min-w-0 text-left xl:block">
          <span className="block max-w-36 truncate text-sm font-semibold text-ink">{displayName}</span>
          <span className="block max-w-36 truncate text-[11px] text-ink-muted">{secondary}</span>
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-ink-muted xl:block" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 animate-slide-up overflow-hidden rounded-2xl border border-line bg-shell shadow-2xl"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
            <p className="truncate text-xs text-ink-muted">{secondary}</p>
          </div>
          <div className="p-1.5">
            <Link
              to="/perfil"
              role="menuitem"
              onClick={close}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-secondary transition hover:bg-white/5 hover:text-ink"
            >
              <UserRound className="h-4 w-4" />
              Mi perfil
            </Link>
            <Link
              to="/configuracion"
              role="menuitem"
              onClick={close}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-secondary transition hover:bg-white/5 hover:text-ink"
            >
              <Settings className="h-4 w-4" />
              Configuración
            </Link>
          </div>
          <div className="border-t border-line p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void handleSignOut()
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition hover:bg-danger/10"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
