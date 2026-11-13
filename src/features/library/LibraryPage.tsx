import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, FolderPlus } from 'lucide-react'
import { buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useActiveYearScope } from '@/features/calendar/use-agenda'
import { useNodes } from '@/features/nodes/node-hooks'
import { useTasks } from '@/features/tasks/task-hooks'
import { LibraryView } from './LibraryView'
import { useLibrarySources } from './library-hooks'

/** Biblioteca del año activo: fuentes de todas sus asignaturas. */
export function LibraryPage() {
  const scope = useActiveYearScope()
  const subjectIds = useMemo(
    () => scope.subjects.map((subject) => subject.id).sort(),
    [scope.subjects],
  )
  const subjectsById = useMemo(
    () => new Map(scope.subjects.map((subject) => [subject.id, subject])),
    [scope.subjects],
  )
  const library = useLibrarySources(scope.userId)
  const nodesQuery = useNodes(scope.userId, subjectIds)
  const tasksQuery = useTasks(scope.userId, subjectIds)
  const sources = useMemo(
    () => library.sources.filter((source) => subjectsById.has(source.subject_id)),
    [library.sources, subjectsById],
  )

  if (scope.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }

  if (!scope.activeYear || !scope.userId) {
    return (
      <EmptyState
        icon={<CalendarRange className="h-5 w-5" />}
        title="Primero configurá tu año de curso"
        description="La biblioteca muestra las fuentes de las asignaturas del año activo."
        action={
          <Link to="/configuracion?nuevo=anio" className={buttonStyles({ size: 'md' })}>
            Crear año de curso
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={scope.activeYear.name}
        title="Biblioteca"
        description="Libros, apuntes, enlaces, videos, imágenes y audios, ordenados por materia, tema y tarea."
      />

      {scope.subjects.length === 0 ? (
        <EmptyState
          icon={<FolderPlus className="h-5 w-5" />}
          title="Todavía no tenés asignaturas"
          description="Cada fuente pertenece a una asignatura. Creá la primera para empezar tu biblioteca."
          action={
            <Link to="/asignaturas/nueva" className={buttonStyles({ size: 'md' })}>
              Agregar asignatura
            </Link>
          }
        />
      ) : (
        <LibraryView
          userId={scope.userId}
          subjects={scope.subjects}
          subjectsById={subjectsById}
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
      )}
    </div>
  )
}
