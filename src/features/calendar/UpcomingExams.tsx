import { GraduationCap, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatShortDayAndTime } from '@/lib/datetime'
import type { Exam, Subject } from '@/types/database'
import { getExamCountdown } from '@/features/exams/exam-utils'

interface UpcomingExamsProps {
  exams: Exam[]
  subjectsById: Map<string, Subject>
  timeZone: string
  now: Date
  showSubject: boolean
  onOpen: (exam: Exam) => void
  onCreate: () => void
  canCreate?: boolean
  limit?: number
}

export function UpcomingExams({
  exams,
  subjectsById,
  timeZone,
  now,
  showSubject,
  onOpen,
  onCreate,
  canCreate = true,
  limit = 5,
}: UpcomingExamsProps) {
  const upcoming = exams
    .filter((exam) => Date.parse(exam.exam_at) >= now.getTime())
    .sort((a, b) => Date.parse(a.exam_at) - Date.parse(b.exam_at))
    .slice(0, limit)

  return (
    <section aria-labelledby="upcoming-exams-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="upcoming-exams-title" className="text-base font-bold text-ink">
          Próximos exámenes
        </h2>
        <Button
          size="sm"
          variant="secondary"
          onClick={onCreate}
          disabled={!canCreate}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          Examen
        </Button>
      </div>

      {upcoming.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {upcoming.map((exam) => {
            const subject = subjectsById.get(exam.subject_id)
            const countdown = getExamCountdown(exam, { timeZone, now })

            return (
              <li key={exam.id}>
                <button
                  type="button"
                  onClick={() => onOpen(exam)}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface/40 px-3 py-2.5 text-left transition hover:border-line-strong hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60"
                >
                  <span
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${subject?.color_hex ?? '#98A2B3'}26`,
                      color: subject?.color_hex ?? '#98A2B3',
                    }}
                  >
                    <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {exam.title}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {showSubject ? `${subject?.name ?? 'Asignatura'} · ` : ''}
                      {formatShortDayAndTime(exam.exam_at, timeZone)}
                    </span>
                  </span>
                  <Badge variant={countdown.kind === 'upcoming' ? 'purple' : 'warning'}>
                    {countdown.label}
                  </Badge>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-line-strong/70 bg-sunken/40 px-4 py-5 text-center text-sm text-ink-muted">
          No hay exámenes próximos.
        </p>
      )}
    </section>
  )
}
