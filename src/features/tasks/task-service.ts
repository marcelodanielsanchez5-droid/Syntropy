import { requireSupabase } from '@/lib/supabase'
import type { Task, TaskStatus } from '@/types/database'
import { statusPatch, type TaskPayload } from './task-utils'

/** Tareas de un grupo de asignaturas (las del año activo o una sola), por vencimiento. */
export async function listTasks(userId: string, subjectIds: string[]): Promise<Task[]> {
  if (subjectIds.length === 0) {
    return []
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .in('subject_id', subjectIds)
    .order('due_at', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

export async function createTask(userId: string, payload: TaskPayload): Promise<Task> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .insert({ user_id: userId, ...payload })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateTask(
  userId: string,
  taskId: string,
  payload: TaskPayload,
): Promise<Task> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', taskId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function setTaskStatus(
  userId: string,
  taskId: string,
  status: TaskStatus,
): Promise<Task> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .update(statusPatch(status))
    .eq('id', taskId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId)

  if (error) {
    throw error
  }
}
