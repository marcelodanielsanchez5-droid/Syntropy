import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { clearLocalCache } from '@/lib/query-client'
import { getErrorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import {
  deleteCurrentAccount,
  fetchProfileWithRetry,
  signInWithEmail,
  signOut as signOutService,
  updateProfile as updateProfileService,
  type ProfileUpdate,
  type SignUpPayload,
} from './auth-service'
import { signUpWithEmail } from './auth-service'

interface AuthContextValue {
  isConfigured: boolean
  isLoading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  profileError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (payload: SignUpPayload) => ReturnType<typeof signUpWithEmail>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (patch: ProfileUpdate) => Promise<Profile>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const isConfigured = env.isConfigured && supabase !== null
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setSessionLoading(false)
      return
    }

    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) {
          return
        }

        setSession(data.session ?? null)
        setSessionLoading(false)
      })
      .catch(() => {
        if (mounted) {
          setSessionLoading(false)
        }
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return
      }

      setSession(nextSession)

      if (!nextSession) {
        setProfile(null)
        setProfileError(null)
        setProfileLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfileLoading(false)
      setProfileError(null)
      return
    }

    let cancelled = false
    setProfileLoading(true)
    setProfileError(null)

    fetchProfileWithRetry(userId)
      .then((nextProfile) => {
        if (!cancelled) {
          setProfile(nextProfile)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setProfile(null)
          setProfileError(
            getErrorMessage(
              error,
              'No pudimos cargar tu perfil. Verificá que la migración inicial esté aplicada en Supabase.',
            ),
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setProfileLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await signInWithEmail(email, password)
    setSession(data.session)
  }, [])

  const signUp = useCallback(async (payload: SignUpPayload) => signUpWithEmail(payload), [])

  const signOut = useCallback(async () => {
    try {
      await signOutService()
    } finally {
      await clearLocalCache()
      setSession(null)
      setProfile(null)
      setProfileError(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      return
    }

    setProfileError(null)
    const nextProfile = await fetchProfileWithRetry(userId)
    setProfile(nextProfile)
  }, [userId])

  const updateProfile = useCallback(
    async (patch: ProfileUpdate) => {
      if (!userId) {
        throw new Error('No hay una sesión activa.')
      }

      const nextProfile = await updateProfileService(userId, patch)
      setProfile(nextProfile)
      return nextProfile
    },
    [userId],
  )

  const deleteAccount = useCallback(async () => {
    await deleteCurrentAccount()
    await clearLocalCache()
    setSession(null)
    setProfile(null)
  }, [])

  const isLoading = sessionLoading || (Boolean(session) && profileLoading)

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured,
      isLoading,
      session,
      user: session?.user ?? null,
      profile,
      profileError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfile,
      deleteAccount,
    }),
    [
      isConfigured,
      isLoading,
      session,
      profile,
      profileError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfile,
      deleteAccount,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.')
  }

  return context
}
