import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  createSubject,
  deleteSubject,
  getSubject,
  listSubjects,
  updateSubject,
  type CreateSubjectInput,
} from './subject-service'
import type { SubjectFormInput } from './subject-schemas'

export function useSubjects(userId: string | undefined, yearId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subjects(userId ?? 'sin-usuario', yearId),
    queryFn: () => listSubjects(userId as string, yearId as string),
    enabled: Boolean(userId && yearId),
  })
}

export function useSubject(userId: string | undefined, subjectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subject(userId ?? 'sin-usuario', subjectId ?? 'sin-asignatura'),
    queryFn: () => getSubject(userId as string, subjectId as string),
    enabled: Boolean(userId && subjectId),
  })
}

export function useCreateSubject(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSubjectInput) => createSubject(userId, input),
    onSuccess: async (subject) => {
      await queryClient.invalidateQueries({ queryKey: ['subjects', userId] })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.subject(userId, subject.id),
      })
    },
  })
}

export function useUpdateSubject(userId: string, subjectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SubjectFormInput) => updateSubject(userId, subjectId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subjects', userId] })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.subject(userId, subjectId),
      })
    },
  })
}

export function useDeleteSubject(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (subjectId: string) => deleteSubject(userId, subjectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subjects', userId] })
    },
  })
}
