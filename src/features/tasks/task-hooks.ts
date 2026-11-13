import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { Task, TaskStatus } from '@/types/database'
import { createTask, deleteTask, listTasks, setTaskStatus, updateTask } from './task-service'
import { statusPatch, type TaskPayload } from './task-utils'

export function useTasks(userId: string | undefined, subjectIds: string[]) {
  return useQuery({
    queryKey: queryKeys.tasks(userId ?? 'sin-usuario', subjectIds),
    queryFn: () => listTasks(userId as string, subjectIds),
    enabled: Boolean(userId) && subjectIds.length > 0,
  })
}

export function useCreateTask(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: TaskPayload) => createTask(userId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.allTasks(userId) })
    },
  })
}

export function useUpdateTask(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: TaskPayload }) =>
      updateTask(userId, taskId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.allTasks(userId) })
    },
  })
}

/**
 * Cambio de estado con respuesta inmediata: la tarjeta cambia al instante y, si
 * el servidor rechaza el cambio, vuelve a su estado anterior.
 */
export function useSetTaskStatus(userId: string) {
  const queryClient = useQueryClient()
  const allTasksKey = queryKeys.allTasks(userId)

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      setTaskStatus(userId, taskId, status),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: allTasksKey })
      const previous = queryClient.getQueriesData<Task[]>({ queryKey: allTasksKey })

      queryClient.setQueriesData<Task[]>({ queryKey: allTasksKey }, (tasks) =>
        tasks?.map((task) => (task.id === taskId ? { ...task, ...statusPatch(status) } : task)),
      )

      return { previous }
    },
    onError: (_error, _variables, context) => {
      for (const [key, tasks] of context?.previous ?? []) {
        queryClient.setQueryData(key, tasks)
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: allTasksKey })
    },
  })
}

export function useDeleteTask(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) => deleteTask(userId, taskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.allTasks(userId) })
    },
  })
}
