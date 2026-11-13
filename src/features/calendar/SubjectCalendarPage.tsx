import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import { buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/auth-provider'
import { useYears } from '@/features/academic-years/year-hooks'
import { SubjectPageHeader } from '@/features/subjects/SubjectPageHeader'
import { useSubject } from '@/features/subjects/subject-hooks'
import { CalendarWorkspace } from './CalendarWorkspace'
import { useActiveYearAgenda, useAgenda, useProfileTimeZone } from './use-agenda'

/**
 * Calendario de una asignatura: es lo primero que se ve al entrar en ella.
 * Suma los días pintados hasta cada entrega y las sesiones de estudio.
 */
export function SubjectCalendarPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const timeZone = useProfileTimeZone()
  const subjectQuery = useSubject(user?.id, id)
  const yearsQuery = useYears(user?.id)
  const subject = subjectQuery.data
  const subjects = useMemo(() => (subject ? [subject] : []), [subject])
  const agenda = useAgenda(user?.id, subjects)
  // La agenda del año ya está en caché (la usa la campana): sirve para avisar
  // si un plan de estudio se superpone con exámenes de otras materias.
  const yearAgenda = useActiveYearAgenda()
  const year = yearsQuery.data?.find((item) => item.id === subject?.academic_year_id)
  const inActiveYear = Boolean(subject && year?.is_active)
  // Nombres y colores de todas las materias del año, para los avisos de superposición.
  const subjectsById = useMemo(
    () => new Map([...yearAgenda.subjectsById, ...agenda.subjectsById]),
    [yearAgenda.subjectsById, agenda.subjectsById],
  )

  if (subjectQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }

  if (!subject || !user) {
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

  return (
    <div className="space-y-5">
      <SubjectPageHeader subject={subject} year={year} active="calendario" />

      <CalendarWorkspace
        mode="subject"
        userId={user.id}
        timeZone={timeZone}
        subjects={subjects}
        subjectsById={subjectsById}
        lockedSubject={subject}
        tasks={agenda.tasks}
        exams={agenda.exams}
        sessions={agenda.sessions}
        busyExams={inActiveYear ? yearAgenda.exams : agenda.exams}
        busySessions={inActiveYear ? yearAgenda.sessions : agenda.sessions}
        isLoading={agenda.isLoading}
        isError={agenda.isError}
        error={agenda.error}
        onRetry={agenda.refetch}
      />
    </div>
  )
}
