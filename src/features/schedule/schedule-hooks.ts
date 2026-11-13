import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { SchedulePayload } from './schedule-form'
import {
  createScheduleEntries,
  deleteScheduleEntry,
  listScheduleEntries,
  updateScheduleEntry,
} from './schedule-service'

export function useScheduleEntries(userId: string | undefined, yearId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.schedule(userId ?? 'sin-usuario', yearId ?? 'sin-anio'),
    queryFn: () => listScheduleEntries(userId as string, yearId as string),
    enabled: Boolean(userId && yearId),
  })
}

/** Crear, editar y borrar bloques; todas refrescan el horario del usuario. */
export function useScheduleMutations(userId: string) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.allSchedule(userId) })

  const create = useMutation({
    mutationFn: ({ yearId, payloads }: { yearId: string; payloads: SchedulePayload[] }) =>
      createScheduleEntries(userId, yearId, payloads),
    onSuccess: refresh,
  })

  const update = useMutation({
    mutationFn: ({ entryId, payload }: { entryId: string; payload: SchedulePayload }) =>
      updateScheduleEntry(userId, entryId, payload),
    onSuccess: refresh,
  })

  const remove = useMutation({
    mutationFn: (entryId: string) => deleteScheduleEntry(userId, entryId),
    onSuccess: refresh,
  })

  return { create, update, remove }
}
