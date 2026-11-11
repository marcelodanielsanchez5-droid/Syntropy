import { z } from 'zod'

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Ingresá tu correo.')
  .max(254, 'El correo es demasiado largo.')
  .refine(
    (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    'Ingresá un correo válido, por ejemplo nombre@correo.com.',
  )

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar los 72 caracteres.')
  .regex(/[a-z]/, 'La contraseña debe incluir al menos una minúscula.')
  .regex(/[A-Z]/, 'La contraseña debe incluir al menos una mayúscula.')
  .regex(/[0-9]/, 'La contraseña debe incluir al menos un número.')

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'El usuario debe tener al menos 3 caracteres.')
  .max(30, 'El usuario no puede superar los 30 caracteres.')
  .regex(
    /^[A-Za-z0-9_]+$/,
    'El usuario solo puede tener letras, números y guiones bajos, sin espacios.',
  )

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresá tu contraseña.'),
})

export const registerSchema = z
  .object({
    fullName: z.string().trim().max(80, 'El nombre no puede superar los 80 caracteres.'),
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Repetí la contraseña.'),
    ageConfirmed: z.boolean().refine((value) => value, {
      message: 'Tenés que confirmar que tenés 13 años o más.',
    }),
    termsAccepted: z.boolean().refine((value) => value, {
      message: 'Tenés que aceptar los términos de uso.',
    }),
    privacyAccepted: z.boolean().refine((value) => value, {
      message: 'Tenés que aceptar la política de privacidad.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  })

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Repetí la contraseña.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  })

export const changePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Repetí la contraseña.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  })

export const profileSchema = z.object({
  fullName: z.string().trim().max(80, 'El nombre no puede superar los 80 caracteres.'),
  username: usernameSchema,
  timezone: z
    .string()
    .min(1, 'Elegí tu zona horaria.')
    .max(64, 'La zona horaria es demasiado larga.'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type ProfileInput = z.infer<typeof profileSchema>
