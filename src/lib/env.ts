const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

const hasPlaceholder =
  supabaseUrl.includes('TU-PROYECTO') ||
  supabaseAnonKey.includes('TU_ANON_KEY') ||
  supabaseAnonKey.includes('NO_USAR')

const isConfigured =
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0 &&
  !hasPlaceholder &&
  supabaseUrl.startsWith('http')

const configuredAppUrl = (import.meta.env.VITE_APP_URL ?? '').trim()

function getAppUrl(): string {
  if (configuredAppUrl.length > 0) {
    return configuredAppUrl.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return 'http://localhost:5173'
}

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  appUrl: getAppUrl(),
  isConfigured,
  isDevelopment: import.meta.env.DEV,
  appEnv: import.meta.env.VITE_APP_ENV ?? 'development',
  version: import.meta.env.VITE_APP_VERSION ?? '0.1.0',
} as const

export function authRedirectUrl(path: string): string {
  return new URL(path, `${env.appUrl}/`).toString()
}
