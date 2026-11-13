/**
 * Versiones vigentes de los textos legales. Tienen que coincidir con
 * `public.current_legal_versions()` (migración 006): si un texto cambia de
 * forma relevante, se sube la versión en los dos lugares y la app pide
 * aceptarlo de nuevo al ingresar.
 *
 * Está separado de los textos para que la verificación al ingresar no cargue
 * los documentos completos.
 */
export const LEGAL_VERSIONS = {
  terms: '2026-11-13',
  privacy: '2026-11-13',
} as const

/** Fecha de vigencia de las versiones actuales, para mostrar. */
export const LEGAL_EFFECTIVE_LABEL = '13 de noviembre de 2026'

/** Qué falta aceptar para la versión vigente. */
export interface LegalAcceptanceState {
  terms: boolean
  privacy: boolean
  age: boolean
}

export function pendingLegalAcceptance(profile: {
  terms_version?: string | null
  privacy_version?: string | null
  age_confirmed_at: string | null
}): LegalAcceptanceState {
  return {
    terms: profile.terms_version !== LEGAL_VERSIONS.terms,
    privacy: profile.privacy_version !== LEGAL_VERSIONS.privacy,
    age: !profile.age_confirmed_at,
  }
}

export function needsLegalAcceptance(state: LegalAcceptanceState): boolean {
  return state.terms || state.privacy || state.age
}
