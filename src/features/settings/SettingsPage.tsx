import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarRange,
  Check,
  ChevronRight,
  CircleHelp,
  DatabaseZap,
  LogOut,
  Moon,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/features/auth/auth-provider'
import { useAvatarUrl } from '@/features/profile/use-avatar-url'
import { clearLocalCache } from '@/lib/query-client'
import { formatDateRange } from '@/lib/dates'
import { getErrorMessage } from '@/lib/errors'
import type { AcademicYear } from '@/types/database'
import { DeleteAccountDialog } from './DeleteAccountDialog'
import { YearDialog } from '@/features/academic-years/YearDialog'
import { useActivateYear, useDeleteYear, useYears } from '@/features/academic-years/year-hooks'

function SettingRow({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line/70 py-4 first:pt-0 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-ink-muted">{description}</p>
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  )
}

function YearRow({
  year,
  onEdit,
  onDelete,
  onActivate,
  activating,
}: {
  year: AcademicYear
  onEdit: () => void
  onDelete: () => void
  onActivate: () => void
  activating: boolean
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-sunken/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white/5 text-rose-bright">
          <CalendarRange className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-ink">{year.name}</p>
            {year.is_active ? (
              <Badge variant="success">
                <Check className="h-3 w-3" />
                Activo
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">
            {formatDateRange(year.starts_on, year.ends_on)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!year.is_active ? (
          <Button variant="ghost" size="sm" onClick={onActivate} loading={activating}>
            Activar
          </Button>
        ) : null}
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-white/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/40"
          aria-label={`Editar ${year.name}`}
          title="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
          aria-label={`Eliminar ${year.name}`}
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: years, isLoading } = useYears(user?.id)
  const activateYear = useActivateYear(user?.id ?? '')
  const deleteYear = useDeleteYear(user?.id ?? '')
  const { data: avatarUrl } = useAvatarUrl(profile?.avatar_path)
  const [yearDialogOpen, setYearDialogOpen] = useState(false)
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AcademicYear | null>(null)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const nuevo = searchParams.get('nuevo')

  useEffect(() => {
    if (nuevo === 'anio') {
      setEditingYear(null)
      setYearDialogOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('nuevo')
      setSearchParams(next, { replace: true })
    }
  }, [nuevo, searchParams, setSearchParams])

  async function handleActivate(year: AcademicYear) {
    setLocalError(null)

    try {
      await activateYear.mutateAsync(year.id)
      toast.success(`“${year.name}” es ahora el año activo.`)
    } catch (error) {
      setLocalError(getErrorMessage(error, 'No pudimos activar ese año.'))
    }
  }

  async function handleDeleteYear() {
    if (!deleteTarget) {
      return
    }

    setLocalError(null)

    try {
      await deleteYear.mutateAsync(deleteTarget.id)
      toast.success('Año de curso eliminado.')
      setDeleteTarget(null)
    } catch (error) {
      setLocalError(getErrorMessage(error, 'No pudimos eliminar el año de curso.'))
    }
  }

  async function handleClearCache() {
    await clearLocalCache()
    toast.success('Se borró la copia local. Los datos se van a volver a descargar.')
  }

  async function handleSignOut() {
    await signOut()
    navigate('/ingresar', { replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cuenta"
        title="Configuración"
        description="Administrá tus años de curso, la privacidad del dispositivo y tu cuenta."
      />

      {localError ? <Alert variant="error">{localError}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card id="anios">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Años de curso</CardTitle>
                  <p className="mt-1 text-sm text-ink-muted">
                    El año activo es el contexto que se muestra en toda la aplicación.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingYear(null)
                    setYearDialogOpen(true)
                  }}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Nuevo año
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <p className="py-6 text-center text-sm text-ink-muted">Cargando años…</p>
              ) : years && years.length > 0 ? (
                years.map((year) => (
                  <YearRow
                    key={year.id}
                    year={year}
                    activating={activateYear.isPending}
                    onActivate={() => void handleActivate(year)}
                    onEdit={() => {
                      setEditingYear(year)
                      setYearDialogOpen(true)
                    }}
                    onDelete={() => setDeleteTarget(year)}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-line-strong/70 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-ink-secondary">
                    Todavía no hay años de curso
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Creá el primero para poder agregar asignaturas.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card id="privacidad">
            <CardHeader>
              <CardTitle>Privacidad y datos locales</CardTitle>
              <p className="mt-1 text-sm text-ink-muted">
                La app guarda una copia de las consultas para funcionar sin conexión.
              </p>
            </CardHeader>
            <CardContent>
              <SettingRow
                title="Caché offline"
                description="Se separa por usuario, caduca a las 24 horas y se borra al cerrar sesión. No está cifrada por el sistema operativo."
              >
                <Badge variant="info">IndexedDB</Badge>
              </SettingRow>
              <SettingRow
                title="Borrar copia local"
                description="Elimina los datos descargados en este dispositivo. No borra nada en Supabase."
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleClearCache()}
                  leftIcon={<DatabaseZap className="h-3.5 w-3.5" />}
                >
                  Borrar
                </Button>
              </SettingRow>
              <SettingRow
                title="Dispositivos compartidos"
                description="Cerrá sesión al terminar y evitá dejar la cuenta abierta en equipos ajenos."
              >
                <ShieldCheck className="h-4 w-4 text-success" />
              </SettingRow>
            </CardContent>
          </Card>

          <Card id="apariencia">
            <CardHeader>
              <CardTitle>Apariencia</CardTitle>
              <p className="mt-1 text-sm text-ink-muted">
                El MVP usa un tema oscuro único para reducir estados y asegurar contraste.
              </p>
            </CardHeader>
            <CardContent>
              <SettingRow title="Tema" description="Oscuro, con tokens preparados para tema claro.">
                <Badge variant="purple">
                  <Moon className="h-3 w-3" />
                  Oscuro
                </Badge>
              </SettingRow>
            </CardContent>
          </Card>

          <Card id="cuenta">
            <CardHeader>
              <CardTitle>Cuenta</CardTitle>
              <p className="mt-1 text-sm text-ink-muted">
                Sesión, correo y eliminación definitiva de la cuenta.
              </p>
            </CardHeader>
            <CardContent>
              <SettingRow title="Correo" description={user?.email ?? 'Sin correo disponible'}>
                <Badge variant="outline">Verificado</Badge>
              </SettingRow>
              <SettingRow
                title="Cerrar sesión"
                description="Se borra la caché local y volvés a la pantalla de ingreso."
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleSignOut()}
                  leftIcon={<LogOut className="h-3.5 w-3.5" />}
                >
                  Cerrar sesión
                </Button>
              </SettingRow>
              <SettingRow
                title="Eliminar cuenta"
                description="Borra el perfil, los años, las asignaturas y todos los datos asociados."
              >
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteAccountOpen(true)}
                  leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                >
                  Eliminar
                </Button>
              </SettingRow>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Avatar name={profile?.full_name || profile?.username} src={avatarUrl} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">
                    {profile?.full_name || profile?.username}
                  </p>
                  <p className="truncate text-xs text-ink-muted">@{profile?.username}</p>
                </div>
              </div>
              <Link
                to="/perfil"
                className="mt-4 flex items-center justify-between rounded-xl border border-line bg-sunken/40 px-3 py-2.5 text-xs font-semibold text-ink-secondary transition hover:bg-white/5 hover:text-ink"
              >
                <span className="inline-flex items-center gap-2">
                  <UserRound className="h-3.5 w-3.5 text-rose-bright" />
                  Editar perfil
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Calificaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs leading-5 text-ink-muted">
                La escala global (mínimo, máximo y nota de aprobación) se configura en la Fase 4,
                junto con las evaluaciones y el promedio.
              </p>
              <div className="mt-3">
                <Badge variant="info">Fase 4</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white/5 text-ink-muted">
                  <CircleHelp className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">¿Necesitás ayuda?</p>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">
                    La documentación de la Fase 2 explica la configuración de Supabase y las rutas
                    disponibles.
                  </p>
                  <Link
                    to="/configuracion-inicial"
                    className="mt-2 inline-flex text-xs font-semibold text-rose-bright hover:text-rose-soft"
                  >
                    Ver configuración inicial
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/[0.04] p-3 text-[11px] leading-5 text-ink-muted">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            El logo y los textos legales son provisionales. No publicar sin revisión.
          </div>
        </aside>
      </div>

      <YearDialog
        open={yearDialogOpen}
        onOpenChange={(open) => {
          setYearDialogOpen(open)
          if (!open) {
            setEditingYear(null)
          }
        }}
        year={editingYear}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        title="Eliminar año de curso"
        description={
          deleteTarget
            ? `Se va a eliminar “${deleteTarget.name}” y todas sus asignaturas, tareas y notas asociadas. Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar año"
        onConfirm={() => void handleDeleteYear()}
        loading={deleteYear.isPending}
        destructive
      />

      <DeleteAccountDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen} />
    </div>
  )
}
