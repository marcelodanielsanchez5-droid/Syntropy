import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { del, get, set } from 'idb-keyval'

const DAY = 24 * 60 * 60 * 1000

const indexedDbStorage = {
  getItem: async (key: string) => (await get<string>(key)) ?? null,
  setItem: async (key: string, value: string) => {
    await set(key, value)
  },
  removeItem: async (key: string) => {
    await del(key)
  },
}

export const queryPersister = createAsyncStoragePersister({
  storage: indexedDbStorage,
  key: 'syntropy.query-cache.v1',
  throttleTime: 1000,
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: DAY,
      retry: 2,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'online',
    },
  },
})

export const queryCacheMaxAge = DAY

export async function clearLocalCache() {
  queryClient.clear()
  await queryPersister.removeClient()
}
