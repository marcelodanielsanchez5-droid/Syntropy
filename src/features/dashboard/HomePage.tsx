import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Circle,
  FolderPlus,
  GraduationCap,
  Plus,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { buttonStyles } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/auth-provider'
import { useYears } from '@/features/academic-years/year-hooks'
import { getActiveYear } from '@/features/academic-years/year-service'
import { useSubjects } from '@/features/subjects/subject-hooks'
import { SubjectCard } from '@/features/subjects/SubjectCard'
import { formatDateRange, getFirstName, getGreeting } from '@/lib/dates'

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'rose',
}: {
  icon: typeof BookOpen
  label: string
  value: string
  hint: string
  accent?: 'rose' | 'purple' | 'info'
}) {
  const accents = {
    rose: 'border-rose/20 bg-rose/10 text-rose-bright',
    purple: 'border-purple/25 bg-purple/10 text-[#d8b4fe]',
    info: 'border-info/20 bg-info/10 text-info',
  }

  return (
    <div className="rounded-2xl border border-line bg-shell/75 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${accents[accent]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-disabled">
          {label}
        </span>
      </div>
      <p className="mt-3 truncate text-xl font-extrabold tracking-tight text-ink">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-ink-muted">{hint}</p>
    </div>
  )
}

function FirstStepsCard({
  hasYear,
  hasSubjects,
}: {
  hasYear: boolean
  hasSubjects: boolean
}) {
  const steps = [
    { label: 'Cuenta creada', done: true },
    { label: 'Año de curso configurado', done: hasYear },
    { label: 'Primera asignatura agregada', done: hasSubjects },
    { label: 'Tareas y calendario', done: false, phase: 'Fase 3' },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Primeros pasos</CardTitle>
          <Badge variant="rose">Fase 2</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-2.5">
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-ink-disabled" />
            )}
            <span
              className={`flex-1 text-xs ${step.done ? 'text-ink-secondary' : 'text-ink-muted'}`}
            >
              {step.label}
            </span>
            {step.phase ? <Badge variant="muted">{step.phase}</Badge> : null}
          </div>
        ))}
        <div className="pt-1">
          <Link
            to={hasYear ? '/asignaturas/nueva' : '/configuracion'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-bright transition hover:text-rose-soft"
          >
            {hasYear ? 'Agregar una asignatura' : 'Configurar mi año'}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export function HomePage() {
  const { user, profile } = useAuth()
  const yearsQuery = useYears(user?.id)
  const activeYear = getActiveYear(yearsQuery.data)
  const subjectsQuery = useSubjects(user?.id, activeYear?.id)
  const subjects = subjectsQuery.data ?? []
  const firstName = getFirstName(profile?.full_name, profile?.username ?? 'estudiante')
  const isLoading = yearsQuery.isLoading || (activeYear && subjectsQuery.isLoading)

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Spinner className="h-7 w-7" />
          <p className="text-sm text-ink-muted">Cargando tu espacio…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="page-grid relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-shell via-shell to-[#1b1230] p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-rose/15 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 right-24 h-56 w-56 rounded-full bg-purple/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="rose">
                <Sparkles className="h-3 w-3" />
                Fase 2
              </Badge>
              {activeYear ? (
                <Badge variant="success">Año activo</Badge>
              ) : (
                <Badge variant="warning">Falta configurar el año</Badge>
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              {getGreeting()}, {firstName}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted sm:text-base">
              {activeYear
                ? `Estás trabajando en ${activeYear.name}. Este es el punto de partida para organizar tus materias.`
                : 'Creá tu primer año de curso para empezar a agrupar asignaturas, fechas y calificaciones.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/asignaturas/nueva" className={buttonStyles({ size: 'md' })}>
              <Plus className="h-4 w-4" />
              Nueva asignatura
            </Link>
            <Link
              to="/configuracion"
              className={buttonStyles({ variant: 'secondary', size: 'md' })}
            >
              <Settings2 className="h-4 w-4" />
              Año de curso
            </Link>
          </div>
        </div>
      </section>

      {!activeYear ? (
        <Card className="border-warning/25 bg-warning/[0.04]">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-warning/25 bg-warning/10 text-warning">
                <CalendarRange className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-ink">Todavía no hay un año activo</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">
                  El año de curso es el contexto de la app: agrupa asignaturas y permite archivar
                  períodos anteriores. Creá uno para continuar.
                </p>
              </div>
            </div>
            <Link to="/configuracion?nuevo=anio" className={buttonStyles({ size: 'md' })}>
              Crear año de curso
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={BookOpen}
            label="Asignaturas"
            value={String(subjects.length)}
            hint={subjects.length === 1 ? 'materia en el año activo' : 'materias en el año activo'}
          />
          <StatCard
            icon={CalendarDays}
            label="Período"
            value={formatDateRange(activeYear.starts_on, activeYear.ends_on)}
            hint={activeYear.name}
            accent="purple"
          />
          <StatCard
            icon={GraduationCap}
            label="Calificaciones"
            value="Fase 4"
            hint="Escala, pesos y promedio"
            accent="info"
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4">
          <PageHeader
            title="Tus asignaturas"
            description={
              activeYear
                ? `Materias de ${activeYear.name}.`
                : 'Cuando configures un año, tus materias van a aparecer acá.'
            }
            actions={
              activeYear ? (
                <Link to="/asignaturas/nueva" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                  <FolderPlus className="h-3.5 w-3.5" />
                  Agregar
                </Link>
              ) : undefined
            }
          />

          {activeYear && subjects.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {subjects.map((subject) => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FolderPlus className="h-5 w-5" />}
              title={activeYear ? 'Tu primera asignatura empieza acá' : 'Primero, tu año de curso'}
              description={
                activeYear
                  ? 'Agregá una materia con su color, docentes y descripción. Después vas a poder sumar tareas, notas y nodos.'
                  : 'Creá un año de curso y volvé para agregar tus asignaturas.'
              }
              action={
                activeYear ? (
                  <Link to="/asignaturas/nueva" className={buttonStyles({ size: 'md' })}>
                    <Plus className="h-4 w-4" />
                    Nueva asignatura
                  </Link>
                ) : (
                  <Link to="/configuracion?nuevo=anio" className={buttonStyles({ size: 'md' })}>
                    <CalendarRange className="h-4 w-4" />
                    Crear año de curso
                  </Link>
                )
              }
            />
          )}
        </section>

        <aside className="space-y-4">
          <FirstStepsCard hasYear={Boolean(activeYear)} hasSubjects={subjects.length > 0} />

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Hoja de ruta</CardTitle>
                <Badge variant="purple">MVP</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Calendario y tareas', phase: 'Fase 3', color: 'text-info' },
                { label: 'Horario y calificaciones', phase: 'Fase 4', color: 'text-warning' },
                { label: 'Nodos de conocimiento', phase: 'Fase 5', color: 'text-[#d8b4fe]' },
                { label: 'Biblioteca', phase: 'Fase 6', color: 'text-success' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-ink-muted">{item.label}</span>
                  <span className={`text-[10px] font-bold ${item.color}`}>{item.phase}</span>
                </div>
              ))}
              <p className="border-t border-line pt-3 text-[11px] leading-5 text-ink-disabled">
                La estructura de datos ya está preparada para estas fases. No se muestran como
                disponibles hasta implementarlas.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
