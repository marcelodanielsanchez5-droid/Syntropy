import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, FolderPlus } from 'lucide-react'
import { buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { CalendarWorkspace } from './CalendarWorkspace'
import { useActiveYearAgenda, useProfileTimeZone } from './use-agenda'

/** Calendario general: fechas límite y exámenes de todas las asignaturas del año activo. */
export function CalendarPage() {
  const timeZone = useProfileTimeZone()
  const agenda = useActiveYearAgenda()
  const [subjectFilter, setSubjectFilter] = useState('all')
  const filterIsValid =
    subjectFilter === 'all' || agenda.subjects.some((subject) => subject.id === subjectFilter)
  const effectiveFilter = filterIsValid ? subjectFilter : 'all'

  if (agenda.isLoading && !agenda.activeYear) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }

  if (!agenda.activeYear) {
    return (
      <EmptyState
        icon={<CalendarRange className="h-5 w-5" />}
        title="Primero configurá tu año de curso"
        description="El calendario muestra las tareas y exámenes de las asignaturas del año activo."
        action={
          <Link to="/configuracion?nuevo=anio" className={buttonStyles({ size: 'md' })}>
            Crear año de curso
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={agenda.activeYear.name}
        title="Calendario general"
        description="Fechas límite y exámenes de todas tus asignaturas, cada uno con el color de su materia."
        actions={
          agenda.subjects.length > 1 ? (
            <label className="w-full sm:w-60">
              <span className="sr-only">Filtrar por asignatura</span>
              <Select
                value={effectiveFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
                className="h-10"
              >
                <option value="all">Todas las asignaturas</option>
                {agenda.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </label>
          ) : undefined
        }
      />

      {!agenda.isLoading && agenda.subjects.length === 0 ? (
        <EmptyState
          icon={<FolderPlus className="h-5 w-5" />}
          title="Todavía no tenés asignaturas"
          description="Las tareas y los exámenes pertenecen a una asignatura. Creá la primera para empezar a cargar fechas."
          action={
            <Link to="/asignaturas/nueva" className={buttonStyles({ size: 'md' })}>
              Agregar asignatura
            </Link>
          }
        />
      ) : null}

      {agenda.userId ? (
        <CalendarWorkspace
          mode="general"
          userId={agenda.userId}
          timeZone={timeZone}
          subjects={agenda.subjects}
          subjectsById={agenda.subjectsById}
          tasks={agenda.tasks}
          exams={agenda.exams}
          sessions={agenda.sessions}
          subjectFilter={effectiveFilter}
          isLoading={agenda.isLoading}
          isError={agenda.isError}
          error={agenda.error}
          onRetry={agenda.refetch}
        />
      ) : null}
    </div>
  )
}
