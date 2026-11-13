import { requireSupabase } from '@/lib/supabase'
import type { Assessment, GradingSettings } from '@/types/database'
import type { Scale } from './grade-math'
import type { AssessmentPayload, toGradingSettingsPayload } from './grade-form'

export async function getGradingSettings(userId: string): Promise<GradingSettings | null> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('grading_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function updateGradingSettings(
  userId: string,
  payload: ReturnType<typeof toGradingSettingsPayload>,
): Promise<GradingSettings> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('grading_settings')
    .update(payload)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function listAssessments(userId: string, subjectIds: string[]): Promise<Assessment[]> {
  if (subjectIds.length === 0) {
    return []
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('user_id', userId)
    .in('subject_id', subjectIds)
    .order('assessed_on', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  // PostgREST puede devolver `numeric` como texto según la configuración: se normaliza.
  return data.map(normalizeAssessment)
}

function normalizeAssessment(row: Assessment): Assessment {
  return {
    ...row,
    score: row.score === null ? null : Number(row.score),
    scale_min: Number(row.scale_min),
    scale_max: Number(row.scale_max),
    weight: Number(row.weight),
  }
}

/** La evaluación nueva guarda una copia de la escala actual (decisión D4). */
export async function createAssessment(
  userId: string,
  payload: AssessmentPayload,
  scale: Scale,
): Promise<Assessment> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('assessments')
    .insert({ user_id: userId, ...payload, scale_min: scale.min, scale_max: scale.max })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return normalizeAssessment(data)
}

export async function updateAssessment(
  userId: string,
  assessmentId: string,
  payload: AssessmentPayload,
): Promise<Assessment> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('assessments')
    .update(payload)
    .eq('id', assessmentId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return normalizeAssessment(data)
}

export async function deleteAssessment(userId: string, assessmentId: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase
    .from('assessments')
    .delete()
    .eq('id', assessmentId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}
