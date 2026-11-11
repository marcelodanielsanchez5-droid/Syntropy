import { requireSupabase } from '@/lib/supabase'
import type { AcademicYear } from '@/types/database'

export interface CreateYearInput {
  name: string
  starts_on: string
  ends_on: string
  is_active?: boolean
}

export async function listYears(userId: string): Promise<AcademicYear[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .eq('user_id', userId)
    .order('starts_on', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

export async function createYear(userId: string, input: CreateYearInput): Promise<AcademicYear> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('academic_years')
    .insert({
      user_id: userId,
      name: input.name,
      starts_on: input.starts_on,
      ends_on: input.ends_on,
      is_active: false,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateYear(
  userId: string,
  yearId: string,
  input: Partial<CreateYearInput>,
): Promise<AcademicYear> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('academic_years')
    .update({
      name: input.name,
      starts_on: input.starts_on,
      ends_on: input.ends_on,
    })
    .eq('id', yearId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteYear(userId: string, yearId: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase
    .from('academic_years')
    .delete()
    .eq('id', yearId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}

export async function activateYear(yearId: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase.rpc('activate_academic_year', { p_year_id: yearId })

  if (error) {
    throw error
  }
}

export function getActiveYear(years: AcademicYear[] | undefined): AcademicYear | null {
  return years?.find((year) => year.is_active) ?? null
}
