import { requireSupabase } from '@/lib/supabase'
import type { ScheduleEntry } from '@/types/database'
import type { SchedulePayload } from './schedule-form'

export async function listScheduleEntries(
  userId: string,
  yearId: string,
): Promise<ScheduleEntry[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('academic_year_id', yearId)
    .order('weekday', { ascending: true })
    .order('starts_at', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

/** Crea un bloque por cada día elegido, en una sola operación. */
export async function createScheduleEntries(
  userId: string,
  yearId: string,
  payloads: SchedulePayload[],
): Promise<ScheduleEntry[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('schedule_entries')
    .insert(payloads.map((payload) => ({ user_id: userId, academic_year_id: yearId, ...payload })))
    .select('*')

  if (error) {
    throw error
  }

  return data
}

export async function updateScheduleEntry(
  userId: string,
  entryId: string,
  payload: SchedulePayload,
): Promise<ScheduleEntry> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('schedule_entries')
    .update(payload)
    .eq('id', entryId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteScheduleEntry(userId: string, entryId: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase
    .from('schedule_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}
