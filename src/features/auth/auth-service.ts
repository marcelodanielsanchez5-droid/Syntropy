import { authRedirectUrl } from '@/lib/env'
import { requireSupabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    throw error
  }

  return data
}

export interface SignUpPayload {
  email: string
  password: string
  username: string
  fullName: string
  timezone: string
}

export async function signUpWithEmail(payload: SignUpPayload) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.signUp({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    options: {
      emailRedirectTo: authRedirectUrl('/auth/callback'),
      data: {
        username: payload.username.trim(),
        full_name: payload.fullName.trim(),
        timezone: payload.timezone,
        terms_accepted: true,
        privacy_accepted: true,
        age_confirmed: true,
      },
    },
  })

  if (error) {
    throw error
  }

  return data
}

export async function resendConfirmationEmail(email: string) {
  const supabase = requireSupabase()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: authRedirectUrl('/auth/callback'),
    },
  })

  if (error) {
    throw error
  }
}

export async function sendPasswordResetEmail(email: string) {
  const supabase = requireSupabase()
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: authRedirectUrl('/restablecer-contrasena'),
  })

  if (error) {
    throw error
  }
}

export async function updatePassword(password: string) {
  const supabase = requireSupabase()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    throw error
  }
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function fetchProfileWithRetry(userId: string, attempts = 4): Promise<Profile> {
  let lastError: unknown = null

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetchProfile(userId)
    } catch (error) {
      lastError = error

      if (attempt < attempts - 1) {
        await delay(500 * (attempt + 1))
      }
    }
  }

  throw lastError ?? new Error('No se pudo cargar el perfil.')
}

export interface ProfileUpdate {
  username?: string
  full_name?: string | null
  timezone?: string
  locale?: string
  onboarded_at?: string | null
  avatar_path?: string | null
}

export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<Profile> {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteCurrentAccount() {
  const supabase = requireSupabase()
  const { error } = await supabase.rpc('delete_current_user')

  if (error) {
    throw error
  }
}

export async function createAvatarSignedUrl(path: string): Promise<string | null> {
  const supabase = requireSupabase()
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 60 * 60)

  if (error) {
    return null
  }

  return data.signedUrl
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = requireSupabase()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `${userId}/avatar.${extension}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600',
  })

  if (error) {
    throw error
  }

  await updateProfile(userId, { avatar_path: path })
  return path
}

export async function signOut() {
  const supabase = requireSupabase()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
