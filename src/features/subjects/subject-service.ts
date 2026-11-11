import { requireSupabase } from '@/lib/supabase'
import type { Subject } from '@/types/database'
import type { SubjectFormInput } from './subject-schemas'
import { parseTeacherNames } from './subject-utils'

export interface CreateSubjectInput extends SubjectFormInput {
  academic_year_id: string
}

export async function listSubjects(userId: string, yearId: string): Promise<Subject[]> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('user_id', userId)
    .eq('academic_year_id', yearId)
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

export async function getSubject(userId: string, subjectId: string): Promise<Subject> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', subjectId)
    .eq('user_id', userId)
    .single()

  if (error) {
    throw error
  }

  return data
}

function toSubjectPayload(input: SubjectFormInput) {
  return {
    name: input.name,
    color_hex: input.color_hex,
    teacher_names: parseTeacherNames(input.teachersText),
    description: input.description || null,
    evaluation_criteria: input.evaluationCriteria || null,
    methodology: input.methodology || null,
    notes: input.notes || null,
  }
}

export async function createSubject(
  userId: string,
  input: CreateSubjectInput,
): Promise<Subject> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('subjects')
    .insert({
      user_id: userId,
      academic_year_id: input.academic_year_id,
      ...toSubjectPayload(input),
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateSubject(
  userId: string,
  subjectId: string,
  input: SubjectFormInput,
): Promise<Subject> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('subjects')
    .update(toSubjectPayload(input))
    .eq('id', subjectId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteSubject(userId: string, subjectId: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', subjectId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}
