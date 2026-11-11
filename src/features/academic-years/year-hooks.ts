import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  activateYear,
  createYear,
  deleteYear,
  listYears,
  updateYear,
  type CreateYearInput,
} from './year-service'

export function useYears(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.years(userId ?? 'sin-usuario'),
    queryFn: () => listYears(userId as string),
    enabled: Boolean(userId),
  })
}

export function useCreateYear(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateYearInput) => createYear(userId, input),
    onSuccess: async (year) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.years(userId) })

      if (year.is_active) {
        await queryClient.invalidateQueries({ queryKey: ['subjects', userId] })
      }
    },
  })
}

export function useUpdateYear(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ yearId, input }: { yearId: string; input: Partial<CreateYearInput> }) =>
      updateYear(userId, yearId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.years(userId) })
    },
  })
}

export function useDeleteYear(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (yearId: string) => deleteYear(userId, yearId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.years(userId) })
      await queryClient.invalidateQueries({ queryKey: ['subjects', userId] })
    },
  })
}

export function useActivateYear(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (yearId: string) => activateYear(yearId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.years(userId) })
    },
  })
}
