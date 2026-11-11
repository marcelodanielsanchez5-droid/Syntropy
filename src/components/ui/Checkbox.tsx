import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  description?: ReactNode
  error?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, description, error, id, ...props },
  ref,
) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line bg-sunken accent-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          aria-invalid={Boolean(error) || undefined}
          {...props}
        />
        <div className="space-y-0.5">
          <label htmlFor={id} className="block cursor-pointer text-sm leading-5 text-ink-secondary">
            {label}
          </label>
          {description ? <p className="text-xs leading-5 text-ink-disabled">{description}</p> : null}
        </div>
      </div>
      {error ? (
        <p className="pl-7 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})
