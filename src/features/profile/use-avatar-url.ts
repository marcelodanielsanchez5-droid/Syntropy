import { useQuery } from '@tanstack/react-query'
import { createAvatarSignedUrl } from '@/features/auth/auth-service'

export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['avatar-url', path],
    queryFn: () => createAvatarSignedUrl(path as string),
    enabled: Boolean(path),
    staleTime: 50 * 60 * 1000,
  })
}
