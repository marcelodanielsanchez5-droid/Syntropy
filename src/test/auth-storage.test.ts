import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Storage simulado en memoria: cada bucket es una lista de rutas. `list`
 * devuelve los hijos directos de una carpeta, paginados como el servicio real.
 */
const harness = vi.hoisted(() => {
  const state = {
    buckets: new Map<string, Set<string>>(),
    listCalls: [] as Array<{ bucket: string; prefix: string; offset: number; limit: number }>,
    removeCalls: [] as Array<{ bucket: string; paths: string[] }>,
    removeError: null as unknown,
    rpcCalls: [] as string[],
    profilePatches: [] as Array<Record<string, unknown>>,
  }

  function files(bucket: string) {
    if (!state.buckets.has(bucket)) {
      state.buckets.set(bucket, new Set())
    }

    return state.buckets.get(bucket) as Set<string>
  }

  function storageFrom(bucket: string) {
    return {
      list: (prefix: string, options: { limit: number; offset: number }) => {
        state.listCalls.push({ bucket, prefix, offset: options.offset, limit: options.limit })

        const children = new Map<string, string | null>()

        for (const path of files(bucket)) {
          if (!path.startsWith(`${prefix}/`)) {
            continue
          }

          const [name, ...rest] = path.slice(prefix.length + 1).split('/')
          children.set(name, rest.length === 0 ? `id-${path}` : null)
        }

        const data = Array.from(children, ([name, id]) => ({ name, id }))
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(options.offset, options.offset + options.limit)

        return Promise.resolve({ data, error: null })
      },
      upload: (path: string) => {
        files(bucket).add(path)
        return Promise.resolve({ data: { path }, error: null })
      },
      remove: (paths: string[]) => {
        state.removeCalls.push({ bucket, paths })

        if (state.removeError) {
          return Promise.resolve({ data: null, error: state.removeError })
        }

        for (const path of paths) {
          files(bucket).delete(path)
        }

        return Promise.resolve({ data: [], error: null })
      },
    }
  }

  const profileBuilder = {
    update: (patch: Record<string, unknown>) => {
      state.profilePatches.push(patch)
      return profileBuilder
    },
    eq: () => profileBuilder,
    select: () => profileBuilder,
    single: () => Promise.resolve({ data: { id: 'user-1' }, error: null }),
  }

  return {
    state,
    files,
    client: {
      storage: { from: storageFrom },
      from: () => profileBuilder,
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } }, error: null }),
      },
      rpc: (name: string) => {
        state.rpcCalls.push(name)
        return Promise.resolve({ error: null })
      },
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => harness.client,
}))

import { deleteCurrentAccount, STORAGE_PAGE_SIZE, uploadAvatar } from '@/features/auth/auth-service'

function imageFile(name: string, type: string) {
  return new File(['contenido'], name, { type })
}

describe('uploadAvatar', () => {
  beforeEach(() => {
    harness.state.buckets.clear()
    harness.state.listCalls = []
    harness.state.removeCalls = []
    harness.state.removeError = null
    harness.state.rpcCalls = []
    harness.state.profilePatches = []
  })

  it('borra la foto anterior cuando cambia el formato', async () => {
    harness.files('avatars').add('user-1/avatar.png')

    const path = await uploadAvatar('user-1', imageFile('nueva.jpeg', 'image/jpeg'))

    expect(path).toBe('user-1/avatar.jpg')
    expect(harness.state.profilePatches).toEqual([{ avatar_path: 'user-1/avatar.jpg' }])
    expect(Array.from(harness.files('avatars'))).toEqual(['user-1/avatar.jpg'])
  })

  it('no borra nada cuando la foto nueva reemplaza a la anterior', async () => {
    harness.files('avatars').add('user-1/avatar.png')

    await uploadAvatar('user-1', imageFile('otra.png', 'image/png'))

    expect(harness.state.removeCalls).toEqual([])
    expect(Array.from(harness.files('avatars'))).toEqual(['user-1/avatar.png'])
  })

  it('no toca las fotos de otros usuarios', async () => {
    harness.files('avatars').add('user-2/avatar.png')

    await uploadAvatar('user-1', imageFile('foto.webp', 'image/webp'))

    expect(harness.files('avatars').has('user-2/avatar.png')).toBe(true)
  })

  it('termina bien aunque falle la limpieza de la foto anterior', async () => {
    harness.files('avatars').add('user-1/avatar.png')
    harness.state.removeError = new Error('Storage no disponible')

    await expect(uploadAvatar('user-1', imageFile('nueva.jpg', 'image/jpeg'))).resolves.toBe(
      'user-1/avatar.jpg',
    )
  })
})

describe('deleteCurrentAccount', () => {
  beforeEach(() => {
    harness.state.buckets.clear()
    harness.state.listCalls = []
    harness.state.removeCalls = []
    harness.state.removeError = null
    harness.state.rpcCalls = []
  })

  it('borra todos los archivos aunque superen una página de Storage', async () => {
    const total = STORAGE_PAGE_SIZE * 2 + 300

    for (let index = 0; index < total; index += 1) {
      harness.files('academic-files').add(`user-1/archivo-${String(index).padStart(5, '0')}.pdf`)
    }

    harness.files('academic-files').add('user-2/ajeno.pdf')

    await deleteCurrentAccount()

    const offsets = harness.state.listCalls
      .filter((call) => call.bucket === 'academic-files' && call.prefix === 'user-1')
      .map((call) => call.offset)

    expect(offsets).toEqual([0, STORAGE_PAGE_SIZE, STORAGE_PAGE_SIZE * 2])
    expect(Array.from(harness.files('academic-files'))).toEqual(['user-2/ajeno.pdf'])
    expect(harness.state.rpcCalls).toEqual(['delete_current_user'])
  })

  it('recorre las subcarpetas del usuario', async () => {
    harness.files('avatars').add('user-1/avatar.png')
    harness.files('academic-files').add('user-1/matematica/apunte.pdf')
    harness.files('academic-files').add('user-1/matematica/guias/guia-1.pdf')

    await deleteCurrentAccount()

    expect(harness.files('avatars').size).toBe(0)
    expect(harness.files('academic-files').size).toBe(0)
  })

  it('no elimina la cuenta si no pudo borrar los archivos', async () => {
    harness.files('avatars').add('user-1/avatar.png')
    harness.state.removeError = new Error('Storage no disponible')

    await expect(deleteCurrentAccount()).rejects.toThrow('Storage no disponible')
    expect(harness.state.rpcCalls).toEqual([])
  })
})
