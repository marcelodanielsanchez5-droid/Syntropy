import {
  CircleCheck,
  CircleDashed,
  CirclePause,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import type { TaskStatus } from '@/types/database'
import { TASK_STATUS_LABELS } from './task-utils'

export const TASK_STATUS_STYLES: Record<TaskStatus, { variant: BadgeVariant; icon: LucideIcon }> = {
  pending: { variant: 'info', icon: CircleDashed },
  waiting: { variant: 'warning', icon: CirclePause },
  done: { variant: 'success', icon: CircleCheck },
}

/** Estado de una tarea: siempre con ícono y texto, nunca solo color. */
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { variant, icon: Icon } = TASK_STATUS_STYLES[status]

  return (
    <Badge variant={variant}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {TASK_STATUS_LABELS[status]}
    </Badge>
  )
}

export function OverdueBadge() {
  return (
    <Badge variant="danger">
      <TriangleAlert className="h-3 w-3" aria-hidden="true" />
      Atrasada
    </Badge>
  )
}
