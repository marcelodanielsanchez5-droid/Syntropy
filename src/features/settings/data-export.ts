import { requireSupabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

/**
 * Descarga de los datos del usuario (derecho de acceso, Ley 25.326 y Fase 8).
 * Junta todas las filas que RLS le deja leer y arma un JSON legible. Los
 * archivos de Storage no se incluyen: se listan sus rutas y se descargan desde
 * la app.
 */

/** Tablas con datos del usuario y la columna para ordenar al paginar. */
export const EXPORT_TABLES = [
  ['user_settings', 'user_id'],
  ['grading_settings', 'user_id'],
  ['academic_years', 'id'],
  ['subjects', 'id'],
  ['schedule_entries', 'id'],
  ['nodes', 'id'],
  ['node_links', 'id'],
  ['tasks', 'id'],
  ['exams', 'id'],
  ['study_sessions', 'id'],
  ['assessments', 'id'],
  ['sources', 'id'],
  ['reminders', 'id'],
] as const

export type ExportTable = (typeof EXPORT_TABLES)[number][0]

/** Supabase devuelve como mucho 1000 filas por consulta. */
const PAGE_SIZE = 1000

export interface DataExport {
  formato: 'syntropy-datos'
  version: 1
  exportado: string
  aviso: string
  cuenta: { id: string; correo: string | null; creada: string | null }
  perfil: Profile | null
  datos: Record<ExportTable, unknown[]>
  archivos: Array<{ bucket: 'avatars' | 'academic-files'; ruta: string }>
}

export const EXPORT_NOTICE =
  'Copia de tus datos en Syntropy. Incluye tu perfil, tus preferencias y todo tu contenido académico. ' +
  'Los archivos (foto de perfil y biblioteca) no van adentro: abajo figuran sus rutas y se descargan desde la app.'

type RowWithPaths = { storage_path?: unknown; thumbnail_path?: unknown }

export function buildDataExport({
  account,
  profile,
  tables,
  now = new Date(),
}: {
  account: { id: string; email?: string | null; created_at?: string | null }
  profile: Profile | null
  tables: Partial<Record<ExportTable, unknown[]>>
  now?: Date
}): DataExport {
  const datos = Object.fromEntries(
    EXPORT_TABLES.map(([table]) => [table, tables[table] ?? []]),
  ) as Record<ExportTable, unknown[]>

  const archivos: DataExport['archivos'] = []

  if (profile?.avatar_path) {
    archivos.push({ bucket: 'avatars', ruta: profile.avatar_path })
  }

  for (const row of datos.sources as RowWithPaths[]) {
    for (const path of [row.storage_path, row.thumbnail_path]) {
      if (typeof path === 'string' && path) {
        archivos.push({ bucket: 'academic-files', ruta: path })
      }
    }
  }

  return {
    formato: 'syntropy-datos',
    version: 1,
    exportado: now.toISOString(),
    aviso: EXPORT_NOTICE,
    cuenta: { id: account.id, correo: account.email ?? null, creada: account.created_at ?? null },
    perfil: profile,
    datos,
    archivos,
  }
}

/** «syntropy-mis-datos-2026-11-13.json» (fecha local del dispositivo). */
export function exportFileName(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `syntropy-mis-datos-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}

async function fetchAllRows(
  table: ExportTable,
  orderColumn: string,
  userId: string,
): Promise<unknown[]> {
  const supabase = requireSupabase()
  const rows: unknown[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    // El cliente tipado no acepta un nombre de tabla variable con filtros:
    // todas estas tablas tienen `user_id` y RLS limita igual las filas.
    const query = supabase.from(table) as unknown as {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string,
        ) => {
          order: (
            column: string,
            options: { ascending: boolean },
          ) => {
            range: (
              from: number,
              to: number,
            ) => PromiseLike<{ data: unknown[] | null; error: unknown }>
          }
        }
      }
    }
    const { data, error } = await query
      .select('*')
      .eq('user_id', userId)
      .order(orderColumn, { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    rows.push(...(data ?? []))

    if (!data || data.length < PAGE_SIZE) {
      return rows
    }
  }
}

export async function collectDataExport(
  account: { id: string; email?: string | null; created_at?: string | null },
  profile: Profile | null,
): Promise<DataExport> {
  const entries = await Promise.all(
    EXPORT_TABLES.map(
      async ([table, orderColumn]) =>
        [table, await fetchAllRows(table, orderColumn, account.id)] as const,
    ),
  )

  return buildDataExport({ account, profile, tables: Object.fromEntries(entries) })
}

/** Guarda el JSON en el dispositivo con el diálogo de descarga del navegador. */
export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Junta los datos y los descarga. Devuelve cuántas filas se exportaron. */
export async function exportMyData(
  account: { id: string; email?: string | null; created_at?: string | null },
  profile: Profile | null,
): Promise<number> {
  const data = await collectDataExport(account, profile)
  downloadJson(exportFileName(), data)
  return Object.values(data.datos).reduce((total, rows) => total + rows.length, 0)
}
