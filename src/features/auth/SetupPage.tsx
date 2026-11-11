import { Link } from 'react-router-dom'
import { CheckCircle2, Database, KeyRound, RefreshCw, Terminal } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button, buttonStyles } from '@/components/ui/Button'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { env } from '@/lib/env'

const steps = [
  {
    icon: KeyRound,
    title: 'Creá el proyecto en Supabase',
    description:
      'Entrá a supabase.com, creá un proyecto de desarrollo y copiá la URL y la anon key pública desde Project Settings → API.',
  },
  {
    icon: Terminal,
    title: 'Completá las variables locales',
    description:
      'Copiá .env.example a .env.local y reemplazá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. La service_role nunca va en el frontend.',
  },
  {
    icon: Database,
    title: 'Aplicá las migraciones',
    description:
      'Ejecutá 001_schema_inicial.sql y 002_ajustes_fase2.sql en el SQL Editor o con Supabase CLI. Después verificá las tablas y RLS.',
  },
  {
    icon: RefreshCw,
    title: 'Reiniciá el servidor',
    description:
      'Detené y volvé a iniciar npm run dev para que Vite lea las nuevas variables. Luego creá una cuenta de prueba.',
  },
]

export function SetupPage() {
  return (
    <AuthLayout>
      <div className="mb-7 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-warning">
          Configuración inicial
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          Conectá tu proyecto de Supabase
        </h1>
        <p className="text-sm leading-6 text-ink-muted">
          La interfaz y la lógica están listas. Falta enlazar la base de datos para habilitar el
          registro, el ingreso y tus datos académicos.
        </p>
      </div>

      {env.isConfigured ? (
        <Alert variant="success" className="mb-5">
          Supabase parece estar configurado. Si la app no carga, revisá la consola del navegador.
        </Alert>
      ) : (
        <Alert variant="warning" className="mb-5">
          No se detectaron credenciales válidas en el entorno.
        </Alert>
      )}

      <div className="space-y-3">
        {steps.map(({ icon: Icon, title, description }, index) => (
          <div key={title} className="flex gap-3 rounded-xl border border-line bg-shell/70 p-4">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white/5 text-rose-bright">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {index + 1}. {title}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-ink-muted">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs font-semibold text-ink-secondary">Comandos de referencia</p>
        <pre className="scrollbar-thin overflow-x-auto rounded-xl border border-line bg-[#0a1019] p-4 text-[11px] leading-5 text-ink-secondary">
          <code>{`copy .env.example .env.local
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
npm run dev`}</code>
        </pre>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Ya configuré, recargar
        </Button>
        <Link to="/ingresar" className={buttonStyles({ variant: 'secondary', className: 'flex-1' })}>
          <CheckCircle2 className="h-4 w-4" />
          Ir a ingresar
        </Link>
      </div>
    </AuthLayout>
  )
}
