import { beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => {
  const state = {
    deleteResult: { data: [] as Array<{ id: string }>, error: null as unknown },
    lookupResult: { data: null as { is_active: boolean } | null, error: null as unknown },
    eqCalls: [] as Array<[string, unknown]>,
  }

  let mode: 'delete' | 'lookup' = 'lookup'

  const builder = {
    delete: () => {
      mode = 'delete'
      return builder
    },
    select: () => {
      if (mode === 'delete') {
        mode = 'lookup'
        return Promise.resolve(state.deleteResult)
      }
      return builder
    },
    eq: (column: string, value: unknown) => {
      state.eqCalls.push([column, value])
      return builder
    },
    maybeSingle: () => Promise.resolve(state.lookupResult),
  }

  return {
    state,
    builder,
    from: () => builder,
    reset: () => {
      mode = 'lookup'
      state.eqCalls = []
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  requireSupabase: () => ({ from: harness.from }),
}))

import {
  ACTIVE_YEAR_DELETE_MESSAGE,
  deleteYear,
} from '@/features/academic-years/year-service'

describe('deleteYear', () => {
  beforeEach(() => {
    harness.reset()
    harness.state.deleteResult = { data: [], error: null }
    harness.state.lookupResult = { data: null, error: null }
  })

  it('elimina un año inactivo', async () => {
    harness.state.deleteResult = { data: [{ id: 'year-1' }], error: null }

    await expect(deleteYear('user-1', 'year-1')).resolves.toBeUndefined()

    expect(harness.state.eqCalls).toContainEqual(['id', 'year-1'])
    expect(harness.state.eqCalls).toContainEqual(['user_id', 'user-1'])
    expect(harness.state.eqCalls).toContainEqual(['is_active', false])
  })

  it('no elimina el año activo y explica cómo continuar', async () => {
    harness.state.lookupResult = { data: { is_active: true }, error: null }

    await expect(deleteYear('user-1', 'year-1')).rejects.toThrow(ACTIVE_YEAR_DELETE_MESSAGE)
    expect(harness.state.eqCalls).toContainEqual(['is_active', false])
  })

  it('avisa cuando el año ya no existe', async () => {
    harness.state.lookupResult = { data: null, error: null }

    await expect(deleteYear('user-1', 'year-1')).rejects.toThrow('No encontramos ese año de curso.')
  })
})
