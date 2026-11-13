import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import type { GradingSettings } from '@/types/database'
import { DEFAULT_GRADING_RULES, type GradingRules, type Scale } from './grade-math'
import type { AssessmentPayload, toGradingSettingsPayload } from './grade-form'
import {
  createAssessment,
  deleteAssessment,
  getGradingSettings,
  listAssessments,
  updateAssessment,
  updateGradingSettings,
} from './grade-service'

function normalizeSettings(settings: GradingSettings): GradingSettings {
  return {
    ...settings,
    scale_min: Number(settings.scale_min),
    scale_max: Number(settings.scale_max),
    passing_score: Number(settings.passing_score),
    rounding_decimals: Number(settings.rounding_decimals),
  }
}

/**
 * Escala del usuario. Mientras carga, o si la fila no existe, se usan los
 * valores por defecto de la base (1–10, aprueba con 6).
 */
export function useGradingSettings(userId: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.grading(userId ?? 'sin-usuario'),
    queryFn: async () => {
      const settings = await getGradingSettings(userId as string)
      return settings ? normalizeSettings(settings) : null
    },
    enabled: Boolean(userId),
  })

  const rules: GradingRules = query.data ?? DEFAULT_GRADING_RULES

  return { ...query, rules, isConfigured: Boolean(query.data?.configured_at) }
}

export function useUpdateGradingSettings(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ReturnType<typeof toGradingSettingsPayload>) =>
      updateGradingSettings(userId, payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.grading(userId), normalizeSettings(settings))
    },
  })
}

export function useAssessments(userId: string | undefined, subjectIds: string[]) {
  return useQuery({
    queryKey: queryKeys.assessments(userId ?? 'sin-usuario', subjectIds),
    queryFn: () => listAssessments(userId as string, subjectIds),
    enabled: Boolean(userId) && subjectIds.length > 0,
  })
}

export function useAssessmentMutations(userId: string) {
  const queryClient = useQueryClient()
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.allAssessments(userId) })

  const create = useMutation({
    mutationFn: ({ payload, scale }: { payload: AssessmentPayload; scale: Scale }) =>
      createAssessment(userId, payload, scale),
    onSuccess: refresh,
  })

  const update = useMutation({
    mutationFn: ({ assessmentId, payload }: { assessmentId: string; payload: AssessmentPayload }) =>
      updateAssessment(userId, assessmentId, payload),
    onSuccess: refresh,
  })

  const remove = useMutation({
    mutationFn: (assessmentId: string) => deleteAssessment(userId, assessmentId),
    onSuccess: refresh,
  })

  return { create, update, remove }
}
