import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Circle,
  FolderPlus,
  GraduationCap,
  ListTodo,
  Plus,
  Settings2,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { buttonStyles } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/auth-provider'
import { UpcomingList } from '@/features/calendar/UpcomingList'
import { getNextDueBySubject, getUpcomingItems } from '@/features/calendar/upcoming'
import { useActiveYearAgenda, useProfileTimeZone } from '@/features/calendar/use-agenda'
import { getExamCountdown } from '@/features/exams/exam-utils'
import { DayAgenda } from '@/features/schedule/DayAgenda'
import { useScheduleEntries } from '@/features/schedule/schedule-hooks'
import { WEEKDAY_NAMES, zonedWeekdayAndTime } from '@/features/schedule/schedule-utils'
import { SubjectCard } from '@/features/subjects/SubjectCard'
import { getTaskDueState } from '@/features/tasks/task-utils'
import { useNow } from '@/hooks/use-now'
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
  hasDates,
}: {
  hasYear: boolean
  hasSubjects: boolean
  hasDates: boolean
}) {
  const steps = [
    { label: 'Cuenta creada', done: true },
    { label: 'Año de curso configurado', done: hasYear },
    { label: 'Primera asignatura agregada', done: hasSubjects },
    { label: 'Primera tarea o examen en el calendario', done: hasDates },
  ]
  const next = !hasYear
    ? { to: '/configuracion', label: 'Configurar mi año' }
    : !hasSubjects
      ? { to: '/asignaturas/nueva', label: 'Agregar una asignatura' }
      : { to: '/calendario', label: 'Cargar una fecha en el calendario' }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Primeros pasos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-2.5">
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-label="Hecho" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-ink-disabled" aria-label="Pendiente" />
            )}
            <span
              className={`flex-1 text-xs ${step.done ? 'text-ink-secondary' : 'text-ink-muted'}`}
            >
              {step.label}
            </span>
          </div>
        ))}
        <div className="pt-1">
          <Link
            to={next.to}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-bright transition hover:text-rose-soft"
          >
            {next.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export function HomePage() {
  const { profile } = useAuth()
  const agenda = useActiveYearAgenda()
  const timeZone = useProfileTimeZone()
  const now = useNow()
  const { activeYear, subjects, tasks, exams, subjectsById } = agenda
  const firstName = getFirstName(profile?.full_name, profile?.username ?? 'estudiante')
  // Solo se espera al año; tareas y exámenes completan la pantalla cuando llegan.
  const isLoading = !activeYear && agenda.isLoading

  const weekItems = useMemo(
    () => getUpcomingItems({ tasks, exams, subjectsById, timeZone, now, withinDays: 7 }),
    [tasks, exams, subjectsById, timeZone, now],
  )
  const nextDueBySubject = useMemo(() => getNextDueBySubject(weekItems), [weekItems])
  const openTasks = tasks.filter((task) => task.status !== 'done')
  const overdueCount = openTasks.filter(
    (task) => getTaskDueState(task, { timeZone, now }).kind === 'overdue',
  ).length
  const nextExam = exams.find((exam) => Date.parse(exam.exam_at) >= now.getTime())
  const hasDates = tasks.length > 0 || exams.length > 0
  const scheduleQuery = useScheduleEntries(agenda.userId, activeYear?.id)
  const today = zonedWeekdayAndTime(now, timeZone)

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
                ? `Estás trabajando en ${activeYear.name} (${formatDateRange(activeYear.starts_on, activeYear.ends_on)}).`
                : 'Creá tu primer año de curso para empezar a agrupar asignaturas, fechas y calificaciones.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/calendario" className={buttonStyles({ size: 'md' })}>
              <CalendarDays className="h-4 w-4" />
              Calendario
            </Link>
            <Link
              to="/asignaturas/nueva"
              className={buttonStyles({ variant: 'secondary', size: 'md' })}
            >
              <Plus className="h-4 w-4" />
              Nueva asignatura
            </Link>
            <Link to="/configuracion" className={buttonStyles({ variant: 'ghost', size: 'md' })}>
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
            icon={ListTodo}
            label="Tareas abiertas"
            value={String(openTasks.length)}
            hint={
              overdueCount > 0
                ? `${overdueCount} atrasada${overdueCount === 1 ? '' : 's'}`
                : 'ninguna atrasada'
            }
            accent="info"
          />
          <StatCard
            icon={GraduationCap}
            label="Próximo examen"
            value={nextExam ? getExamCountdown(nextExam, { timeZone, now }).label : 'Ninguno'}
            hint={
              nextExam
                ? `${nextExam.title} · ${subjectsById.get(nextExam.subject_id)?.name ?? ''}`
                : 'sin exámenes cargados'
            }
            accent="purple"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
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
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  nextDue={nextDueBySubject.get(subject.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FolderPlus className="h-5 w-5" />}
              title={activeYear ? 'Tu primera asignatura empieza acá' : 'Primero, tu año de curso'}
              description={
                activeYear
                  ? 'Agregá una materia con su color, docentes y descripción. Después vas a poder cargarle tareas y exámenes.'
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
          {activeYear && (scheduleQuery.data?.length ?? 0) > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Hoy · {WEEKDAY_NAMES[today.weekday]}</CardTitle>
                  <Link
                    to="/horario"
                    className="text-xs font-semibold text-rose-bright hover:text-rose-soft"
                  >
                    Ver horario
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <DayAgenda
                  entries={scheduleQuery.data ?? []}
                  subjectsById={subjectsById}
                  weekday={today.weekday}
                  currentTime={today.time}
                  emptyMessage="Hoy no tenés clases ni actividades."
                />
              </CardContent>
            </Card>
          ) : null}

          {activeYear && subjects.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Esta semana</CardTitle>
                  <Link
                    to="/calendario"
                    className="text-xs font-semibold text-rose-bright hover:text-rose-soft"
                  >
                    Ver calendario
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-3">
                {weekItems.length > 0 ? (
                  <UpcomingList items={weekItems.slice(0, 6)} timeZone={timeZone} />
                ) : (
                  <div className="flex flex-col items-center px-3 py-6 text-center">
                    <CalendarCheck className="h-5 w-5 text-success" aria-hidden="true" />
                    <p className="mt-2 text-sm text-ink-muted">
                      {agenda.isLoading ? 'Cargando tus fechas…' : 'Nada vence en los próximos 7 días.'}
                    </p>
                  </div>
                )}
                {weekItems.length > 6 ? (
                  <p className="px-2.5 pt-2 text-xs text-ink-disabled">
                    Y {weekItems.length - 6} más en el calendario.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {!activeYear || subjects.length === 0 || !hasDates ? (
            <FirstStepsCard
              hasYear={Boolean(activeYear)}
              hasSubjects={subjects.length > 0}
              hasDates={hasDates}
            />
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Hoja de ruta</CardTitle>
                <Badge variant="purple">MVP</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Calendario y tareas', phase: 'Disponible', color: 'text-success' },
                { label: 'Horario y calificaciones', phase: 'Disponible', color: 'text-success' },
                { label: 'Nodos de conocimiento', phase: 'Disponible', color: 'text-success' },
                { label: 'Biblioteca', phase: 'Disponible', color: 'text-success' },
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
