import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import { buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/auth-provider'
import { useYears } from '@/features/academic-years/year-hooks'
import { useActiveYearScope, useAgenda, useProfileTimeZone } from '@/features/calendar/use-agenda'
import { useAssessments } from '@/features/grades/grade-hooks'
import { SubjectPageHeader } from '@/features/subjects/SubjectPageHeader'
import { useSubject } from '@/features/subjects/subject-hooks'
import { KnowledgeWorkspace } from './KnowledgeWorkspace'
import { useNodeLinks, useNodes } from './node-hooks'

/** Árbol de temas de una asignatura, dentro de sus pestañas. */
export function SubjectNodesPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const timeZone = useProfileTimeZone()
  const subjectQuery = useSubject(user?.id, id)
  const yearsQuery = useYears(user?.id)
  const subject = subjectQuery.data
  const subjects = useMemo(() => (subject ? [subject] : []), [subject])
  const nodesQuery = useNodes(
    user?.id,
    subjects.map((item) => item.id),
  )
  // Nodos del resto del año: posibles destinos de conexiones entre materias.
  const scope = useActiveYearScope()
  const yearSubjectIds = useMemo(
    () => scope.subjects.map((item) => item.id).sort(),
    [scope.subjects],
  )
  const yearNodesQuery = useNodes(user?.id, yearSubjectIds)
  const linksQuery = useNodeLinks(user?.id)
  const assessmentsQuery = useAssessments(
    user?.id,
    subjects.map((item) => item.id),
  )
  const agenda = useAgenda(user?.id, subjects)
  const year = yearsQuery.data?.find((item) => item.id === subject?.academic_year_id)
  const yearSubjects = useMemo(() => {
    const list = [...scope.subjects]
    return subject && !list.some((item) => item.id === subject.id) ? [...list, subject] : list
  }, [scope.subjects, subject])
  const subjectsById = useMemo(
    () => new Map(yearSubjects.map((item) => [item.id, item])),
    [yearSubjects],
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
      <SubjectPageHeader subject={subject} year={year} active="nodos" />

      <KnowledgeWorkspace
        mode="subject"
        userId={user.id}
        timeZone={timeZone}
        subjects={subjects}
        subjectsById={subjectsById}
        nodes={nodesQuery.data ?? []}
        yearNodes={yearNodesQuery.data ?? []}
        yearSubjects={yearSubjects}
        links={linksQuery.data ?? []}
        assessments={assessmentsQuery.data ?? []}
        tasks={agenda.tasks}
        exams={agenda.exams}
        isLoading={nodesQuery.isLoading || linksQuery.isLoading}
        isError={nodesQuery.isError || linksQuery.isError}
        error={nodesQuery.error ?? linksQuery.error}
        onRetry={() => {
          void nodesQuery.refetch()
          void linksQuery.refetch()
        }}
      />
    </div>
  )
}
