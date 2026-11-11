import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/features/auth/auth-provider'
import { getErrorMessage } from '@/lib/errors'

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { deleteAccount, profile } = useAuth()
  const navigate = useNavigate()
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setConfirmation('')
      setError(null)
    }
  }, [open])

  async function handleDelete() {
    if (confirmation.trim().toUpperCase() !== 'ELIMINAR') {
      setError('Escribí ELIMINAR para confirmar.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await deleteAccount()
      onOpenChange(false)
      navigate('/ingresar', { replace: true })
    } catch (nextError) {
      setError(
        getErrorMessage(
          nextError,
          'No pudimos eliminar la cuenta. Verificá que la migración 002 esté aplicada.',
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar cuenta</DialogTitle>
          <DialogDescription>
            Esta acción es definitiva. Se eliminan el perfil{' '}
            <span className="font-semibold text-ink-secondary">@{profile?.username}</span>, los años
            de curso, las asignaturas y todos los datos asociados.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <Alert variant="warning" className="mb-4">
          No se puede deshacer. Si solo querés dejar de usar la app, podés cerrar sesión sin borrar
          la cuenta.
        </Alert>

        <Field label="Escribí ELIMINAR para confirmar" htmlFor="delete-account-confirmation">
          <Input
            id="delete-account-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="ELIMINAR"
            autoComplete="off"
            invalid={Boolean(error)}
          />
        </Field>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => void handleDelete()} loading={loading}>
            Eliminar mi cuenta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
