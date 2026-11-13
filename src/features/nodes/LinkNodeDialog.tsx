import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
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
import { Select } from '@/components/ui/Select'
import { getErrorMessage } from '@/lib/errors'
import type { KnowledgeNode, NodeLink, Subject } from '@/types/database'
import { useNodeMutations } from './node-hooks'
import { flattenTree, hasLink } from './node-tree'

interface LinkNodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  from: KnowledgeNode | null
  /** Temas que se pueden elegir: todos los del año, de cualquier asignatura. */
  nodes: KnowledgeNode[]
  links: NodeLink[]
  subjects: Subject[]
}

/** Conecta dos temas, incluso de asignaturas distintas. No crea jerarquía. */
export function LinkNodeDialog({
  open,
  onOpenChange,
  userId,
  from,
  nodes,
  links,
  subjects,
}: LinkNodeDialogProps) {
  const { link } = useNodeMutations(userId)
  const [targetId, setTargetId] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTargetId('')
      setLabel('')
      setError(null)
    }
  }, [open])

  const groups = useMemo(
    () =>
      subjects
        .map((subject) => ({
          subject,
          options: flattenTree(nodes.filter((node) => node.subject_id === subject.id)).filter(
            ({ node }) =>
              !node.is_root && node.id !== from?.id && !(from && hasLink(links, from.id, node.id)),
          ),
        }))
        .filter((group) => group.options.length > 0),
    [subjects, nodes, links, from],
  )

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!from || !targetId) {
      setError('Elegí con qué tema conectarlo.')
      return
    }

    try {
      await link.mutateAsync({
        source_node_id: from.id,
        target_node_id: targetId,
        label: label.trim().slice(0, 80) || null,
      })
      toast.success('Temas conectados.')
      onOpenChange(false)
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'No pudimos conectar los temas.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar «{from?.name}»</DialogTitle>
          <DialogDescription>
            Una conexión une temas relacionados, también de otras materias. Se ve como línea
            punteada.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        {groups.length === 0 ? (
          <Alert variant="info">
            No hay otros temas para conectar. Agregá temas en otra parte del mapa.
          </Alert>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
            <Field label="Tema" htmlFor="link-target" required>
              <Select
                id="link-target"
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
              >
                <option value="">Elegí un tema</option>
                {groups.map(({ subject, options }) => (
                  <optgroup key={subject.id} label={subject.name}>
                    {options.map(({ node, level }) => (
                      <option key={node.id} value={node.id}>
                        {`${'  '.repeat(Math.max(0, level - 1))}${node.name}`}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="Relación" htmlFor="link-label" hint="Opcional">
              <Input
                id="link-label"
                maxLength={80}
                placeholder="se usa en, es la base de…"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={link.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={link.isPending}>
                Conectar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
