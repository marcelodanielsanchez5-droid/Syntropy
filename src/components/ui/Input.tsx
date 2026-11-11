import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  leftIcon?: ReactNode
  rightSlot?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, leftIcon, rightSlot, ...props },
  ref,
) {
  return (
    <div className="relative">
      {leftIcon ? (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-disabled">
          {leftIcon}
        </span>
      ) : null}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-11 w-full rounded-xl border border-line bg-sunken px-3.5 text-sm text-ink placeholder:text-ink-disabled transition focus-visible:border-rose-bright/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/25 disabled:cursor-not-allowed disabled:opacity-55',
          leftIcon && 'pl-10',
          rightSlot && 'pr-11',
          invalid && 'border-danger/60 focus-visible:border-danger focus-visible:ring-danger/25',
          className,
        )}
        {...props}
      />
      {rightSlot ? (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{rightSlot}</span>
      ) : null}
    </div>
  )
})
