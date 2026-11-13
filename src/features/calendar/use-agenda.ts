import { useMemo } from 'react'
import { useAuth } from '@/features/auth/auth-provider'
import { useYears } from '@/features/academic-years/year-hooks'
import { getActiveYear } from '@/features/academic-years/year-service'
import { useExams, useStudySessions } from '@/features/exams/exam-hooks'
import { useSubjects } from '@/features/subjects/subject-hooks'
import { useTasks } from '@/features/tasks/task-hooks'
import { resolveTimeZone } from '@/lib/datetime'
import type { Exam, StudySession, Subject, Task } from '@/types/database'

const NO_SUBJECTS: Subject[] = []
const NO_TASKS: Task[] = []
const NO_EXAMS: Exam[] = []
const NO_SESSIONS: StudySession[] = []

/** Zona horaria del perfil, ya validada. */
export function useProfileTimeZone(): string {
  const { profile } = useAuth()

  return useMemo(() => resolveTimeZone(profile?.timezone), [profile?.timezone])
}

/** Año activo y sus asignaturas: el contexto visible de la aplicación. */
export function useActiveYearScope() {
  const { user } = useAuth()
  const yearsQuery = useYears(user?.id)
  const activeYear = getActiveYear(yearsQuery.data)
  const subjectsQuery = useSubjects(user?.id, activeYear?.id)

  return {
    userId: user?.id,
    activeYear,
    subjects: subjectsQuery.data ?? NO_SUBJECTS,
    isLoading: yearsQuery.isLoading || (Boolean(activeYear) && subjectsQuery.isLoading),
    isError: yearsQuery.isError || subjectsQuery.isError,
    refetch: () => {
      void yearsQuery.refetch()
      void subjectsQuery.refetch()
    },
  }
}

/**
 * Tareas, exámenes y sesiones de estudio de un grupo de asignaturas. Todas las
 * pantallas que piden las asignaturas del año activo comparten la misma caché.
 */
export function useAgenda(userId: string | undefined, subjects: Subject[]) {
  const subjectIds = useMemo(() => subjects.map((subject) => subject.id).sort(), [subjects])
  const tasksQuery = useTasks(userId, subjectIds)
  const examsQuery = useExams(userId, subjectIds)
  const exams = examsQuery.data ?? NO_EXAMS
  const examIds = useMemo(() => exams.map((exam) => exam.id).sort(), [exams])
  const sessionsQuery = useStudySessions(userId, examIds)
  const subjectsById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  )

  return {
    subjectsById,
    tasks: tasksQuery.data ?? NO_TASKS,
    exams,
    sessions: sessionsQuery.data ?? NO_SESSIONS,
    isLoading: tasksQuery.isLoading || examsQuery.isLoading || sessionsQuery.isLoading,
    isError: tasksQuery.isError || examsQuery.isError || sessionsQuery.isError,
    error: tasksQuery.error ?? examsQuery.error ?? sessionsQuery.error,
    refetch: () => {
      void tasksQuery.refetch()
      void examsQuery.refetch()
      void sessionsQuery.refetch()
    },
  }
}

/** Agenda completa del año activo: la usan el calendario general, la campana y el inicio. */
export function useActiveYearAgenda() {
  const scope = useActiveYearScope()
  const agenda = useAgenda(scope.userId, scope.subjects)

  return {
    ...agenda,
    userId: scope.userId,
    activeYear: scope.activeYear,
    subjects: scope.subjects,
    isLoading: scope.isLoading || agenda.isLoading,
    isError: scope.isError || agenda.isError,
    refetch: () => {
      scope.refetch()
      agenda.refetch()
    },
  }
}
