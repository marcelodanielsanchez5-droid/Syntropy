import { Check } from 'lucide-react'
import { SUBJECT_COLORS } from '@/lib/colors'
import { cn } from '@/lib/cn'

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  error?: string
}

export function ColorPicker({ value, onChange, className, error }: ColorPickerProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Color de la asignatura">
        {SUBJECT_COLORS.map((color) => {
          const selected = color.hex.toLowerCase() === value.toLowerCase()

          return (
            <button
              key={color.hex}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={color.name}
              title={color.name}
              onClick={() => onChange(color.hex)}
              className={cn(
                'relative inline-flex h-9 w-9 items-center justify-center rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-shell',
                selected
                  ? 'scale-110 border-white shadow-[0_0_0_3px_rgba(255,255,255,0.14)]'
                  : 'border-transparent hover:scale-105 hover:border-white/40',
              )}
              style={{ backgroundColor: color.hex }}
            >
              {selected ? (
                <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
              ) : null}
            </button>
          )
        })}
      </div>
      {error ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
