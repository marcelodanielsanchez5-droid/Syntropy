import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'min-h-28 w-full resize-y rounded-xl border border-line bg-sunken px-3.5 py-3 text-sm leading-6 text-ink placeholder:text-ink-disabled transition focus-visible:border-rose-bright/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/25 disabled:cursor-not-allowed disabled:opacity-55',
        invalid && 'border-danger/60 focus-visible:border-danger focus-visible:ring-danger/25',
        className,
      )}
      {...props}
    />
  )
})
