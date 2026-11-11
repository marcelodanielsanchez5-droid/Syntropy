import { describe, expect, it } from 'vitest'
import {
  changePasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/features/auth/auth-schemas'

const validRegistration = {
  fullName: 'Martina Gómez',
  username: 'martina_01',
  email: 'martina@example.com',
  password: 'Syntropy2026',
  confirmPassword: 'Syntropy2026',
  ageConfirmed: true,
  termsAccepted: true,
  privacyAccepted: true,
}

describe('registerSchema', () => {
  it('acepta un registro completo y recorta el nombre', () => {
    const result = registerSchema.parse({
      ...validRegistration,
      fullName: '  Martina Gómez  ',
    })

    expect(result.fullName).toBe('Martina Gómez')
    expect(result.email).toBe('martina@example.com')
  })

  it.each([
    ['sin mayúscula', 'syntropy2026'],
    ['sin minúscula', 'SYNTROPY2026'],
    ['sin número', 'Syntropy'],
    ['demasiado corta', 'Ab1'],
  ])('rechaza una contraseña %s', (_label, password) => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password,
      confirmPassword: password,
    })

    expect(result.success).toBe(false)
  })

  it('rechaza contraseñas que no coinciden', () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      confirmPassword: 'OtraClave2026',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.some((issue) => issue.path.includes('confirmPassword'))).toBe(true)
  })

  it.each(['ageConfirmed', 'termsAccepted', 'privacyAccepted'] as const)(
    'exige la confirmación %s',
    (field) => {
      const result = registerSchema.safeParse({
        ...validRegistration,
        [field]: false,
      })

      expect(result.success).toBe(false)
      expect(result.error?.issues.some((issue) => issue.path.includes(field))).toBe(true)
    },
  )

  it('rechaza usuarios con espacios o símbolos', () => {
    expect(
      registerSchema.safeParse({ ...validRegistration, username: 'martina gomez' }).success,
    ).toBe(false)
    expect(
      registerSchema.safeParse({ ...validRegistration, username: 'martina!' }).success,
    ).toBe(false)
  })

  it('rechaza correos mal formados', () => {
    expect(
      registerSchema.safeParse({ ...validRegistration, email: 'martina.example.com' }).success,
    ).toBe(false)
  })

  it('rechaza un nombre demasiado largo', () => {
    expect(
      registerSchema.safeParse({ ...validRegistration, fullName: 'a'.repeat(81) }).success,
    ).toBe(false)
  })
})

describe('loginSchema', () => {
  it('acepta correo y contraseña', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true)
  })

  it('rechaza una contraseña vacía', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false)
  })
})

describe('resetPasswordSchema y changePasswordSchema', () => {
  it('aceptan una contraseña válida repetida', () => {
    const input = { password: 'NuevaClave2026', confirmPassword: 'NuevaClave2026' }
    expect(resetPasswordSchema.safeParse(input).success).toBe(true)
    expect(changePasswordSchema.safeParse(input).success).toBe(true)
  })

  it('rechazan la confirmación distinta', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NuevaClave2026',
      confirmPassword: 'NuevaClave2027',
    })

    expect(result.success).toBe(false)
  })
})

describe('profileSchema', () => {
  it('recorta nombre y usuario y exige zona horaria', () => {
    const result = profileSchema.parse({
      fullName: '  Martina  ',
      username: '  martina_01  ',
      timezone: 'America/Argentina/Buenos_Aires',
    })

    expect(result.fullName).toBe('Martina')
    expect(result.username).toBe('martina_01')
    expect(profileSchema.safeParse({ ...result, timezone: '' }).success).toBe(false)
  })
})
