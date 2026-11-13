import { authRedirectUrl } from '@/lib/env'
import { requireSupabase } from '@/lib/supabase'
import { LEGAL_VERSIONS } from '@/features/legal/legal-versions'
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
        // La base guarda la versión solo si es la vigente (migración 006).
        terms_version: LEGAL_VERSIONS.terms,
        privacy_version: LEGAL_VERSIONS.privacy,
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

type StorageBucket = 'avatars' | 'academic-files'

// Storage devuelve como máximo esta cantidad de entradas por consulta.
export const STORAGE_PAGE_SIZE = 1000
const STORAGE_REMOVE_BATCH = 200

/** Lista una carpeta completa, pidiendo todas las páginas que hagan falta. */
async function listFolder(bucket: StorageBucket, prefix: string) {
  const supabase = requireSupabase()
  const entries: Array<{ name: string; id: string | null }> = []
  let offset = 0

  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: STORAGE_PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } })

    if (error) {
      throw error
    }

    const page = data ?? []
    entries.push(...page)

    if (page.length < STORAGE_PAGE_SIZE) {
      return entries
    }

    offset += page.length
  }
}

async function removePaths(bucket: StorageBucket, paths: string[]): Promise<void> {
  const supabase = requireSupabase()

  for (let index = 0; index < paths.length; index += STORAGE_REMOVE_BATCH) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(paths.slice(index, index + STORAGE_REMOVE_BATCH))

    if (error) {
      throw error
    }
  }
}

async function removeUserFiles(bucket: StorageBucket, userId: string): Promise<void> {
  const paths: string[] = []

  async function walk(prefix: string) {
    for (const entry of await listFolder(bucket, prefix)) {
      const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name

      // Las carpetas llegan sin id; los archivos, con id.
      if (entry.id) {
        paths.push(entryPath)
      } else {
        await walk(entryPath)
      }
    }
  }

  await walk(userId)
  await removePaths(bucket, paths)
}

export async function deleteCurrentAccount() {
  const supabase = requireSupabase()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error('No hay una sesión activa.')
  }

  await removeUserFiles('avatars', user.id)
  await removeUserFiles('academic-files', user.id)

  const { error } = await supabase.rpc('delete_current_user')

  if (error) {
    throw error
  }
}

/** Acepta las versiones vigentes de los términos y la privacidad (migración 006). */
export async function acceptLegalDocuments(ageConfirmed: boolean) {
  const { error } = await requireSupabase().rpc('accept_legal_documents', {
    p_terms_version: LEGAL_VERSIONS.terms,
    p_privacy_version: LEGAL_VERSIONS.privacy,
    p_age_confirmed: ageConfirmed,
  })

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

const AVATAR_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

/** Borra las fotos de perfil que ya no se usan (por ejemplo, la anterior en otro formato). */
async function removeStaleAvatars(userId: string, currentPath: string): Promise<void> {
  const stale = (await listFolder('avatars', userId))
    .filter((entry) => entry.id)
    .map((entry) => `${userId}/${entry.name}`)
    .filter((path) => path !== currentPath)

  await removePaths('avatars', stale)
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = requireSupabase()
  const extension =
    AVATAR_EXTENSIONS[file.type] ?? file.name.split('.').pop()?.toLowerCase() ?? 'png'
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

  // El nombre del archivo depende del formato: al pasar de PNG a JPG la foto
  // anterior quedaría guardada sin uso. La limpieza es secundaria: si falla, la
  // foto nueva ya está en uso y el resto se borra en la próxima subida o al
  // eliminar la cuenta.
  try {
    await removeStaleAvatars(userId, path)
  } catch {
    // Sin acción: no debe impedir que el cambio de foto termine bien.
  }

  return path
}

export async function signOut() {
  const supabase = requireSupabase()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
