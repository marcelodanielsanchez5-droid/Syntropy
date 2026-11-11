import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, Construction } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { buttonStyles } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'

interface ComingSoonPageProps {
  title: string
  phase: string
  description: string
  icon: LucideIcon
}

export function ComingSoonPage({ title, phase, description, icon: Icon }: ComingSoonPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Disponible en ${phase}`}
        title={title}
        description={description}
        actions={
          <Link to="/inicio" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio
          </Link>
        }
      />

      <Card className="page-grid overflow-hidden">
        <CardContent className="flex flex-col items-center px-6 py-16 text-center sm:py-20">
          <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-rose/25 bg-rose/10 text-rose-bright shadow-glow">
            <Icon className="h-8 w-8" />
          </span>
          <Badge variant="purple" className="mb-3">
            <Construction className="h-3 w-3" />
            {phase}
          </Badge>
          <h2 className="max-w-lg text-2xl font-extrabold tracking-tight text-ink">
            Este módulo todavía no está activo
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
            La base de datos y la navegación ya están preparadas. La interfaz se implementa en la{' '}
            {phase.toLowerCase()} para no mostrar funciones a medio terminar.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/inicio" className={buttonStyles({ size: 'md' })}>
              Ir a mis asignaturas
            </Link>
            <Link to="/configuracion" className={buttonStyles({ variant: 'secondary', size: 'md' })}>
              Configuración
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
