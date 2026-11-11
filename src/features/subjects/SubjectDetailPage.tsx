import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  Library,
  Network,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/auth-provider'
import { useYears } from '@/features/academic-years/year-hooks'
import { withAlpha } from '@/lib/colors'
import { getErrorMessage } from '@/lib/errors'
import { useDeleteSubject, useSubject } from './subject-hooks'
import { formatTeacherNames } from './subject-utils'

function InfoBlock({
  title,
  content,
  empty,
  onEdit,
}: {
  title: string
  content: string | null
  empty: string
  onEdit: () => void
}) {
  return (
    <div className="rounded-xl border border-line bg-sunken/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] font-semibold text-rose-bright transition hover:text-rose-soft"
        >
          Editar
        </button>
      </div>
      <p className="mt-2 whitespace-pre-line text-xs leading-6 text-ink-muted">
        {content || empty}
      </p>
    </div>
  )
}

const modules = [
  { title: 'Calendario', description: 'Tareas y exámenes de la materia.', phase: 'Fase 3', icon: CalendarDays },
  { title: 'Calificaciones', description: 'Evaluaciones, pesos y promedio.', phase: 'Fase 4', icon: GraduationCap },
  { title: 'Nodos', description: 'Mapa de temas y dominio.', phase: 'Fase 5', icon: Network },
  { title: 'Biblioteca', description: 'Fuentes y materiales.', phase: 'Fase 6', icon: Library },
]

export function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const subjectQuery = useSubject(user?.id, id)
  const yearsQuery = useYears(user?.id)
  const deleteSubject = useDeleteSubject(user?.id ?? '')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subject = subjectQuery.data
  const year = yearsQuery.data?.find((item) => item.id === subject?.academic_year_id)

  if (subjectQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }

  if (!subject) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-5 w-5" />}
        title="No encontramos esa asignatura"
        description="Puede que se haya eliminado o que no pertenezca a tu cuenta."
        action={
          <Link to="/inicio" className={buttonStyles({ size: 'md' })}>
            Volver al inicio
          </Link>
        }
      />
    )
  }

  const subjectId = subject.id

  async function handleDelete() {
    setError(null)

    try {
      await deleteSubject.mutateAsync(subjectId)
      setDeleteOpen(false)
      toast.success('Asignatura eliminada.')
      navigate('/inicio', { replace: true })
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'No pudimos eliminar la asignatura.'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <Link to="/inicio" className="inline-flex items-center gap-1.5 transition hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" />
          Inicio
        </Link>
        <span className="text-ink-disabled">/</span>
        <span className="truncate text-ink-secondary">{subject.name}</span>
      </div>

      <PageHeader
        eyebrow={year?.name ?? 'Asignatura'}
        title={subject.name}
        description={formatTeacherNames(subject.teacher_names)}
        actions={
          <>
            <Link
              to={`/asignaturas/${subject.id}/editar`}
              className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger/10 hover:text-danger"
              onClick={() => setDeleteOpen(true)}
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Eliminar
            </Button>
          </>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="h-1.5 w-full" style={{ backgroundColor: subject.color_hex }} />
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span
                  className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border"
                  style={{
                    borderColor: withAlpha(subject.color_hex, 0.28),
                    backgroundColor: withAlpha(subject.color_hex, 0.14),
                    color: subject.color_hex,
                  }}
                >
                  <FolderOpen className="h-7 w-7" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold text-ink">{subject.name}</h2>
                    <Badge variant="outline">{year?.name ?? 'Sin año'}</Badge>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                    <Users className="h-3.5 w-3.5" />
                    {formatTeacherNames(subject.teacher_names)}
                  </p>
                  <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-6 text-ink-secondary">
                    {subject.description || 'Todavía no agregaste una descripción.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-3 text-base font-bold text-ink">Información de la materia</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoBlock
                title="Criterios de evaluación"
                content={subject.evaluation_criteria}
                empty="Sin criterios cargados. Podés agregarlos desde Editar."
                onEdit={() => navigate(`/asignaturas/${subject.id}/editar`)}
              />
              <InfoBlock
                title="Metodología"
                content={subject.methodology}
                empty="Sin metodología cargada. Podés agregarla desde Editar."
                onEdit={() => navigate(`/asignaturas/${subject.id}/editar`)}
              />
              <InfoBlock
                title="Notas"
                content={subject.notes}
                empty="Sin notas. Guardá horarios de consulta o recordatorios."
                onEdit={() => navigate(`/asignaturas/${subject.id}/editar`)}
              />
              <div className="rounded-xl border border-line bg-sunken/35 p-4">
                <h3 className="text-sm font-semibold text-ink">Docentes</h3>
                {subject.teacher_names.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {subject.teacher_names.map((teacher) => (
                      <Badge key={teacher} variant="default">
                        {teacher}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-6 text-ink-muted">
                    Sin docentes. Podés agregarlos desde Editar.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-rose-bright" />
                <CardTitle className="text-base">Módulos de la materia</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {modules.map(({ title, description, phase, icon: Icon }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 rounded-xl border border-line/70 bg-sunken/30 p-3"
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white/5 text-ink-muted">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-ink-secondary">{title}</p>
                      <Badge variant="muted">{phase}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-4 text-ink-disabled">{description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="rounded-xl border border-line bg-sunken/40 p-4 text-[11px] leading-5 text-ink-muted">
            <p className="mb-1 font-semibold text-ink-secondary">Privacidad</p>
            Esta asignatura solo es visible para tu cuenta. Las políticas RLS filtran cada consulta
            por tu identificador de usuario.
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar asignatura"
        description={`Se va a eliminar “${subject.name}” y todos sus datos asociados (tareas, exámenes, notas, nodos y fuentes). Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar asignatura"
        onConfirm={() => void handleDelete()}
        loading={deleteSubject.isPending}
        destructive
      />
    </div>
  )
}
