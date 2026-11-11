import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'

type AlertVariant = 'error' | 'success' | 'warning' | 'info'

const styles: Record<AlertVariant, string> = {
  error: 'border-danger/25 bg-danger/10 text-[#ffc2ce]',
  success: 'border-success/25 bg-success/10 text-[#b8f3da]',
  warning: 'border-warning/25 bg-warning/10 text-[#ffe1a3]',
  info: 'border-info/25 bg-info/10 text-[#c8dbff]',
}

const icons: Record<AlertVariant, ReactNode> = {
  error: <AlertCircle className="h-4 w-4 shrink-0" />,
  success: <CheckCircle2 className="h-4 w-4 shrink-0" />,
  warning: <TriangleAlert className="h-4 w-4 shrink-0" />,
  info: <Info className="h-4 w-4 shrink-0" />,
}

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  className?: string
}

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-xl border p-3.5 text-sm leading-6', styles[variant], className)}
    >
      <span className="mt-0.5">{icons[variant]}</span>
      <div className="space-y-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  )
}
