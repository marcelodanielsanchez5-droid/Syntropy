import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Library,
  LogOut,
  Network,
  Settings,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/Badge'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  mobileSheetClassName,
} from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/auth-provider'
import { cn } from '@/lib/cn'

// `phase` marca accesos de fases futuras (hoy no hay ninguno).
const links: Array<{ to: string; label: string; icon: typeof Network; phase?: string }> = [
  { to: '/nodos', label: 'Nodos de conocimiento', icon: Network },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library },
  { to: '/perfil', label: 'Mi perfil', icon: UserRound },
  { to: '/configuracion', label: 'Configuración y año de curso', icon: Settings },
]

export function MobileMoreSheet() {
  const [open, setOpen] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    setOpen(false)

    try {
      await signOut()
      navigate('/ingresar', { replace: true })
      toast.success('Cerraste sesión.')
    } catch {
      toast.error('No pudimos cerrar la sesión.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-ink-muted transition hover:text-ink"
        aria-label="Más opciones"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-line/80 bg-white/5">
          <BookOpen className="h-3.5 w-3.5" />
        </span>
        Más
      </button>
      <DialogContent className={cn(mobileSheetClassName, 'max-sm:max-h-[82dvh]')}>
        <DialogHeader>
          <DialogTitle>Más opciones</DialogTitle>
          <DialogDescription>Accesos, cuenta y preferencias.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          {links.map(({ to, label, icon: Icon, phase }) => (
            <DialogClose key={to} asChild>
              <Link
                to={to}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink-secondary transition hover:bg-white/5 hover:text-ink"
              >
                <Icon className="h-5 w-5 text-ink-muted" />
                <span className="flex-1">{label}</span>
                {phase ? <Badge variant="purple">{phase}</Badge> : null}
              </Link>
            </DialogClose>
          ))}
        </div>

        <div className="my-4 h-px bg-line" />

        <button
          type="button"
          onClick={() => {
            void handleSignOut()
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-danger transition hover:bg-danger/10"
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </button>
      </DialogContent>
    </Dialog>
  )
}
