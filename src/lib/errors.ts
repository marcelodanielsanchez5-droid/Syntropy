type ErrorLike = {
  message?: string
  code?: string
  details?: string
  hint?: string
  status?: number
}

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  email_not_confirmed:
    'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada y la carpeta de spam.',
  user_already_exists: 'Ya existe una cuenta con ese correo.',
  weak_password: 'La contraseña es demasiado débil. Usá al menos 8 caracteres con mayúscula, minúscula y número.',
  over_email_send_rate_limit: 'Enviaste demasiados correos seguidos. Esperá unos minutos antes de volver a intentar.',
  over_request_rate_limit: 'Demasiados intentos seguidos. Esperá unos minutos antes de volver a intentar.',
  same_password: 'La nueva contraseña debe ser distinta de la anterior.',
  session_not_found: 'Tu sesión expiró. Volvé a ingresar.',
  flow_state_not_found: 'El enlace ya no es válido. Solicitá uno nuevo.',
  flow_state_expired: 'El enlace caducó. Solicitá uno nuevo.',
}

const POSTGRES_MESSAGES: Record<string, string> = {
  '23505': 'Ya existe un registro con esos datos.',
  '23503': 'El registro depende de otro que ya no existe.',
  '23514': 'Los datos no cumplen una regla de validación.',
  '42501': 'No tenés permiso para realizar esta acción.',
  PGRST116: 'No se encontró el registro solicitado.',
}

export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object') {
    const candidate = error as ErrorLike

    if (candidate.code && AUTH_MESSAGES[candidate.code]) {
      return AUTH_MESSAGES[candidate.code]
    }

    if (candidate.code && POSTGRES_MESSAGES[candidate.code]) {
      return POSTGRES_MESSAGES[candidate.code]
    }

    if (error instanceof Error && error.message) {
      return error.message
    }

    if (candidate.message) {
      return candidate.message
    }
  }

  return fallback
}

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as ErrorLike & { constraint?: string }

  if (candidate.code !== '23505') {
    return false
  }

  if (!constraint) {
    return true
  }

  return candidate.constraint === constraint || candidate.message?.includes(constraint) === true
}
