import { useState } from 'react'
import {
  BookOpenCheck,
  CalendarClock,
  Check,
  Clock,
  MapPin,
  Pencil,
  RotateCcw,
  SkipForward,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  mobileSheetClassName,
} from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { formatDayAndTime } from '@/lib/datetime'
import { getErrorMessage } from '@/lib/errors'
import type { Exam, StudySession, StudySessionStatus, Subject } from '@/types/database'
import { useDeleteExam, useSetStudySessionStatus } from './exam-hooks'
import { STUDY_SESSION_STATUS_LABELS, getExamCountdown } from './exam-utils'
import { describeStudyPlan, examToStudyPlan } from './study-plan'

interface ExamDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  timeZone: string
  now: Date
  exam: Exam | null
  subject: Subject | undefined
  sessions: StudySession[]
  /** Sesión que se tocó en el calendario, para resaltarla. */
  highlightSessionId?: string
  onEdit: (exam: Exam) => void
}

const SESSION_BADGES: Record<StudySessionStatus, BadgeVariant> = {
  scheduled: 'info',
  completed: 'success',
  skipped: 'muted',
}

export function ExamDetailDialog({
  open,
  onOpenChange,
  userId,
  timeZone,
  now,
  exam,
  subject,
  sessions,
  highlightSessionId,
  onEdit,
}: ExamDetailDialogProps) {
  const deleteExam = useDeleteExam(userId)
  const setSessionStatus = useSetStudySessionStatus(userId)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!exam) {
    return null
  }

  const currentExam = exam
  const countdown = getExamCountdown(exam, { timeZone, now })
  const plan = examToStudyPlan(exam)
  const completed = sessions.filter((session) => session.status === 'completed').length

  async function handleDelete() {
    try {
      await deleteExam.mutateAsync(currentExam.id)
      setConfirmDelete(false)
      onOpenChange(false)
      toast.success('Examen eliminado.')
    } catch (error) {
      setConfirmDelete(false)
      toast.error(getErrorMessage(error, 'No pudimos eliminar el examen.'))
    }
  }

  function changeSession(session: StudySession, status: StudySessionStatus) {
    setSessionStatus.mutate(
      { sessionId: session.id, status },
      {
        onError: (error) =>
          toast.error(getErrorMessage(error, 'No pudimos actualizar la sesión de estudio.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-xl overflow-x-hidden', mobileSheetClassName)}>
        <span
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ backgroundColor: subject?.color_hex ?? '#98A2B3' }}
          aria-hidden="true"
        />
        <DialogHeader>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-bright">
            Examen · {subject?.name ?? 'Asignatura'}
          </p>
          <DialogTitle className="text-xl">{exam.title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                countdown.kind === 'past'
                  ? 'muted'
                  : countdown.kind === 'upcoming'
                    ? 'purple'
                    : 'warning'
              }
            >
              <CalendarClock className="h-3 w-3" aria-hidden="true" />
              {countdown.label}
            </Badge>
            <span>{formatDayAndTime(exam.exam_at, timeZone)}</span>
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 text-ink-secondary">
            <Clock className="h-4 w-4 text-ink-disabled" aria-hidden="true" />
            <dt className="sr-only">Duración</dt>
            <dd>
              {exam.duration_minutes ? `${exam.duration_minutes} minutos` : 'Sin duración cargada'}
            </dd>
          </div>
          <div className="flex items-center gap-2 text-ink-secondary">
            <MapPin className="h-4 w-4 text-ink-disabled" aria-hidden="true" />
            <dt className="sr-only">Lugar</dt>
            <dd className="truncate">{exam.location || 'Sin lugar cargado'}</dd>
          </div>
        </dl>

        {exam.description ? (
          <p className="mt-4 whitespace-pre-line rounded-xl border border-line bg-sunken/40 p-3.5 text-sm leading-6 text-ink-secondary">
            {exam.description}
          </p>
        ) : null}

        <section className="mt-5" aria-labelledby="exam-plan-title">
          <div className="flex items-center justify-between gap-2">
            <h3 id="exam-plan-title" className="flex items-center gap-2 text-sm font-bold text-ink">
              <BookOpenCheck className="h-4 w-4 text-[#d8b4fe]" aria-hidden="true" />
              Plan de estudio
            </h3>
            {sessions.length > 0 ? (
              <span className="text-xs text-ink-muted">
                {completed} de {sessions.length} completadas
              </span>
            ) : null}
          </div>

          {plan ? (
            <p className="mt-1 text-xs text-ink-muted">{describeStudyPlan(plan)}.</p>
          ) : (
            <p className="mt-1 text-xs text-ink-muted">
              Este examen no tiene plan de estudio. Podés armarlo desde Editar.
            </p>
          )}

          {sessions.length > 0 ? (
            <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
              {sessions.map((session) => {
                const past = Date.parse(session.scheduled_at) < now.getTime()

                return (
                  <li
                    key={session.id}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2',
                      session.id === highlightSessionId
                        ? 'border-rose-bright/60 bg-rose/10'
                        : 'border-line-strong/70 bg-sunken/30',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-ink-secondary">
                        {formatDayAndTime(session.scheduled_at, timeZone)}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge variant={SESSION_BADGES[session.status]}>
                          {STUDY_SESSION_STATUS_LABELS[session.status]}
                        </Badge>
                        <span className="text-[11px] text-ink-disabled">
                          {session.duration_minutes} min
                          {past && session.status === 'scheduled' ? ' · ya pasó' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {session.status === 'scheduled' ? (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 px-2"
                            onClick={() => changeSession(session, 'completed')}
                            aria-label={`Marcar como completada la sesión del ${formatDayAndTime(session.scheduled_at, timeZone)}`}
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">Hecha</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => changeSession(session, 'skipped')}
                            aria-label={`Saltear la sesión del ${formatDayAndTime(session.scheduled_at, timeZone)}`}
                          >
                            <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => changeSession(session, 'scheduled')}
                          aria-label={`Volver a programar la sesión del ${formatDayAndTime(session.scheduled_at, timeZone)}`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : plan ? (
            <p className="mt-3 rounded-lg border border-dashed border-line-strong/70 px-3 py-2.5 text-xs text-ink-muted">
              No quedan sesiones programadas.
            </p>
          ) : null}
        </section>

        <DialogFooter className="items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-danger hover:bg-danger/10 hover:text-danger"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() => setConfirmDelete(true)}
          >
            Eliminar
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button
              type="button"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => onEdit(currentExam)}
            >
              Editar
            </Button>
          </div>
        </DialogFooter>

        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Eliminar examen"
          description={`Se va a eliminar “${exam.title}” junto con sus sesiones de estudio. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar examen"
          onConfirm={() => void handleDelete()}
          loading={deleteExam.isPending}
          destructive
        />
      </DialogContent>
    </Dialog>
  )
}
