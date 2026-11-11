import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-rose text-white shadow-[0_12px_34px_-16px_rgba(224,20,98,0.95)] hover:bg-rose-deep active:bg-[#a90f4b]',
    secondary: 'border border-line bg-white/5 text-ink hover:bg-white/10 active:bg-white/[0.14]',
    ghost: 'text-ink-secondary hover:bg-white/5 hover:text-ink',
    outline: 'border border-line-strong bg-transparent text-ink hover:bg-white/5',
    danger: 'bg-danger text-[#2b0a12] hover:bg-[#ff8aa2] active:bg-[#f45a7b]',
  }

  const sizes: Record<ButtonSize, string> = {
    sm: 'h-9 gap-1.5 rounded-lg px-3 text-sm',
    md: 'h-11 gap-2 rounded-xl px-4 text-sm',
    lg: 'h-12 gap-2.5 rounded-xl px-6 text-base',
    icon: 'h-10 w-10 rounded-xl',
  }

  return cn(
    'inline-flex select-none items-center justify-center font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-45',
    variants[variant],
    sizes[size],
    className,
  )
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonStyles({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})
