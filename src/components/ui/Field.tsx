import type { ReactNode } from 'react'
import { Label } from './Label'
import { cn } from '@/lib/cn'

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, error, hint, required, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span className="ml-1 text-rose-bright">*</span> : null}
        </Label>
        {hint && !error ? <span className="text-xs text-ink-disabled">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
