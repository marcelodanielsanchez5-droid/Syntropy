import { requireSupabase } from '@/lib/supabase'
import type { Exam, StudySession, StudySessionStatus } from '@/types/database'
import type { ExamPayload } from './exam-utils'
import {
  examToStudyPlan,
  generateStudySessions,
  reconcileStudySessions,
  studyScheduleChanged,
} from './study-plan'

/** Exámenes de un grupo de asignaturas (las del año activo o una sola), por fecha. */
export async function listExams(userId: string, subjectIds: string[]): Promise<Exam[]> {
  if (subjectIds.length === 0) {
    return []
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('user_id', userId)
    .in('subject_id', subjectIds)
    .order('exam_at', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

export async function listStudySessions(
  userId: string,
  examIds: string[],
): Promise<StudySession[]> {
  if (examIds.length === 0) {
    return []
  }

  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .in('exam_id', examIds)
    .order('scheduled_at', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

export interface StudyPlanResult {
  /** Sesiones que el plan genera desde ahora hasta el examen. */
  planned: number
  /** Sesiones nuevas que se guardaron. */
  created: number
}

/**
 * Deja las sesiones de estudio de un examen de acuerdo con su plan: borra las
 * futuras que siguen programadas y guarda las que genera el plan actual. Las
 * completadas, las salteadas y las que ya pasaron no se tocan.
 */
export async function syncStudySessions(
  userId: string,
  exam: Exam,
  timeZone: string,
  now = new Date(),
): Promise<StudyPlanResult> {
  const supabase = requireSupabase()
  const plan = examToStudyPlan(exam)
  const planned = plan ? generateStudySessions({ examAt: exam.exam_at, plan, timeZone, now }) : []
  const existing = await listStudySessions(userId, [exam.id])
  const { hasReplaceable, toInsert } = reconcileStudySessions(existing, planned, now)

  if (hasReplaceable) {
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('exam_id', exam.id)
      .eq('status', 'scheduled')
      .gt('scheduled_at', now.toISOString())

    if (error) {
      throw error
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('study_sessions')
      .insert(toInsert.map((session) => ({ user_id: userId, exam_id: exam.id, ...session })))

    if (error) {
      throw error
    }
  }

  return { planned: planned.length, created: toInsert.length }
}

export interface SaveExamResult {
  exam: Exam
  /** `null` cuando el examen no tiene plan de estudio y no había nada que regenerar. */
  plan: StudyPlanResult | null
}

export async function createExam(
  userId: string,
  payload: ExamPayload,
  timeZone: string,
): Promise<SaveExamResult> {
  const supabase = requireSupabase()
  const { data: exam, error } = await supabase
    .from('exams')
    .insert({ user_id: userId, ...payload })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const plan = examToStudyPlan(exam) ? await syncStudySessions(userId, exam, timeZone) : null

  return { exam, plan }
}

export async function updateExam(
  userId: string,
  previous: Exam,
  payload: ExamPayload,
  timeZone: string,
): Promise<SaveExamResult> {
  const supabase = requireSupabase()
  const { data: exam, error } = await supabase
    .from('exams')
    .update(payload)
    .eq('id', previous.id)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  // Las sesiones solo se regeneran si cambió la fecha del examen o el plan.
  const plan = studyScheduleChanged(previous, exam)
    ? await syncStudySessions(userId, exam, timeZone)
    : null

  return { exam, plan: examToStudyPlan(exam) ? plan : null }
}

export async function deleteExam(userId: string, examId: string): Promise<void> {
  const supabase = requireSupabase()
  const { error } = await supabase.from('exams').delete().eq('id', examId).eq('user_id', userId)

  if (error) {
    throw error
  }
}

export async function setStudySessionStatus(
  userId: string,
  sessionId: string,
  status: StudySessionStatus,
): Promise<StudySession> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('study_sessions')
    .update({ status })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}
