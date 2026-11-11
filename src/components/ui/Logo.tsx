import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

interface LogoProps {
  to?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  subtitle?: ReactNode
  className?: string
}

const markSizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
}

const textSizes = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-3xl',
}

export function Logo({ to, size = 'md', showText = true, subtitle, className }: LogoProps) {
  const content = (
    <>
      <img src="/brand/logo-mark.svg" alt="" className={cn('shrink-0', markSizes[size])} />
      {showText ? (
        <span className="min-w-0">
          <span className={cn('block font-extrabold leading-none tracking-tight', textSizes[size])}>
            <span className="text-ink">Syn</span>
            <span className="brand-text">tropy</span>
          </span>
          {subtitle ? (
            <span className="mt-1 block text-[11px] font-medium tracking-wide text-ink-muted">
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  )

  const classes = cn('inline-flex items-center gap-3', className)

  if (to) {
    return (
      <Link to={to} className={classes} aria-label="Syntropy — Inicio">
        {content}
      </Link>
    )
  }

  return <div className={classes}>{content}</div>
}
