import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type BadgeVariant =
  | 'default'
  | 'rose'
  | 'purple'
  | 'success'
  | 'warning'
  | 'info'
  | 'danger'
  | 'outline'
  | 'muted'

const variants: Record<BadgeVariant, string> = {
  danger: 'border-danger/25 bg-danger/10 text-danger',
  default: 'border-line bg-white/5 text-ink-secondary',
  rose: 'border-rose/25 bg-rose/10 text-rose-soft',
  purple: 'border-purple/30 bg-purple/15 text-[#d8b4fe]',
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/25 bg-warning/10 text-warning',
  info: 'border-info/25 bg-info/10 text-info',
  outline: 'border-line-strong bg-transparent text-ink-secondary',
  muted: 'border-transparent bg-white/5 text-ink-disabled',
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
