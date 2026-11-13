import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { Exam, StudySession, StudySessionStatus } from '@/types/database'
import {
  createExam,
  deleteExam,
  listExams,
  listStudySessions,
  setStudySessionStatus,
  updateExam,
} from './exam-service'
import type { ExamPayload } from './exam-utils'

export function useExams(userId: string | undefined, subjectIds: string[]) {
  return useQuery({
    queryKey: queryKeys.exams(userId ?? 'sin-usuario', subjectIds),
    queryFn: () => listExams(userId as string, subjectIds),
    enabled: Boolean(userId) && subjectIds.length > 0,
  })
}

export function useStudySessions(userId: string | undefined, examIds: string[]) {
  return useQuery({
    queryKey: queryKeys.studySessions(userId ?? 'sin-usuario', examIds),
    queryFn: () => listStudySessions(userId as string, examIds),
    enabled: Boolean(userId) && examIds.length > 0,
  })
}

/** Crea o edita un examen y deja sus sesiones de estudio de acuerdo con el plan. */
export function useSaveExam(userId: string, timeZone: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ previous, payload }: { previous?: Exam | null; payload: ExamPayload }) =>
      previous
        ? updateExam(userId, previous, payload, timeZone)
        : createExam(userId, payload, timeZone),
    // También al fallar: el examen pudo guardarse aunque fallaran las sesiones.
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.allExams(userId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.allStudySessions(userId) })
    },
  })
}

export function useDeleteExam(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (examId: string) => deleteExam(userId, examId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.allExams(userId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.allStudySessions(userId) })
    },
  })
}

export function useSetStudySessionStatus(userId: string) {
  const queryClient = useQueryClient()
  const allSessionsKey = queryKeys.allStudySessions(userId)

  return useMutation({
    mutationFn: ({ sessionId, status }: { sessionId: string; status: StudySessionStatus }) =>
      setStudySessionStatus(userId, sessionId, status),
    onMutate: async ({ sessionId, status }) => {
      await queryClient.cancelQueries({ queryKey: allSessionsKey })
      const previous = queryClient.getQueriesData<StudySession[]>({ queryKey: allSessionsKey })

      queryClient.setQueriesData<StudySession[]>({ queryKey: allSessionsKey }, (sessions) =>
        sessions?.map((session) => (session.id === sessionId ? { ...session, status } : session)),
      )

      return { previous }
    },
    onError: (_error, _variables, context) => {
      for (const [key, sessions] of context?.previous ?? []) {
        queryClient.setQueryData(key, sessions)
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: allSessionsKey })
    },
  })
}
