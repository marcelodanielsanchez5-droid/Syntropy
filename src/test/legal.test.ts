import { describe, expect, it } from 'vitest'
import migration006 from '../../supabase/migrations/006_versiones_legales.sql?raw'
import { missingLegalVariables, readLegalContact } from '@/features/legal/legal-config'
import {
  getLegalDocument,
  legalDocumentText,
  privacyPolicy,
  termsOfUse,
  type LegalDocument,
} from '@/features/legal/legal-documents'
import {
  LEGAL_VERSIONS,
  needsLegalAcceptance,
  pendingLegalAcceptance,
} from '@/features/legal/legal-versions'
import { EXPORT_TABLES, buildDataExport, exportFileName } from '@/features/settings/data-export'
import type { Profile } from '@/types/database'

const FULL_CONTACT = readLegalContact({
  VITE_LEGAL_OWNER: '  Ana Pérez  ',
  VITE_LEGAL_CONTACT_EMAIL: 'contacto@syntropy.example',
  VITE_LEGAL_LOCATION: 'Rosario, Santa Fe, Argentina',
})

const EMPTY_CONTACT = readLegalContact({})

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'u1',
    username: 'martina',
    full_name: 'Martina Gómez',
    avatar_path: null,
    timezone: 'America/Argentina/Buenos_Aires',
    locale: 'es',
    onboarded_at: '2026-11-10T12:00:00Z',
    terms_accepted_at: '2026-11-13T12:00:00Z',
    privacy_accepted_at: '2026-11-13T12:00:00Z',
    age_confirmed_at: '2026-11-10T12:00:00Z',
    terms_version: LEGAL_VERSIONS.terms,
    privacy_version: LEGAL_VERSIONS.privacy,
    created_at: '2026-11-10T12:00:00Z',
    updated_at: '2026-11-13T12:00:00Z',
    ...overrides,
  }
}

describe('datos del responsable', () => {
  it('lee y limpia las variables', () => {
    expect(FULL_CONTACT).toEqual({
      owner: 'Ana Pérez',
      email: 'contacto@syntropy.example',
      location: 'Rosario, Santa Fe, Argentina',
    })
    expect(missingLegalVariables(FULL_CONTACT)).toEqual([])
  })

  it('avisa qué falta y descarta un correo inválido', () => {
    expect(missingLegalVariables(EMPTY_CONTACT)).toEqual([
      'VITE_LEGAL_OWNER',
      'VITE_LEGAL_CONTACT_EMAIL',
      'VITE_LEGAL_LOCATION',
    ])
    expect(readLegalContact({ VITE_LEGAL_CONTACT_EMAIL: 'no es un correo' }).email).toBeNull()
  })
})

describe('textos legales', () => {
  const documents: LegalDocument[] = [termsOfUse(FULL_CONTACT), privacyPolicy(FULL_CONTACT)]

  it('usan la versión vigente, igual que la migración 006', () => {
    const match = migration006.match(/select '([\d-]+)'::text, '([\d-]+)'::text/)

    expect(match?.slice(1)).toEqual([LEGAL_VERSIONS.terms, LEGAL_VERSIONS.privacy])
    expect(termsOfUse(FULL_CONTACT).version).toBe(LEGAL_VERSIONS.terms)
    expect(privacyPolicy(FULL_CONTACT).version).toBe(LEGAL_VERSIONS.privacy)
  })

  it('con los datos completos no quedan marcas de pendiente y aparece el contacto', () => {
    for (const document of documents) {
      const text = legalDocumentText(document)
      expect(text).not.toContain('[dato pendiente]')
      expect(text).toContain('Ana Pérez')
      expect(text).toContain('Rosario, Santa Fe, Argentina')
    }

    expect(legalDocumentText(privacyPolicy(FULL_CONTACT))).toContain('contacto@syntropy.example')
  })

  it('sin datos, el texto lo marca a la vista', () => {
    expect(legalDocumentText(privacyPolicy(EMPTY_CONTACT))).toContain('[dato pendiente]')
    expect(legalDocumentText(termsOfUse(EMPTY_CONTACT))).toContain('[dato pendiente]')
  })

  it('numera las secciones en orden y sin ids repetidos', () => {
    for (const document of documents) {
      const numbers = document.sections.map((section) => Number(section.title.split('.')[0]))
      expect(numbers).toEqual(numbers.map((_, index) => index + 1))
      expect(new Set(document.sections.map((section) => section.id)).size).toBe(
        document.sections.length,
      )
      expect(document.summary.length).toBeGreaterThan(0)
      expect(document.changes.length).toBeGreaterThan(0)
    }
  })

  it('la privacidad cubre lo que pide la Ley 25.326 y lo que hace la app', () => {
    const text = legalDocumentText(privacyPolicy(FULL_CONTACT))

    for (const expected of [
      'Ley 25.326',
      'Agencia de Acceso a la Información Pública',
      'Supabase',
      'Resend',
      '13 años',
      'Descargar mis datos',
      '10 días corridos',
      '5 días hábiles',
    ]) {
      expect(text).toContain(expected)
    }
  })

  it('los términos reflejan los límites aprobados (D27 y D28)', () => {
    const text = legalDocumentText(termsOfUse(FULL_CONTACT))

    expect(text).toContain('25 MB')
    expect(text).toContain('200 MB')
    expect(text).toContain('1000 fuentes')
    expect(text).toContain('20 correos por día')
    expect(text).toContain('Ley 24.240')
  })

  it('una ruta desconocida no tiene documento', () => {
    expect(getLegalDocument('cookies', FULL_CONTACT)).toBeNull()
    expect(getLegalDocument('terminos', FULL_CONTACT)?.title).toBe('Términos de uso')
  })
})

describe('aceptación de la versión vigente', () => {
  it('no pide nada si aceptó la versión vigente', () => {
    const state = pendingLegalAcceptance(profile())
    expect(state).toEqual({ terms: false, privacy: false, age: false })
    expect(needsLegalAcceptance(state)).toBe(false)
  })

  it('pide aceptar si aceptó el borrador o nada', () => {
    expect(
      pendingLegalAcceptance(
        profile({ terms_version: 'borrador-2026-11-10', privacy_version: 'borrador-2026-11-10' }),
      ),
    ).toEqual({ terms: true, privacy: true, age: false })

    const fresh = pendingLegalAcceptance(
      profile({ terms_version: null, privacy_version: null, age_confirmed_at: null }),
    )
    expect(fresh).toEqual({ terms: true, privacy: true, age: true })
    expect(needsLegalAcceptance(fresh)).toBe(true)
  })

  it('pide aceptar si cambió solo uno de los textos', () => {
    expect(
      needsLegalAcceptance(pendingLegalAcceptance(profile({ privacy_version: 'vieja' }))),
    ).toBe(true)
  })
})

describe('descarga de mis datos', () => {
  it('incluye todas las tablas aunque estén vacías y la cuenta', () => {
    const data = buildDataExport({
      account: { id: 'u1', email: 'martina@example.com', created_at: '2026-11-10T12:00:00Z' },
      profile: profile(),
      tables: { tasks: [{ id: 't1' }] },
      now: new Date('2026-11-13T15:00:00Z'),
    })

    expect(Object.keys(data.datos)).toEqual(EXPORT_TABLES.map(([table]) => table))
    expect(data.datos.tasks).toEqual([{ id: 't1' }])
    expect(data.datos.reminders).toEqual([])
    expect(data.cuenta).toEqual({
      id: 'u1',
      correo: 'martina@example.com',
      creada: '2026-11-10T12:00:00Z',
    })
    expect(data.exportado).toBe('2026-11-13T15:00:00.000Z')
    expect(data.formato).toBe('syntropy-datos')
  })

  it('lista los archivos de la foto y de la biblioteca, sin los enlaces', () => {
    const data = buildDataExport({
      account: { id: 'u1' },
      profile: profile({ avatar_path: 'u1/avatar.png' }),
      tables: {
        sources: [
          { storage_path: 'u1/s1/apunte.pdf', thumbnail_path: null },
          { storage_path: 'u1/s2/foto.jpg', thumbnail_path: 'u1/s2/miniatura.jpg' },
          { storage_path: null, external_url: 'https://example.com' },
        ],
      },
    })

    expect(data.archivos).toEqual([
      { bucket: 'avatars', ruta: 'u1/avatar.png' },
      { bucket: 'academic-files', ruta: 'u1/s1/apunte.pdf' },
      { bucket: 'academic-files', ruta: 'u1/s2/foto.jpg' },
      { bucket: 'academic-files', ruta: 'u1/s2/miniatura.jpg' },
    ])
  })

  it('nombra el archivo con la fecha local', () => {
    expect(exportFileName(new Date(2026, 10, 3, 23, 30))).toBe('syntropy-mis-datos-2026-11-03.json')
  })
})
