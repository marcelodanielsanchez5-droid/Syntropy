import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, FolderPlus } from 'lucide-react'
import { buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useActiveYearScope, useAgenda, useProfileTimeZone } from '@/features/calendar/use-agenda'
import { useAssessments } from '@/features/grades/grade-hooks'
import { KnowledgeWorkspace } from './KnowledgeWorkspace'
import { useNodeLinks, useNodes } from './node-hooks'

/** Plano del año: los árboles de todas las asignaturas, con conexiones entre materias. */
export function NodesPage() {
  const timeZone = useProfileTimeZone()
  const scope = useActiveYearScope()
  const subjectIds = useMemo(
    () => scope.subjects.map((subject) => subject.id).sort(),
    [scope.subjects],
  )
  const subjectsById = useMemo(
    () => new Map(scope.subjects.map((subject) => [subject.id, subject])),
    [scope.subjects],
  )
  const nodesQuery = useNodes(scope.userId, subjectIds)
  const linksQuery = useNodeLinks(scope.userId)
  const assessmentsQuery = useAssessments(scope.userId, subjectIds)
  const agenda = useAgenda(scope.userId, scope.subjects)
  const nodes = nodesQuery.data ?? []

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
        description="Hay un mapa de temas por año: reúne las asignaturas del año activo."
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
        title="Nodos de conocimiento"
        description="Todos los temas del año en un mismo plano. La forma es la dificultad, el relleno tu dominio y el contorno tus notas."
      />

      {scope.subjects.length === 0 ? (
        <EmptyState
          icon={<FolderPlus className="h-5 w-5" />}
          title="Todavía no tenés asignaturas"
          description="Cada asignatura tiene su árbol de temas. Creá la primera para empezar tu mapa."
          action={
            <Link to="/asignaturas/nueva" className={buttonStyles({ size: 'md' })}>
              Agregar asignatura
            </Link>
          }
        />
      ) : (
        <KnowledgeWorkspace
          mode="general"
          userId={scope.userId}
          timeZone={timeZone}
          subjects={scope.subjects}
          subjectsById={subjectsById}
          nodes={nodes}
          yearNodes={nodes}
          yearSubjects={scope.subjects}
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
      )}
    </div>
  )
}
