import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  Camera,
  Check,
  KeyRound,
  Mail,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/features/auth/auth-provider'
import { updatePassword, uploadAvatar } from '@/features/auth/auth-service'
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordInput,
  type ProfileInput,
} from '@/features/auth/auth-schemas'
import { PasswordInput } from '@/features/auth/PasswordInput'
import { useAvatarUrl } from './use-avatar-url'
import { getTimezoneOptions, formatDate } from '@/lib/dates'
import { getErrorMessage, isUniqueViolation } from '@/lib/errors'

function ChangePasswordCard() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit(values: ChangePasswordInput) {
    setError(null)
    setLoading(true)

    try {
      await updatePassword(values.password)
      reset()
      toast.success('Contraseña actualizada. Volvé a ingresar.')
      await signOut()
      navigate('/ingresar?restablecida=1', { replace: true })
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'No pudimos actualizar la contraseña.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-rose-bright" />
          <CardTitle className="text-base">Cambiar contraseña</CardTitle>
        </div>
        <p className="text-sm text-ink-muted">
          Al guardar, se cierra la sesión para que vuelvas a ingresar con la nueva contraseña.
        </p>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nueva contraseña"
              htmlFor="new-password"
              error={errors.password?.message}
              required
            >
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                invalid={Boolean(errors.password)}
                {...register('password')}
              />
            </Field>
            <Field
              label="Repetir contraseña"
              htmlFor="confirm-new-password"
              error={errors.confirmPassword?.message}
              required
            >
              <PasswordInput
                id="confirm-new-password"
                autoComplete="new-password"
                placeholder="Repetí la contraseña"
                invalid={Boolean(errors.confirmPassword)}
                {...register('confirmPassword')}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={loading}>
              Guardar contraseña
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function ProfilePage() {
  const { user, profile, updateProfile, refreshProfile, signOut } = useAuth()
  const { data: avatarUrl } = useAvatarUrl(profile?.avatar_path)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timezoneOptions = getTimezoneOptions(profile?.timezone)

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.full_name ?? '',
      username: profile?.username ?? '',
      timezone: profile?.timezone ?? 'UTC',
    },
  })

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.full_name ?? '',
        username: profile.username,
        timezone: profile.timezone,
      })
    }
  }, [profile, reset])

  async function onSubmit(values: ProfileInput) {
    setError(null)

    try {
      await updateProfile({
        full_name: values.fullName || null,
        username: values.username,
        timezone: values.timezone,
      })
      toast.success('Perfil actualizado.')
    } catch (nextError) {
      if (isUniqueViolation(nextError)) {
        setFormError('username', { message: 'Ese nombre de usuario ya está en uso.' })
      } else {
        setError(getErrorMessage(nextError, 'No pudimos guardar los cambios.'))
      }
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !user) {
      return
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Usá una imagen PNG, JPG o WebP.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no puede superar los 2 MB.')
      return
    }

    setUploading(true)

    try {
      await uploadAvatar(user.id, file)
      await refreshProfile()
      toast.success('Foto actualizada.')
    } catch (nextError) {
      toast.error(getErrorMessage(nextError, 'No pudimos subir la foto. Revisá Storage y RLS.'))
    } finally {
      setUploading(false)
    }
  }

  async function handleSignOut() {
    await signOut()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cuenta"
        title="Mi perfil"
        description="Tus datos personales, tu identidad dentro de Syntropy y la seguridad de la cuenta."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-rose-bright" />
                <CardTitle className="text-base">Datos personales</CardTitle>
              </div>
              <p className="text-sm text-ink-muted">
                El nombre completo es opcional. El usuario es único y se usa para identificarte.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Nombre completo"
                    htmlFor="profile-full-name"
                    error={errors.fullName?.message}
                    hint="Opcional"
                  >
                    <Input
                      id="profile-full-name"
                      autoComplete="name"
                      placeholder="Tu nombre"
                      invalid={Boolean(errors.fullName)}
                      {...register('fullName')}
                    />
                  </Field>
                  <Field
                    label="Usuario"
                    htmlFor="profile-username"
                    error={errors.username?.message}
                    required
                  >
                    <Input
                      id="profile-username"
                      autoComplete="username"
                      leftIcon={<span className="text-sm font-semibold">@</span>}
                      invalid={Boolean(errors.username)}
                      {...register('username')}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Correo electrónico"
                    htmlFor="profile-email"
                    hint="No editable"
                  >
                    <Input
                      id="profile-email"
                      type="email"
                      value={user?.email ?? ''}
                      disabled
                      leftIcon={<Mail className="h-4 w-4" />}
                    />
                  </Field>
                  <Field
                    label="Zona horaria"
                    htmlFor="profile-timezone"
                    error={errors.timezone?.message}
                    required
                  >
                    <Select
                      id="profile-timezone"
                      invalid={Boolean(errors.timezone)}
                      {...register('timezone')}
                    >
                      {timezoneOptions.map((timezone) => (
                        <option key={timezone} value={timezone}>
                          {timezone.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-line/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-ink-disabled">
                    {isDirty ? 'Hay cambios sin guardar.' : 'Tus datos están al día.'}
                  </p>
                  <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
                    <Check className="h-4 w-4" />
                    Guardar cambios
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <ChangePasswordCard />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center p-5 text-center">
              <Avatar
                name={profile?.full_name || profile?.username}
                src={avatarUrl}
                size="xl"
                className="ring-4 ring-rose/15"
              />
              <p className="mt-3 text-sm font-bold text-ink">
                {profile?.full_name || profile?.username}
              </p>
              <p className="text-xs text-ink-muted">@{profile?.username}</p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  void handleAvatarChange(event)
                }}
                className="sr-only"
                id="avatar-upload"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4"
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Camera className="h-3.5 w-3.5" />}
              >
                Cambiar foto
              </Button>
              <p className="mt-2 text-[10px] leading-4 text-ink-disabled">
                PNG, JPG o WebP. Máximo 2 MB. Se guarda en un bucket privado.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cuenta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-ink-muted">Correo</span>
                <span className="max-w-40 truncate text-xs font-medium text-ink-secondary">
                  {user?.email}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-ink-muted">Miembro desde</span>
                <span className="text-xs font-medium text-ink-secondary">
                  {profile ? formatDate(profile.created_at, 'MMM yyyy') : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-ink-muted">Consentimientos</span>
                <Badge variant="success">
                  <ShieldCheck className="h-3 w-3" />
                  Registrados
                </Badge>
              </div>
              <div className="border-t border-line pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-ink-muted"
                  onClick={() => void handleSignOut()}
                >
                  Cerrar sesión
                </Button>
                <Link
                  to="/configuracion#cuenta"
                  className={buttonStyles({
                    variant: 'ghost',
                    size: 'sm',
                    className: 'w-full justify-start text-danger hover:bg-danger/10 hover:text-danger',
                  })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar cuenta
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-xl border border-line bg-sunken/40 p-4 text-[11px] leading-5 text-ink-muted">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink-secondary">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Privacidad
            </p>
            Tus datos académicos son privados. El acceso está protegido por RLS: solo tu cuenta
            puede leer y editar tus filas.
          </div>
        </aside>
      </div>
    </div>
  )
}
