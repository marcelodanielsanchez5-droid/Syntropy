import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarRange, FolderPlus, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useActiveYearScope } from '@/features/calendar/use-agenda'
import { cn } from '@/lib/cn'
import { getErrorMessage } from '@/lib/errors'
import type { Assessment } from '@/types/database'
import { GradingSettingsDialog } from './GradingSettingsDialog'
import { GRADE_STATUS_BADGES, SubjectGradesView } from './SubjectGradesView'
import { useAssessments, useGradingSettings } from './grade-hooks'
import { formatNumber, formatPlain, scaleLabel } from './grade-math'
import { summarizeSubject } from './grade-summary'

const NO_ASSESSMENTS: Assessment[] = []

/** Calificaciones de todas las materias del año activo: resumen y detalle de la elegida. */
export function GradesPage() {
  const scope = useActiveYearScope()
  const grading = useGradingSettings(scope.userId)
  const subjectIds = useMemo(
    () => scope.subjects.map((subject) => subject.id).sort(),
    [scope.subjects],
  )
  const assessmentsQuery = useAssessments(scope.userId, subjectIds)
  const assessments = assessmentsQuery.data ?? NO_ASSESSMENTS
  const [searchParams, setSearchParams] = useSearchParams()
  const [scaleOpen, setScaleOpen] = useState(false)

  const bySubject = useMemo(() => {
    const groups = new Map<string, Assessment[]>()

    for (const assessment of assessments) {
      groups.set(assessment.subject_id, [...(groups.get(assessment.subject_id) ?? []), assessment])
    }

    return groups
  }, [assessments])

  const requested = searchParams.get('asignatura')
  const selected =
    scope.subjects.find((subject) => subject.id === requested) ?? scope.subjects[0] ?? null

  if (scope.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }

  if (!scope.activeYear || !scope.userId) {
    return (
      <EmptyState
        icon={<CalendarRange className="h-5 w-5" />}
        title="Primero configurá tu año de curso"
        description="Las calificaciones se organizan por las asignaturas del año activo."
        action={
          <Link to="/configuracion?nuevo=anio" className={buttonStyles({ size: 'md' })}>
            Crear año de curso
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={scope.activeYear.name}
        title="Calificaciones"
        description={`${scaleLabel(grading.rules)}. Los pesos son relativos y el promedio se calcula solo.`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setScaleOpen(true)}
            leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          >
            Configurar escala
          </Button>
        }
      />

      {!grading.isLoading && !grading.isConfigured ? (
        <Alert variant="info" title="Confirmá tu escala">
          Por defecto es de {formatPlain(grading.rules.scale_min)} a{' '}
          {formatPlain(grading.rules.scale_max)} y se aprueba con{' '}
          {formatPlain(grading.rules.passing_score)}. Si tu institución usa otra, cambiala antes de
          cargar notas.{' '}
          <button
            type="button"
            onClick={() => setScaleOpen(true)}
            className="font-semibold underline underline-offset-2"
          >
            Configurar escala
          </button>
        </Alert>
      ) : null}

      {scope.subjects.length === 0 ? (
        <EmptyState
          icon={<FolderPlus className="h-5 w-5" />}
          title="Todavía no tenés asignaturas"
          description="Las evaluaciones pertenecen a una asignatura. Creá la primera para empezar."
          action={
            <Link to="/asignaturas/nueva" className={buttonStyles({ size: 'md' })}>
              Agregar asignatura
            </Link>
          }
        />
      ) : assessmentsQuery.isError ? (
        <div className="flex flex-col items-center rounded-2xl border border-line bg-shell/85 px-4 py-14 text-center">
          <p className="text-base font-bold text-ink">No pudimos cargar las calificaciones</p>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">
            {getErrorMessage(assessmentsQuery.error, 'Revisá tu conexión e intentá de nuevo.')}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => void assessmentsQuery.refetch()}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Asignaturas"
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
          >
            {scope.subjects.map((subject) => {
              const summary = summarizeSubject(bySubject.get(subject.id) ?? [], grading.rules)
              const badge = GRADE_STATUS_BADGES[summary.status]
              const isSelected = selected?.id === subject.id

              return (
                <button
                  key={subject.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSearchParams({ asignatura: subject.id }, { replace: true })}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60',
                    isSelected
                      ? 'border-rose/40 bg-rose/[0.08]'
                      : 'border-line bg-shell/85 hover:border-line-strong',
                  )}
                >
                  <span
                    className="h-9 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.color_hex }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {subject.name}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {summary.gradedCount} nota{summary.gradedCount === 1 ? '' : 's'}
                      {summary.pendingCount
                        ? ` · ${summary.pendingCount} pendiente${summary.pendingCount === 1 ? '' : 's'}`
                        : ''}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="text-lg font-extrabold tabular-nums text-ink">
                      {summary.average
                        ? formatNumber(summary.average.score, grading.rules.rounding_decimals)
                        : '—'}
                    </span>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </span>
                </button>
              )
            })}
          </div>

          {assessmentsQuery.isLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-6 w-6" />
            </div>
          ) : selected ? (
            <SubjectGradesView
              userId={scope.userId}
              subject={selected}
              assessments={bySubject.get(selected.id) ?? NO_ASSESSMENTS}
              rules={grading.rules}
            />
          ) : null}
        </>
      )}

      <GradingSettingsDialog
        open={scaleOpen}
        onOpenChange={setScaleOpen}
        userId={scope.userId}
        rules={grading.rules}
        hasAssessments={assessments.length > 0}
      />
    </div>
  )
}
