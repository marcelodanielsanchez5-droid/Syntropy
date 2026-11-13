import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Source } from '@/types/database'

/** Supabase simulado: registra subidas, borrados de Storage e inserciones. */
const harness = vi.hoisted(() => {
  const state = {
    uploads: [] as string[],
    removed: [] as string[][],
    inserted: [] as Array<Record<string, unknown>>,
    insertError: null as unknown,
  }

  const storage = {
    from: () => ({
      upload: (path: string) => {
        state.uploads.push(path)
        return Promise.resolve({ data: { path }, error: null })
      },
      remove: (paths: string[]) => {
        state.removed.push(paths)
        return Promise.resolve({ data: [], error: null })
      },
    }),
  }

  function from() {
    let payload: Record<string, unknown> = {}
    const builder = {
      insert: (row: Record<string, unknown>) => {
        payload = row
        return builder
      },
      select: () => builder,
      single: () => {
        state.inserted.push(payload)
        return Promise.resolve(
          state.insertError
            ? { data: null, error: state.insertError }
            : { data: payload, error: null },
        )
      },
    }
    return builder
  }

  return { state, client: { storage, from } }
})

vi.mock('@/lib/supabase', () => ({ requireSupabase: () => harness.client }))

import {
  EMPTY_FILTERS,
  FILE_MAX_BYTES,
  LIBRARY_MAX_BYTES,
  LIBRARY_MAX_SOURCES,
  activeFilterCount,
  checkUpload,
  filterSources,
  formatBytes,
  isHttpUrl,
  parseTags,
  safeFileName,
  sourceTypeForMime,
  sourceTypeForUrl,
  storageUsed,
  titleFromFileName,
} from '@/features/library/library-rules'
import { uploadFileSource } from '@/features/library/library-service'
import {
  emptySourceFormValues,
  sourceFormSchema,
  sourceToFormValues,
  suggestedLinkType,
  toSourceFields,
} from '@/features/library/source-form'

const MB = 1024 * 1024

function source(overrides: Partial<Source> = {}): Source {
  return {
    id: 's-1',
    user_id: 'user-1',
    subject_id: 'mate',
    node_id: null,
    task_id: null,
    title: 'Fuente',
    description: null,
    source_type: 'document',
    external_url: null,
    storage_path: 'user-1/s-1/archivo.pdf',
    thumbnail_path: null,
    tags: [],
    size_bytes: MB,
    mime_type: 'application/pdf',
    created_at: '2026-11-13T00:00:00.000Z',
    updated_at: '2026-11-13T00:00:00.000Z',
    ...overrides,
  }
}

describe('límites de subida', () => {
  const empty = { usedBytes: 0, sourceCount: 0 }

  it('acepta los tipos del bucket y rechaza el resto', () => {
    expect(checkUpload({ type: 'application/pdf', size: MB }, empty)).toEqual({ ok: true })
    expect(checkUpload({ type: 'application/zip', size: MB }, empty)).toMatchObject({
      ok: false,
      reason: 'type',
    })
  })

  it('rechaza archivos de más de 25 MB', () => {
    expect(checkUpload({ type: 'image/png', size: FILE_MAX_BYTES }, empty).ok).toBe(true)
    expect(checkUpload({ type: 'image/png', size: FILE_MAX_BYTES + 1 }, empty)).toMatchObject({
      ok: false,
      reason: 'size',
      message: 'El archivo no puede superar los 25 MB.',
    })
  })

  it('respeta el espacio de 200 MB por usuario y avisa cuánto queda', () => {
    const check = checkUpload(
      { type: 'application/pdf', size: 20 * MB },
      { usedBytes: 190 * MB, sourceCount: 3 },
    )

    expect(check).toMatchObject({ ok: false, reason: 'quota' })
    expect(check.ok ? '' : check.message).toContain('te quedan 10 MB de 200 MB')
    expect(
      checkUpload(
        { type: 'application/pdf', size: 10 * MB },
        { usedBytes: 190 * MB, sourceCount: 3 },
      ).ok,
    ).toBe(true)
  })

  it('respeta el máximo de 1000 fuentes', () => {
    expect(
      checkUpload(
        { type: 'application/pdf', size: 1 },
        { usedBytes: 0, sourceCount: LIBRARY_MAX_SOURCES },
      ),
    ).toMatchObject({
      reason: 'count',
    })
  })

  it('suma solo lo que ocupa espacio: los enlaces no cuentan', () => {
    expect(
      storageUsed([
        source({ size_bytes: 2 * MB }),
        source({ size_bytes: null, external_url: 'https://x.org' }),
      ]),
    ).toBe(2 * MB)
    expect(LIBRARY_MAX_BYTES).toBe(200 * MB)
  })

  it('muestra tamaños legibles', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1,5 KB')
    expect(formatBytes(4.43 * MB)).toBe('4,4 MB')
    expect(formatBytes(200 * MB)).toBe('200 MB')
  })
})

describe('tipos, nombres y etiquetas', () => {
  it('deduce el tipo según el archivo o el enlace', () => {
    expect(sourceTypeForMime('image/webp')).toBe('image')
    expect(sourceTypeForMime('application/vnd.ms-powerpoint')).toBe('document')
    expect(sourceTypeForUrl('https://www.youtube.com/watch?v=1')).toBe('video')
    expect(sourceTypeForUrl('https://youtu.be/abc')).toBe('video')
    expect(sourceTypeForUrl('https://sitio.edu/apunte.pdf')).toBe('document')
    expect(sourceTypeForUrl('https://es.wikipedia.org/wiki/Rayuela')).toBe('link')
  })

  it('el tipo sugerido de un enlace no pisa el que eligió la persona', () => {
    expect(suggestedLinkType('https://youtu.be/abc', 'link', false)).toBe('video')
    expect(suggestedLinkType('https://youtu.be/abc', 'book', true)).toBe('book')
  })

  it('arma títulos y rutas a partir del nombre del archivo', () => {
    expect(titleFromFileName('mapa_conceptual_rayuela.png')).toBe('mapa conceptual rayuela')
    expect(titleFromFileName('Apunte.final.pdf')).toBe('Apunte.final')
    expect(safeFileName('Cuentos de Cortázar (1).pdf')).toBe('Cuentos-de-Cortazar-1-.pdf')
  })

  it('separa etiquetas por comas, sin repetir ni vacías y con un máximo de 20', () => {
    expect(parseTags('parcial 1,  Resumen , parcial 1, , resumen')).toEqual([
      'parcial 1',
      'Resumen',
    ])
    expect(parseTags(Array.from({ length: 25 }, (_, index) => `t${index}`).join(','))).toHaveLength(
      20,
    )
  })

  it('solo acepta enlaces http o https', () => {
    expect(isHttpUrl('https://sitio.org')).toBe(true)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isHttpUrl('sitio.org')).toBe(false)
  })
})

describe('búsqueda y filtros', () => {
  const sources = [
    source({
      id: 'a',
      title: 'Cuentos de Cortázar',
      subject_id: 'lengua',
      node_id: 'n1',
      source_type: 'book',
      tags: ['lectura'],
    }),
    source({
      id: 'b',
      title: 'Clase de límites',
      subject_id: 'mate',
      source_type: 'video',
      task_id: 't1',
      tags: ['Parcial 2'],
    }),
    source({
      id: 'c',
      title: 'Rayuela',
      description: 'Novela de Julio Cortázar',
      subject_id: 'lengua',
      source_type: 'link',
    }),
  ]
  const ids = (list: Source[]) => list.map((item) => item.id)

  it('busca en título, descripción y etiquetas, sin distinguir tildes ni mayúsculas', () => {
    expect(ids(filterSources(sources, { ...EMPTY_FILTERS, query: 'cortazar' }))).toEqual(['a', 'c'])
    expect(ids(filterSources(sources, { ...EMPTY_FILTERS, query: 'PARCIAL' }))).toEqual(['b'])
    expect(ids(filterSources(sources, { ...EMPTY_FILTERS, query: 'julio novela' }))).toEqual(['c'])
  })

  it('filtra por asignatura, tipo, tema y tarea', () => {
    expect(ids(filterSources(sources, { ...EMPTY_FILTERS, subjectId: 'lengua' }))).toEqual([
      'a',
      'c',
    ])
    expect(ids(filterSources(sources, { ...EMPTY_FILTERS, type: 'video' }))).toEqual(['b'])
    expect(ids(filterSources(sources, { ...EMPTY_FILTERS, nodeId: 'none' }))).toEqual(['b', 'c'])
    expect(ids(filterSources(sources, { ...EMPTY_FILTERS, nodeId: 'n1' }))).toEqual(['a'])
    expect(ids(filterSources(sources, { ...EMPTY_FILTERS, taskId: 't1' }))).toEqual(['b'])
    expect(ids(filterSources(sources, { ...EMPTY_FILTERS, taskId: 'none' }))).toEqual(['a', 'c'])
  })

  it('cuenta los filtros activos (la búsqueda no cuenta)', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0)
    expect(activeFilterCount({ ...EMPTY_FILTERS, query: 'x', type: 'book', nodeId: 'none' })).toBe(
      2,
    )
  })
})

describe('formulario de fuente', () => {
  it('un enlace necesita dirección válida y título', () => {
    const base = { ...emptySourceFormValues({ subjectId: 'mate', mode: 'link' }) }
    const result = sourceFormSchema.safeParse({ ...base, url: 'no-es-un-enlace' })

    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(['url', 'title'])
    expect(
      sourceFormSchema.safeParse({ ...base, url: 'https://sitio.org', title: 'Sitio' }).success,
    ).toBe(true)
  })

  it('un archivo puede quedar sin título: se usa el del archivo', () => {
    const values = { ...emptySourceFormValues({ subjectId: 'mate' }), tagsText: 'a, b' }

    expect(sourceFormSchema.safeParse(values).success).toBe(true)
    expect(toSourceFields(values, 'Apunte de clase')).toEqual({
      subject_id: 'mate',
      node_id: null,
      task_id: null,
      title: 'Apunte de clase',
      description: null,
      source_type: 'document',
      tags: ['a', 'b'],
    })
  })

  it('exige asignatura y limita las etiquetas', () => {
    const base = emptySourceFormValues()

    expect(sourceFormSchema.safeParse(base).success).toBe(false)
    expect(
      sourceFormSchema.safeParse({
        ...base,
        subject_id: 'mate',
        tagsText: Array.from({ length: 21 }, (_, index) => `t${index}`).join(','),
      }).success,
    ).toBe(false)
  })

  it('carga una fuente existente para editarla', () => {
    expect(
      sourceToFormValues(
        source({
          external_url: 'https://x.org',
          storage_path: null,
          tags: ['uno', 'dos'],
          node_id: 'n1',
        }),
      ),
    ).toMatchObject({
      mode: 'link',
      url: 'https://x.org',
      tagsText: 'uno, dos',
      node_id: 'n1',
      task_id: '',
    })
  })
})

describe('subida de archivos', () => {
  beforeEach(() => {
    harness.state.uploads = []
    harness.state.removed = []
    harness.state.inserted = []
    harness.state.insertError = null
  })

  const fields = {
    subject_id: 'mate',
    node_id: null,
    task_id: null,
    title: 'Apunte',
    description: null,
    tags: [],
  }

  it('guarda el archivo en {usuario}/{fuente}/archivo y registra tamaño y tipo', async () => {
    const file = new File(['%PDF-1.4'], 'Apunte de Física.pdf', { type: 'application/pdf' })

    await uploadFileSource('user-1', fields, file)

    const [row] = harness.state.inserted
    expect(harness.state.uploads).toEqual([`user-1/${row.id}/Apunte-de-Fisica.pdf`])
    expect(row).toMatchObject({
      user_id: 'user-1',
      storage_path: `user-1/${row.id}/Apunte-de-Fisica.pdf`,
      thumbnail_path: null,
      size_bytes: file.size,
      mime_type: 'application/pdf',
      source_type: 'document',
    })
  })

  it('si la base rechaza la fuente (por ejemplo, por el límite), borra el archivo subido', async () => {
    harness.state.insertError = { code: 'SY001', message: 'Superaste el espacio de la biblioteca.' }
    const file = new File(['x'], 'grande.pdf', { type: 'application/pdf' })

    await expect(uploadFileSource('user-1', fields, file)).rejects.toMatchObject({ code: 'SY001' })
    expect(harness.state.removed).toEqual([harness.state.uploads])
  })
})
