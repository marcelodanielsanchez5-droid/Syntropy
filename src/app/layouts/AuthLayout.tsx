import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, Layers3, Sparkles } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { env } from '@/lib/env'

const features = [
  {
    icon: Layers3,
    title: 'Un año, todas tus materias',
    description: 'Organizá asignaturas, docentes y fechas en un mismo espacio.',
  },
  {
    icon: CalendarRange,
    title: 'El tiempo bajo control',
    description: 'Tareas, exámenes y horario se van a encontrar acá.',
  },
  {
    icon: Sparkles,
    title: 'Progreso visible',
    description: 'Notas, nodos de conocimiento y biblioteca, sin ruido.',
  },
]

function BrandOrbit() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="orbit-ring left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 opacity-70" />
      <div className="orbit-ring left-1/2 top-1/2 h-[21rem] w-[21rem] -translate-x-1/2 -translate-y-1/2 opacity-80" />
      <div className="orbit-ring left-1/2 top-1/2 h-[12rem] w-[12rem] -translate-x-1/2 -translate-y-1/2 border-rose-bright/20" />
      <div className="orbit-node left-[18%] top-[27%]" />
      <div className="orbit-node left-[76%] top-[34%] !bg-[#b84dff] !shadow-[0_0_0_5px_rgba(184,77,255,0.14),0_0_22px_rgba(184,77,255,0.8)]" />
      <div className="orbit-node left-[63%] top-[73%] !h-2 !w-2 !bg-[#7fe7ff] !shadow-[0_0_0_4px_rgba(127,231,255,0.12),0_0_18px_rgba(127,231,255,0.75)]" />
      <div className="absolute left-[18%] top-[27%] h-px w-[38%] rotate-[8deg] bg-gradient-to-r from-rose-bright/30 to-transparent" />
      <div className="absolute left-[63%] top-[73%] h-px w-[28%] -rotate-[28deg] bg-gradient-to-r from-[#7fe7ff]/25 to-transparent" />
    </div>
  )
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[1.06fr_0.94fr]">
      <aside className="auth-visual hidden min-h-dvh flex-col justify-between p-10 lg:flex xl:p-14">
        <div className="auth-grid" />
        <BrandOrbit />

        <div className="relative z-10">
          <Logo size="md" subtitle="Organización académica" />
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-ink-secondary backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-bright shadow-[0_0_10px_rgba(255,71,141,0.9)]" />
            Versión 0.1.0 · Fase 2
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.035em] text-white xl:text-5xl">
            Tu año académico,
            <br />
            <span className="brand-text">en orden.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-ink-secondary">
            Un espacio personal para estudiar con claridad: materias, fechas, notas y todo lo que
            necesitás, sin perder el hilo.
          </p>

          <div className="mt-9 space-y-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-rose-soft">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs leading-5 text-ink-muted">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-ink-disabled">
          <span>Hecho para estudiar con claridad.</span>
          <span>© 2026 Syntropy</span>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col bg-canvas">
        <header className="flex h-20 items-center justify-between border-b border-line/70 px-5 lg:hidden">
          <Logo to="/ingresar" size="sm" />
          <span className="rounded-full border border-line bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-ink-muted">
            0.1.0
          </span>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-line/60 px-5 py-5 text-[11px] text-ink-disabled sm:flex-row sm:px-8">
          <span>© 2026 Syntropy · Fase 2</span>
          <div className="flex items-center gap-4">
            <Link to="/legal/terminos" className="transition hover:text-ink-secondary">
              Términos
            </Link>
            <Link to="/legal/privacidad" className="transition hover:text-ink-secondary">
              Privacidad
            </Link>
            {!env.isConfigured ? (
              <Link to="/configuracion-inicial" className="text-warning transition hover:text-ink">
                Supabase sin configurar
              </Link>
            ) : null}
          </div>
        </footer>
      </main>
    </div>
  )
}
