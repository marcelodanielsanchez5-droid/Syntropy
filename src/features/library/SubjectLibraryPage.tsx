import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import { buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/auth-provider'
import { useYears } from '@/features/academic-years/year-hooks'
import { useNodes } from '@/features/nodes/node-hooks'
import { SubjectPageHeader } from '@/features/subjects/SubjectPageHeader'
import { useSubject } from '@/features/subjects/subject-hooks'
import { useTasks } from '@/features/tasks/task-hooks'
import { LibraryView } from './LibraryView'
import { useLibrarySources } from './library-hooks'

/** Fuentes de una asignatura, dentro de sus pestañas. */
export function SubjectLibraryPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const subjectQuery = useSubject(user?.id, id)
  const yearsQuery = useYears(user?.id)
  const subject = subjectQuery.data
  const subjects = useMemo(() => (subject ? [subject] : []), [subject])
  const subjectIds = useMemo(() => subjects.map((item) => item.id), [subjects])
  const subjectsById = useMemo(() => new Map(subjects.map((item) => [item.id, item])), [subjects])
  const library = useLibrarySources(user?.id)
  const nodesQuery = useNodes(user?.id, subjectIds)
  const tasksQuery = useTasks(user?.id, subjectIds)
  const sources = useMemo(
    () => library.sources.filter((source) => source.subject_id === subject?.id),
    [library.sources, subject?.id],
  )
  const year = yearsQuery.data?.find((item) => item.id === subject?.academic_year_id)

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
      <SubjectPageHeader subject={subject} year={year} active="biblioteca" />
      <LibraryView
        userId={user.id}
        subjects={subjects}
        subjectsById={subjectsById}
        lockedSubject={subject}
        sources={sources}
        usedBytes={library.usedBytes}
        sourceCount={library.sourceCount}
        nodes={nodesQuery.data ?? []}
        tasks={tasksQuery.data ?? []}
        isLoading={library.isLoading}
        isError={library.isError}
        error={library.error}
        onRetry={() => void library.refetch()}
      />
    </div>
  )
}
