import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { buttonStyles } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import type { AcademicYear, Subject } from '@/types/database'
import { SubjectTabs, type SubjectTab } from './SubjectTabs'
import { formatTeacherNames } from './subject-utils'

/** Encabezado común de las secciones de una asignatura: migas, nombre, color y pestañas. */
export function SubjectPageHeader({
  subject,
  year,
  active,
  actions,
}: {
  subject: Subject
  year: AcademicYear | undefined
  active: SubjectTab
  actions?: ReactNode
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <Link to="/inicio" className="inline-flex items-center gap-1.5 transition hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" />
          Inicio
        </Link>
        <span className="text-ink-disabled">/</span>
        <span className="truncate text-ink-secondary">{subject.name}</span>
      </div>

      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-10 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: subject.color_hex }}
          aria-hidden="true"
        />
        <PageHeader
          className="min-w-0 flex-1"
          eyebrow={year?.name ?? 'Asignatura'}
          title={subject.name}
          description={formatTeacherNames(subject.teacher_names)}
          actions={
            actions ?? (
              <Link
                to={`/asignaturas/${subject.id}/editar`}
                className={buttonStyles({ variant: 'secondary', size: 'sm' })}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Link>
            )
          }
        />
      </div>

      <SubjectTabs subjectId={subject.id} active={active} />
    </>
  )
}
