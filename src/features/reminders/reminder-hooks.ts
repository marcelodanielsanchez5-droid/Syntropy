import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { UserSettings } from '@/types/database'
import { DEFAULT_REMINDER_PREFERENCES, type ReminderPreferences } from './reminder-rules'
import {
  cancelReminder,
  getUserSettings,
  listReminders,
  rescheduleReminder,
  restoreReminder,
  scheduleTestReminder,
  updateReminderPreferences,
} from './reminder-service'

export function useReminderPreferences(userId: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.settings(userId ?? 'sin-usuario'),
    queryFn: () => getUserSettings(userId as string),
    enabled: Boolean(userId),
  })

  const preferences: ReminderPreferences = query.data
    ? {
        email_reminders_enabled: query.data.email_reminders_enabled,
        default_reminder_minutes: query.data.default_reminder_minutes,
        remind_tasks: query.data.remind_tasks ?? DEFAULT_REMINDER_PREFERENCES.remind_tasks,
        remind_exams: query.data.remind_exams ?? DEFAULT_REMINDER_PREFERENCES.remind_exams,
        remind_study_sessions:
          query.data.remind_study_sessions ?? DEFAULT_REMINDER_PREFERENCES.remind_study_sessions,
      }
    : DEFAULT_REMINDER_PREFERENCES

  return { ...query, preferences }
}

/** Guarda al instante y muestra el cambio antes de que responda el servidor. */
export function useUpdateReminderPreferences(userId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.settings(userId)

  return useMutation({
    mutationFn: (patch: Partial<ReminderPreferences>) => updateReminderPreferences(userId, patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<UserSettings | null>(key)

      if (previous) {
        queryClient.setQueryData<UserSettings>(key, { ...previous, ...patch })
      }

      return { previous }
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous)
      }
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(key, settings)
    },
    onSettled: () => {
      // La base recalculó los recordatorios.
      void queryClient.invalidateQueries({ queryKey: queryKeys.reminders(userId) })
    },
  })
}

export function useReminders(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reminders(userId ?? 'sin-usuario'),
    queryFn: () => listReminders(userId as string),
    enabled: Boolean(userId),
    // Cambian solos cuando se editan tareas, exámenes o sesiones, y cuando la
    // función los envía: se piden al abrir Configuración y cada minuto.
    staleTime: 0,
    refetchInterval: 60_000,
  })
}

export function useReminderActions(userId: string) {
  const queryClient = useQueryClient()
  const onSettled = () => queryClient.invalidateQueries({ queryKey: queryKeys.reminders(userId) })

  const cancel = useMutation({ mutationFn: cancelReminder, onSettled })
  const restore = useMutation({ mutationFn: restoreReminder, onSettled })
  const reschedule = useMutation({
    mutationFn: ({ id, sendAt }: { id: string; sendAt: string }) => rescheduleReminder(id, sendAt),
    onSettled,
  })
  const test = useMutation({ mutationFn: scheduleTestReminder, onSettled })

  return { cancel, restore, reschedule, test }
}
