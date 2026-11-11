import { describe, expect, it } from 'vitest'
import { academicYearSchema } from '@/features/academic-years/year-schemas'

const validYear = {
  name: '5.º año · 2026',
  starts_on: '2026-03-01',
  ends_on: '2026-12-20',
  activate: true,
}

describe('academicYearSchema', () => {
  it('acepta un año válido y recorta el nombre', () => {
    const result = academicYearSchema.parse({ ...validYear, name: '  5.º año  ' })
    expect(result.name).toBe('5.º año')
  })

  it('exige que el fin sea igual o posterior al inicio', () => {
    const result = academicYearSchema.safeParse({
      ...validYear,
      starts_on: '2026-12-20',
      ends_on: '2026-03-01',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.some((issue) => issue.path.includes('ends_on'))).toBe(true)
  })

  it('acepta un año que empieza y termina el mismo día', () => {
    expect(
      academicYearSchema.safeParse({
        ...validYear,
        starts_on: '2026-03-01',
        ends_on: '2026-03-01',
      }).success,
    ).toBe(true)
  })

  it.each(['2026-02-30', '2026-13-01', '2026-00-10', '01-03-2026', ''])(
    'rechaza la fecha inválida %s',
    (date) => {
      expect(academicYearSchema.safeParse({ ...validYear, starts_on: date }).success).toBe(false)
    },
  )

  it('acepta el 29 de febrero de un año bisiesto', () => {
    expect(
      academicYearSchema.safeParse({
        ...validYear,
        starts_on: '2024-02-29',
        ends_on: '2024-12-20',
      }).success,
    ).toBe(true)
  })

  it('exige el nombre y la decisión de activación', () => {
    expect(academicYearSchema.safeParse({ ...validYear, name: '   ' }).success).toBe(false)

    const { activate: _activate, ...withoutActivate } = validYear
    expect(academicYearSchema.safeParse(withoutActivate).success).toBe(false)
  })
})
