import { useEffect, useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  mobileSheetClassName,
} from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import {
  formatDayAndTime,
  isTimeValue,
  zonedDateKey,
  zonedTime,
  zonedToUtcIso,
} from '@/lib/datetime'
import { getErrorMessage } from '@/lib/errors'
import type { Reminder } from '@/types/database'
import { reminderTitle, validateReschedule } from './reminder-rules'

interface RescheduleReminderDialogProps {
  reminder: Reminder | null
  timeZone: string
  loading: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (sendAt: string) => Promise<void>
}

/** Cambia la hora de envío de un recordatorio, en la zona horaria del perfil. */
export function RescheduleReminderDialog({
  reminder,
  timeZone,
  loading,
  onOpenChange,
  onSubmit,
}: RescheduleReminderDialogProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (reminder) {
      setDate(zonedDateKey(reminder.send_at, timeZone))
      setTime(zonedTime(reminder.send_at, timeZone))
      setError(null)
    }
  }, [reminder, timeZone])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!reminder) {
      return
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isTimeValue(time)) {
      setError('Elegí una fecha y una hora.')
      return
    }

    const sendAt = zonedToUtcIso(date, time, timeZone)
    const problem = validateReschedule(new Date(sendAt), reminder, new Date())

    if (problem) {
      setError(problem)
      return
    }

    setError(null)

    try {
      await onSubmit(sendAt)
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'No pudimos cambiar la hora del aviso.'))
    }
  }

  return (
    <Dialog open={Boolean(reminder)} onOpenChange={onOpenChange}>
      <DialogContent className={mobileSheetClassName}>
        <DialogHeader>
          <DialogTitle>Cambiar la hora del aviso</DialogTitle>
          <DialogDescription>
            {reminder ? reminderTitle(reminder) : ''}
            {reminder?.event_at ? ` · ${formatDayAndTime(reminder.event_at, timeZone)}` : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
          {error ? <Alert variant="error">{error}</Alert> : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Día" htmlFor="reminder-date" required>
              <Input
                id="reminder-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </Field>
            <Field label="Hora" htmlFor="reminder-time" required>
              <Input
                id="reminder-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required
              />
            </Field>
          </div>

          <p className="text-xs leading-5 text-ink-muted">
            Si después cambiás la fecha del evento, el aviso se vuelve a calcular con la
            anticipación de tus preferencias.
          </p>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Guardar hora
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
