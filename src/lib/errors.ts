type ErrorLike = {
  name?: string
  message?: string
  code?: string
  details?: string
  hint?: string
  status?: number
}

export const NETWORK_ERROR_MESSAGE =
  'No pudimos conectar con el servidor. Revisá tu conexión a internet e intentá de nuevo.'

const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Volvé a ingresar.'

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  email_not_confirmed:
    'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada y la carpeta de spam.',
  user_already_exists: 'Ya existe una cuenta con ese correo.',
  email_exists: 'Ya existe una cuenta con ese correo.',
  email_address_invalid: 'Ese correo no es válido. Revisalo e intentá de nuevo.',
  weak_password: 'La contraseña es demasiado débil. Usá al menos 8 caracteres con mayúscula, minúscula y número.',
  over_email_send_rate_limit: 'Enviaste demasiados correos seguidos. Esperá unos minutos antes de volver a intentar.',
  over_request_rate_limit: 'Demasiados intentos seguidos. Esperá unos minutos antes de volver a intentar.',
  same_password: 'La nueva contraseña debe ser distinta de la anterior.',
  session_not_found: SESSION_EXPIRED_MESSAGE,
  session_expired: SESSION_EXPIRED_MESSAGE,
  refresh_token_not_found: SESSION_EXPIRED_MESSAGE,
  refresh_token_already_used: SESSION_EXPIRED_MESSAGE,
  bad_jwt: SESSION_EXPIRED_MESSAGE,
  request_timeout: NETWORK_ERROR_MESSAGE,
  flow_state_not_found: 'El enlace ya no es válido. Solicitá uno nuevo.',
  flow_state_expired: 'El enlace caducó. Solicitá uno nuevo.',
}

const POSTGRES_MESSAGES: Record<string, string> = {
  '23505': 'Ya existe un registro con esos datos.',
  '23503': 'El registro depende de otro que ya no existe.',
  '23514': 'Los datos no cumplen una regla de validación.',
  '42501': 'No tenés permiso para realizar esta acción.',
  PGRST116: 'No se encontró el registro solicitado.',
  PGRST301: SESSION_EXPIRED_MESSAGE,
  // Límites de la biblioteca (migración 004).
  SY001: 'Superaste el espacio de tu biblioteca (200 MB). Borrá archivos que ya no uses para subir otros.',
  SY002: 'Llegaste al máximo de 1000 fuentes en la biblioteca.',
  // SY003 a SY008 (recordatorios y textos legales, migraciones 005 y 006) no
  // se traducen acá: la base ya devuelve un mensaje en español para mostrar.
}

// Mensajes con los que cada navegador informa que la petición no llegó al
// servidor (Chrome, Firefox, Safari y Node, en ese orden).
const NETWORK_ERROR_PATTERN =
  /failed to fetch|networkerror when attempting to fetch|load failed|network request failed|fetch failed/i

/**
 * Indica si el error es un fallo de red: sin conexión, servidor caído o
 * petición bloqueada. Supabase no asigna un código a estos casos; llegan como
 * `AuthRetryableFetchError` (Auth) o con el mensaje del navegador (PostgREST).
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as ErrorLike

  if (candidate.name === 'AuthRetryableFetchError') {
    return true
  }

  return typeof candidate.message === 'string' && NETWORK_ERROR_PATTERN.test(candidate.message)
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

    if (isNetworkError(error)) {
      return NETWORK_ERROR_MESSAGE
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
