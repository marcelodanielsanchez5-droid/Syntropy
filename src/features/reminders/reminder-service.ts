import { requireSupabase } from '@/lib/supabase'
import type { Reminder, UserSettings } from '@/types/database'
import type { ReminderPreferences } from './reminder-rules'

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

/**
 * Cambia las preferencias. La base recalcula los recordatorios futuros en el
 * mismo momento (disparador de la migración 005).
 */
export async function updateReminderPreferences(
  userId: string,
  patch: Partial<ReminderPreferences>,
): Promise<UserSettings> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('user_settings')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

/** Pendientes y cancelados (hasta 50) más los últimos 10 enviados o fallidos. */
export async function listReminders(userId: string): Promise<Reminder[]> {
  const supabase = requireSupabase()
  const [open, done] = await Promise.all([
    supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['scheduled', 'cancelled'])
      .order('send_at', { ascending: true })
      .limit(50),
    supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['sent', 'failed'])
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  if (open.error) {
    throw open.error
  }

  if (done.error) {
    throw done.error
  }

  return [...open.data, ...done.data]
}

export async function cancelReminder(reminderId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('cancel_reminder', { p_reminder_id: reminderId })

  if (error) {
    throw error
  }
}

export async function restoreReminder(reminderId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('restore_reminder', { p_reminder_id: reminderId })

  if (error) {
    throw error
  }
}

export async function rescheduleReminder(reminderId: string, sendAt: string): Promise<void> {
  const { error } = await requireSupabase().rpc('reschedule_reminder', {
    p_reminder_id: reminderId,
    p_send_at: sendAt,
  })

  if (error) {
    throw error
  }
}

/** Programa un correo de prueba que sale en la próxima ejecución (5 minutos como mucho). */
export async function scheduleTestReminder(): Promise<void> {
  const { error } = await requireSupabase().rpc('schedule_test_reminder')

  if (error) {
    throw error
  }
}
