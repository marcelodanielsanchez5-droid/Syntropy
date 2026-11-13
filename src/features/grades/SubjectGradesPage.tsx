import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FolderOpen, SlidersHorizontal } from 'lucide-react'
import { Button, buttonStyles } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/auth-provider'
import { useYears } from '@/features/academic-years/year-hooks'
import { SubjectPageHeader } from '@/features/subjects/SubjectPageHeader'
import { useSubject } from '@/features/subjects/subject-hooks'
import { GradingSettingsDialog } from './GradingSettingsDialog'
import { SubjectGradesView } from './SubjectGradesView'
import { useAssessments, useGradingSettings } from './grade-hooks'

/** Calificaciones de una asignatura, dentro de sus pestañas. */
export function SubjectGradesPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const subjectQuery = useSubject(user?.id, id)
  const yearsQuery = useYears(user?.id)
  const grading = useGradingSettings(user?.id)
  const subject = subjectQuery.data
  const subjectIds = useMemo(() => (subject ? [subject.id] : []), [subject])
  const assessmentsQuery = useAssessments(user?.id, subjectIds)
  const [scaleOpen, setScaleOpen] = useState(false)
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
      <SubjectPageHeader
        subject={subject}
        year={year}
        active="calificaciones"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setScaleOpen(true)}
            leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          >
            Escala
          </Button>
        }
      />

      {assessmentsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <SubjectGradesView
          userId={user.id}
          subject={subject}
          assessments={assessmentsQuery.data ?? []}
          rules={grading.rules}
        />
      )}

      <GradingSettingsDialog
        open={scaleOpen}
        onOpenChange={setScaleOpen}
        userId={user.id}
        rules={grading.rules}
        hasAssessments={(assessmentsQuery.data?.length ?? 0) > 0}
      />
    </div>
  )
}
