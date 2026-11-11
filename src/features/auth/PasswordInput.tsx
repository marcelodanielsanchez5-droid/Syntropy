import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { Input, type InputProps } from '@/components/ui/Input'

export function PasswordInput(props: Omit<InputProps, 'type' | 'rightSlot'>) {
  const [visible, setVisible] = useState(false)

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      leftIcon={<LockKeyhole className="h-4 w-4" />}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-white/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/40"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  )
}
