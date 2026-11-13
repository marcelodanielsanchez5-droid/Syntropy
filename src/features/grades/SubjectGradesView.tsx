import { useState } from 'react'
import { Calculator, CircleCheck, NotebookPen, Plus, Target, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { formatShortDate } from '@/lib/dates'
import type { Assessment, Subject } from '@/types/database'
import { AssessmentDialog } from './AssessmentDialog'
import {
  contribution,
  formatNumber,
  formatPercent,
  formatPlain,
  rulesScale,
  scaleLabel,
  toPercent,
  type GradingRules,
  type SubjectGradeStatus,
} from './grade-math'
import { describeRequirement, summarizeSubject } from './grade-summary'

export const GRADE_STATUS_BADGES: Record<
  SubjectGradeStatus,
  { label: string; variant: 'success' | 'danger' | 'muted' }
> = {
  passing: { label: 'Aprobando', variant: 'success' },
  failing: { label: 'Por debajo', variant: 'danger' },
  'no-data': { label: 'Sin notas', variant: 'muted' },
}

interface SubjectGradesViewProps {
  userId: string
  subject: Subject
  assessments: Assessment[]
  rules: GradingRules
}

/** Evaluaciones de una materia, su promedio y la nota necesaria para aprobar. */
export function SubjectGradesView({ userId, subject, assessments, rules }: SubjectGradesViewProps) {
  const [dialog, setDialog] = useState<{ open: boolean; assessment: Assessment | null }>({
    open: false,
    assessment: null,
  })
  const summary = summarizeSubject(assessments, rules)
  const scale = rulesScale(rules)
  const decimals = rules.rounding_decimals
  const requirement = describeRequirement(summary, rules)
  const passingPercent = toPercent(Number(rules.passing_score), scale)
  const statusBadge = GRADE_STATUS_BADGES[summary.status]

  const openNew = () => setDialog({ open: true, assessment: null })
  const openEdit = (assessment: Assessment) => setDialog({ open: true, assessment })

  function scoreCell(assessment: Assessment) {
    if (assessment.score === null) {
      return <Badge variant="muted">Pendiente</Badge>
    }

    const differentScale =
      Number(assessment.scale_min) !== scale.min || Number(assessment.scale_max) !== scale.max

    return (
      <span className="tabular-nums">
        <span className="font-semibold text-ink">{formatPlain(assessment.score)}</span>
        {differentScale ? (
          <span className="block text-[10px] text-ink-disabled">
            escala {formatPlain(assessment.scale_min)}–{formatPlain(assessment.scale_max)}
          </span>
        ) : null}
      </span>
    )
  }

  function contributionText(assessment: Assessment) {
    const value = contribution(assessment, summary.weights.get(assessment.id) ?? 0, scale)
    return value === null ? '—' : formatNumber(value, 2)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="min-w-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Evaluaciones de {subject.name}</CardTitle>
              <p className="text-xs text-ink-muted">{scaleLabel(rules)}</p>
            </div>
            <Button size="sm" onClick={openNew} leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Nueva evaluación
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!summary.weightsSumTo100 ? (
            <div className="flex gap-2 rounded-lg border border-warning/25 bg-warning/10 p-3 text-xs leading-5 text-[#ffe1a3]">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Los pesos suman {formatPlain(summary.totalWeight)}, no 100. No es un error: cada
                evaluación cuenta según su peso efectivo (la columna en %).
              </p>
            </div>
          ) : null}

          {assessments.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-line-strong/70 bg-sunken/40 px-4 py-10 text-center">
              <NotebookPen className="h-5 w-5 text-ink-disabled" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-ink-secondary">
                Aún no registraste evaluaciones
              </p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-ink-muted">
                Cargá todas las del período con su peso, aunque todavía no tengan nota: así sabés
                cuánto necesitás en cada una.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={openNew}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Nueva evaluación
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-xl border border-line sm:block">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Evaluaciones de {subject.name}: nota, peso y aporte al promedio
                  </caption>
                  <thead className="bg-sunken text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2.5 text-left font-bold">
                        Evaluación
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left font-bold">
                        Fecha
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-bold">
                        Nota
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-bold">
                        Peso
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-bold">
                        Aporte
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map((assessment) => (
                      <tr
                        key={assessment.id}
                        className={cn(
                          'cursor-pointer border-t border-line transition hover:bg-white/[0.03]',
                          summary.next?.id === assessment.id && 'bg-info/[0.05]',
                        )}
                        onClick={() => openEdit(assessment)}
                      >
                        <th scope="row" className="px-3 py-2.5 text-left font-medium text-ink">
                          <button
                            type="button"
                            className="text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60"
                            onClick={(event) => {
                              event.stopPropagation()
                              openEdit(assessment)
                            }}
                          >
                            {assessment.title}
                          </button>
                          {summary.next?.id === assessment.id ? (
                            <Badge variant="info" className="ml-2">
                              Próxima
                            </Badge>
                          ) : null}
                        </th>
                        <td className="px-3 py-2.5 text-ink-muted">
                          {assessment.assessed_on ? formatShortDate(assessment.assessed_on) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right">{scoreCell(assessment)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-ink-secondary">
                          {formatPlain(assessment.weight)}
                          <span className="block text-[10px] text-ink-disabled">
                            {formatPercent(summary.weights.get(assessment.id) ?? 0)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-ink-secondary">
                          {contributionText(assessment)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="space-y-2 sm:hidden">
                {assessments.map((assessment) => (
                  <li key={assessment.id}>
                    <button
                      type="button"
                      onClick={() => openEdit(assessment)}
                      className="w-full rounded-xl border border-line bg-surface/30 p-3 text-left transition hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60"
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {assessment.title}
                          </span>
                          <span className="text-xs text-ink-muted">
                            {assessment.assessed_on
                              ? formatShortDate(assessment.assessed_on)
                              : 'Sin fecha'}
                          </span>
                        </span>
                        {scoreCell(assessment)}
                      </span>
                      <span className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <span className="text-ink-muted">
                          Peso{' '}
                          <span className="font-semibold text-ink-secondary">
                            {formatPlain(assessment.weight)} (
                            {formatPercent(summary.weights.get(assessment.id) ?? 0)})
                          </span>
                        </span>
                        <span className="text-right text-ink-muted">
                          Aporte{' '}
                          <span className="font-semibold text-ink-secondary">
                            {contributionText(assessment)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <aside className="space-y-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-bold text-ink">
                <Calculator className="h-4 w-4 text-rose-bright" aria-hidden="true" />
                Promedio
              </p>
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            </div>
            <p className="mt-3 text-4xl font-extrabold tracking-tight text-ink tabular-nums">
              {summary.average ? formatNumber(summary.average.score, decimals) : '—'}
              <span className="ml-1 text-base font-semibold text-ink-muted">
                / {formatPlain(scale.max)}
              </span>
            </p>
            <div
              className="relative mt-4 h-2.5 rounded-full bg-sunken"
              role="img"
              aria-label={
                summary.average
                  ? `Promedio ${formatNumber(summary.average.score, decimals)}; para aprobar hace falta ${formatPlain(rules.passing_score)}`
                  : 'Todavía no hay notas cargadas'
              }
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  summary.status === 'passing' ? 'bg-success' : 'bg-danger',
                )}
                style={{ width: `${Math.max(0, Math.min(100, summary.average?.percent ?? 0))}%` }}
              />
              <span
                className="absolute -top-1 h-4.5 w-0.5 rounded-full bg-ink"
                style={{ left: `${Math.max(0, Math.min(100, passingPercent))}%` }}
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              {summary.gradedCount} con nota · {summary.pendingCount} pendiente
              {summary.pendingCount === 1 ? '' : 's'} · la marca blanca es el{' '}
              {formatPlain(rules.passing_score)}
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            requirement.tone === 'success' && 'border-success/30',
            requirement.tone === 'danger' && 'border-danger/30',
            requirement.tone === 'info' && 'border-info/30',
          )}
        >
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-ink">
              {requirement.tone === 'success' ? (
                <CircleCheck className="h-4 w-4 text-success" aria-hidden="true" />
              ) : requirement.tone === 'danger' ? (
                <TriangleAlert className="h-4 w-4 text-danger" aria-hidden="true" />
              ) : (
                <Target className="h-4 w-4 text-info" aria-hidden="true" />
              )}
              ¿Qué necesito?
            </p>
            <p
              className={cn(
                'mt-3 text-lg font-bold leading-6',
                requirement.tone === 'success' && 'text-success',
                requirement.tone === 'danger' && 'text-danger',
                requirement.tone === 'info' && 'text-ink',
                requirement.tone === 'muted' && 'text-ink-secondary',
              )}
            >
              {requirement.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">{requirement.detail}</p>
          </CardContent>
        </Card>
      </aside>

      <AssessmentDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        userId={userId}
        rules={rules}
        assessment={dialog.assessment}
        subjects={[subject]}
        lockedSubjectId={subject.id}
      />
    </div>
  )
}
