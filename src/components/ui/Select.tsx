import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-11 w-full appearance-none rounded-xl border border-line bg-sunken px-3.5 pr-10 text-sm text-ink transition focus-visible:border-rose-bright/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/25 disabled:cursor-not-allowed disabled:opacity-55',
          invalid && 'border-danger/60 focus-visible:border-danger focus-visible:ring-danger/25',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-disabled"
        aria-hidden="true"
      />
    </div>
  )
})
