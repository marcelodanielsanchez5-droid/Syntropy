import { useMemo, useState } from 'react'
import { CalendarPlus, GraduationCap, ListTodo, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { ExamDetailDialog } from '@/features/exams/ExamDetailDialog'
import { ExamDialog } from '@/features/exams/ExamDialog'
import { DEFAULT_EXAM_BLOCK_MINUTES } from '@/features/exams/exam-utils'
import type { TimeBlock } from '@/features/exams/study-plan'
import { TaskDialog } from '@/features/tasks/TaskDialog'
import { TaskPanel } from '@/features/tasks/TaskPanel'
import { useSetTaskStatus } from '@/features/tasks/task-hooks'
import { filterTasks, type TaskStatusFilter } from '@/features/tasks/task-utils'
import { useNow } from '@/hooks/use-now'
import { formatLongDay, zonedToUtcIso } from '@/lib/datetime'
import { getErrorMessage } from '@/lib/errors'
import type { Exam, StudySession, Subject, Task, TaskStatus } from '@/types/database'
import { CalendarView } from './CalendarView'
import { UpcomingExams } from './UpcomingExams'
import { buildCalendarEvents, type CalendarItemRef, type CalendarMode } from './calendar-events'

type DialogState =
  | { type: 'none' }
  | { type: 'choose'; date: string }
  | { type: 'task'; task: Task | null; dueDate?: string }
  | { type: 'exam-form'; exam: Exam | null; examDate?: string }
  | { type: 'exam-detail'; examId: string; sessionId?: string }

interface CalendarWorkspaceProps {
  mode: CalendarMode
  userId: string
  timeZone: string
  /** Asignaturas entre las que se puede elegir al crear. */
  subjects: Subject[]
  subjectsById: Map<string, Subject>
  /** En el calendario de una asignatura, todo se crea en ella. */
  lockedSubject?: Subject
  tasks: Task[]
  exams: Exam[]
  sessions: StudySession[]
  /** Exámenes y sesiones de todo el año, para avisar de superposiciones. */
  busyExams?: Exam[]
  busySessions?: StudySession[]
  /** Filtro por asignatura del calendario general. */
  subjectFilter?: string
  isLoading: boolean
  isError: boolean
  error?: unknown
  onRetry: () => void
}

export function CalendarWorkspace({
  mode,
  userId,
  timeZone,
  subjects,
  subjectsById,
  lockedSubject,
  tasks,
  exams,
  sessions,
  busyExams = exams,
  busySessions = sessions,
  subjectFilter = 'all',
  isLoading,
  isError,
  error,
  onRetry,
}: CalendarWorkspaceProps) {
  const now = useNow()
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all')
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' })
  const setTaskStatus = useSetTaskStatus(userId)
  const canCreate = subjects.length > 0

  const visibleTasks = useMemo(
    () => filterTasks(tasks, { subjectId: subjectFilter }),
    [tasks, subjectFilter],
  )
  const visibleExams = useMemo(
    () =>
      subjectFilter === 'all' ? exams : exams.filter((exam) => exam.subject_id === subjectFilter),
    [exams, subjectFilter],
  )

  // El filtro de estado del panel también se aplica al calendario.
  const events = useMemo(
    () =>
      buildCalendarEvents({
        tasks: filterTasks(visibleTasks, { status: statusFilter }),
        exams: visibleExams,
        sessions,
        subjectsById,
        mode,
        timeZone,
        now,
      }),
    [visibleTasks, statusFilter, visibleExams, sessions, subjectsById, mode, timeZone, now],
  )

  const busyBlocks = useMemo<TimeBlock[]>(() => {
    const examTitles = new Map(busyExams.map((exam) => [exam.id, exam.title]))

    return [
      ...busyExams.map((exam) => ({
        id: exam.id,
        label: `${exam.title} (${subjectsById.get(exam.subject_id)?.name ?? 'examen'})`,
        start: exam.exam_at,
        minutes: exam.duration_minutes ?? DEFAULT_EXAM_BLOCK_MINUTES,
      })),
      ...busySessions.map((session) => ({
        // Todas las sesiones de un examen comparten id: el aviso las nombra una sola vez
        // y el formulario descarta las del examen que se está editando.
        id: `${session.exam_id}:estudio`,
        label: `estudio de ${examTitles.get(session.exam_id) ?? 'otro examen'}`,
        start: session.scheduled_at,
        minutes: session.duration_minutes,
      })),
    ]
  }, [busyExams, busySessions, subjectsById])

  const detailExam =
    dialog.type === 'exam-detail' ? (exams.find((exam) => exam.id === dialog.examId) ?? null) : null

  function openItem(ref: CalendarItemRef) {
    if (ref.type === 'task') {
      const task = tasks.find((item) => item.id === ref.id)

      if (task) {
        setDialog({ type: 'task', task })
      }

      return
    }

    setDialog({
      type: 'exam-detail',
      examId: ref.type === 'exam' ? ref.id : ref.examId,
      sessionId: ref.type === 'session' ? ref.id : undefined,
    })
  }

  function changeStatus(task: Task, status: TaskStatus) {
    setTaskStatus.mutate(
      { taskId: task.id, status },
      {
        onError: (nextError) =>
          toast.error(getErrorMessage(nextError, 'No pudimos cambiar el estado de la tarea.')),
      },
    )
  }

  function closeDialog(open: boolean) {
    if (!open) {
      setDialog({ type: 'none' })
    }
  }

  const panel = (
    <TaskPanel
      tasks={visibleTasks}
      subjectsById={subjectsById}
      mode={mode}
      timeZone={timeZone}
      now={now}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      onCreate={() => setDialog({ type: 'task', task: null })}
      onOpen={(task) => setDialog({ type: 'task', task })}
      onStatusChange={changeStatus}
      canCreate={canCreate}
    />
  )

  const upcomingExams = (
    <UpcomingExams
      exams={visibleExams}
      subjectsById={subjectsById}
      timeZone={timeZone}
      now={now}
      showSubject={mode === 'general'}
      onOpen={(exam) => setDialog({ type: 'exam-detail', examId: exam.id })}
      onCreate={() => setDialog({ type: 'exam-form', exam: null })}
      canCreate={canCreate}
    />
  )

  return (
    <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0">
          <CardContent className="p-3 pt-4 sm:p-5">
            {isError ? (
              <div className="flex flex-col items-center px-4 py-16 text-center">
                <p className="text-base font-bold text-ink">No pudimos cargar el calendario</p>
                <p className="mt-1 max-w-sm text-sm text-ink-muted">
                  {getErrorMessage(error, 'Revisá tu conexión e intentá de nuevo.')}
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={onRetry}
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                >
                  Reintentar
                </Button>
              </div>
            ) : (
              <div className="relative">
                {isLoading ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-shell/60">
                    <Spinner className="h-6 w-6" />
                    <span className="sr-only">Cargando el calendario…</span>
                  </div>
                ) : null}
                <CalendarView
                  events={events}
                  timeZone={timeZone}
                  now={now}
                  onSelectItem={openItem}
                  onSelectDate={(date) => {
                    if (canCreate) {
                      setDialog({ type: 'choose', date })
                    }
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <aside className="space-y-6">
          <Card>
            <CardContent className="p-5">{panel}</CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">{upcomingExams}</CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={dialog.type === 'choose'} onOpenChange={closeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Qué querés agregar?</DialogTitle>
            <DialogDescription>
              {dialog.type === 'choose'
                ? formatLongDay(zonedToUtcIso(dialog.date, '12:00', timeZone), timeZone)
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="secondary"
              size="lg"
              leftIcon={<ListTodo className="h-4 w-4" />}
              onClick={() =>
                dialog.type === 'choose' &&
                setDialog({ type: 'task', task: null, dueDate: dialog.date })
              }
            >
              Tarea
            </Button>
            <Button
              variant="secondary"
              size="lg"
              leftIcon={<GraduationCap className="h-4 w-4" />}
              onClick={() =>
                dialog.type === 'choose' &&
                setDialog({ type: 'exam-form', exam: null, examDate: dialog.date })
              }
            >
              Examen
            </Button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-disabled">
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Tocá cualquier día del calendario para agregar algo en esa fecha.
          </p>
        </DialogContent>
      </Dialog>

      <TaskDialog
        open={dialog.type === 'task'}
        onOpenChange={closeDialog}
        userId={userId}
        timeZone={timeZone}
        task={dialog.type === 'task' ? dialog.task : null}
        subjects={subjects}
        lockedSubjectId={lockedSubject?.id}
        defaultDueDate={dialog.type === 'task' ? dialog.dueDate : undefined}
      />

      <ExamDialog
        open={dialog.type === 'exam-form'}
        onOpenChange={closeDialog}
        userId={userId}
        timeZone={timeZone}
        exam={dialog.type === 'exam-form' ? dialog.exam : null}
        subjects={subjects}
        lockedSubjectId={lockedSubject?.id}
        defaultExamDate={dialog.type === 'exam-form' ? dialog.examDate : undefined}
        busyBlocks={busyBlocks}
      />

      <ExamDetailDialog
        open={dialog.type === 'exam-detail' && detailExam !== null}
        onOpenChange={closeDialog}
        userId={userId}
        timeZone={timeZone}
        now={now}
        exam={detailExam}
        subject={detailExam ? subjectsById.get(detailExam.subject_id) : undefined}
        sessions={detailExam ? sessions.filter((session) => session.exam_id === detailExam.id) : []}
        highlightSessionId={dialog.type === 'exam-detail' ? dialog.sessionId : undefined}
        onEdit={(exam) => setDialog({ type: 'exam-form', exam })}
      />
    </>
  )
}
