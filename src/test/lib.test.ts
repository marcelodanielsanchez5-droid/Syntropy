import { describe, expect, it } from 'vitest'
import { getActiveYear } from '@/features/academic-years/year-service'
import { getInitials, getSubjectColorName, isHexColor, withAlpha } from '@/lib/colors'
import {
  formatDate,
  getDefaultAcademicYear,
  getFirstName,
  getGreeting,
  getTimezoneOptions,
  isIsoDate,
} from '@/lib/dates'
import {
  getErrorMessage,
  isNetworkError,
  isUniqueViolation,
  NETWORK_ERROR_MESSAGE,
} from '@/lib/errors'
import type { AcademicYear } from '@/types/database'

describe('colores', () => {
  it('valida colores hexadecimales de seis dígitos', () => {
    expect(isHexColor('#E01462')).toBe(true)
    expect(isHexColor('#e01462')).toBe(true)
    expect(isHexColor('#E0146')).toBe(false)
    expect(isHexColor('E01462')).toBe(false)
    expect(isHexColor('rosa')).toBe(false)
  })

  it('convierte un color a rgba y usa el rosa de marca si es inválido', () => {
    expect(withAlpha('#E01462', 0.5)).toBe('rgba(224, 20, 98, 0.5)')
    expect(withAlpha('inválido', 0.4)).toBe('rgba(224, 20, 98, 0.4)')
  })

  it('genera iniciales y nombres de color', () => {
    expect(getInitials('Martina Gómez')).toBe('MG')
    expect(getInitials('Martina')).toBe('MA')
    expect(getInitials('   ')).toBe('S')
    expect(getInitials(null, 'U')).toBe('U')
    expect(getSubjectColorName('#e01462')).toBe('Rosa')
    expect(getSubjectColorName('#123456')).toBe('Personalizado')
  })
})

describe('fechas', () => {
  it('valida fechas ISO reales del calendario', () => {
    expect(isIsoDate('2026-11-10')).toBe(true)
    expect(isIsoDate('2024-02-29')).toBe(true)
    expect(isIsoDate('2026-02-29')).toBe(false)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-13-01')).toBe(false)
    expect(isIsoDate('10/11/2026')).toBe(false)
  })

  it('formatea fechas y detecta valores inválidos', () => {
    expect(formatDate('2026-11-10', 'yyyy-MM-dd')).toBe('2026-11-10')
    expect(formatDate('no-es-fecha')).toBe('Fecha inválida')
  })

  it('entrega un año académico por defecto coherente', () => {
    const year = getDefaultAcademicYear()
    expect(year.name).toMatch(/^\d{4}$/)
    expect(year.starts_on).toMatch(/^\d{4}-03-01$/)
    expect(year.ends_on).toMatch(/^\d{4}-12-20$/)
  })

  it('obtiene el nombre y el saludo', () => {
    expect(getFirstName('  Martina Gómez  ', 'martina')).toBe('Martina')
    expect(getFirstName('', 'martina')).toBe('martina')
    expect(getFirstName(null, 'martina')).toBe('martina')
    expect(['Buenas noches', 'Buenos días', 'Buenas tardes']).toContain(getGreeting())
  })

  it('incluye UTC y la zona detectada en las opciones', () => {
    const options = getTimezoneOptions()
    expect(options).toContain('UTC')
    expect(options.length).toBeGreaterThan(1)
  })

  it('incluye la zona actual aunque no esté en la lista del navegador', () => {
    const options = getTimezoneOptions('America/Argentina/Buenos_Aires')
    expect(options).toContain('America/Argentina/Buenos_Aires')
  })
})

describe('errores', () => {
  it('traduce códigos de Auth y PostgreSQL', () => {
    expect(getErrorMessage({ code: 'invalid_credentials' })).toBe(
      'El correo o la contraseña no son correctos.',
    )
    expect(getErrorMessage({ code: '23505' })).toBe('Ya existe un registro con esos datos.')
    expect(getErrorMessage({ code: '42501' })).toBe('No tenés permiso para realizar esta acción.')
  })

  it('conserva mensajes propios y usa el fallback', () => {
    expect(getErrorMessage(new Error('Fallo de red'))).toBe('Fallo de red')
    expect(getErrorMessage({ message: 'Mensaje del servidor' })).toBe('Mensaje del servidor')
    expect(getErrorMessage(null, 'Fallback')).toBe('Fallback')
  })

  it('prioriza el código traducido aunque el error sea una instancia de Error', () => {
    const error = Object.assign(new Error('email rate limit exceeded'), {
      code: 'over_email_send_rate_limit',
      status: 429,
    })

    expect(getErrorMessage(error)).toBe(
      'Enviaste demasiados correos seguidos. Esperá unos minutos antes de volver a intentar.',
    )
  })

  it('traduce los fallos de red de cada navegador', () => {
    const chrome = new TypeError('Failed to fetch')
    const firefox = new TypeError('NetworkError when attempting to fetch resource.')
    const safari = new TypeError('Load failed')
    const authWrapper = Object.assign(new Error('Failed to fetch'), {
      name: 'AuthRetryableFetchError',
      status: 0,
    })
    const postgrest = { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' }

    for (const error of [chrome, firefox, safari, authWrapper, postgrest]) {
      expect(isNetworkError(error)).toBe(true)
      expect(getErrorMessage(error, 'Fallback')).toBe(NETWORK_ERROR_MESSAGE)
    }
  })

  it('no confunde otros errores con un fallo de red', () => {
    expect(isNetworkError(new Error('Fallo de red'))).toBe(false)
    expect(isNetworkError({ code: '23505', message: 'duplicate key value' })).toBe(false)
    expect(isNetworkError(null)).toBe(false)
    expect(isNetworkError('Failed to fetch')).toBe(false)
  })

  it('avisa que la sesión expiró cuando el token ya no sirve', () => {
    const expected = 'Tu sesión expiró. Volvé a ingresar.'

    expect(getErrorMessage({ code: 'refresh_token_not_found' })).toBe(expected)
    expect(getErrorMessage({ code: 'PGRST301', message: 'JWT expired' })).toBe(expected)
  })

  it('detecta violaciones de unicidad por código y restricción', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true)
    expect(
      isUniqueViolation(
        { code: '23505', constraint: 'academic_years_one_active_per_user' },
        'academic_years_one_active_per_user',
      ),
    ).toBe(true)
    expect(
      isUniqueViolation(
        { code: '23505', constraint: 'otra_restriccion' },
        'academic_years_one_active_per_user',
      ),
    ).toBe(false)
    expect(isUniqueViolation({ code: '23503' })).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
  })
})

describe('getActiveYear', () => {
  const baseYear: AcademicYear = {
    id: 'year-1',
    user_id: 'user-1',
    name: '5.º año',
    starts_on: '2026-03-01',
    ends_on: '2026-12-20',
    is_active: false,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  }

  it('devuelve el año activo o null', () => {
    expect(getActiveYear(undefined)).toBeNull()
    expect(getActiveYear([baseYear])).toBeNull()
    expect(getActiveYear([baseYear, { ...baseYear, id: 'year-2', is_active: true }])?.id).toBe(
      'year-2',
    )
  })
})
