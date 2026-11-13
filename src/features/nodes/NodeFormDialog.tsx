import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  mobileSheetClassName,
} from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/cn'
import { getErrorMessage } from '@/lib/errors'
import type { KnowledgeNode, Subject } from '@/types/database'
import { NodeShape } from './NodeShape'
import { useNodeMutations } from './node-hooks'
import { LEVEL_NAMES, shapeName } from './node-rules'
import { newChildPosition } from './node-tree'

export const nodeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Poné un nombre para el tema.')
    .max(120, 'El nombre no puede superar los 120 caracteres.'),
  difficulty: z.number().int().min(1).max(10),
  mastery: z.number().int().min(1).max(10),
  description: z.string().trim().max(2000, 'La descripción no puede superar los 2000 caracteres.'),
  summary: z.string().trim().max(10000, 'El resumen no puede superar los 10000 caracteres.'),
})

export type NodeFormInput = z.infer<typeof nodeFormSchema>

const SCALE = Array.from({ length: 10 }, (_, index) => index + 1)

interface NodeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  subject: Subject | undefined
  /** Tema a editar, o `null` para crear uno nuevo bajo `parent`. */
  node: KnowledgeNode | null
  parent: KnowledgeNode | null
  /** Nivel del tema (1 = principal). */
  level: number
  siblings: KnowledgeNode[]
  onSaved?: (node: KnowledgeNode) => void
}

export function NodeFormDialog({
  open,
  onOpenChange,
  userId,
  subject,
  node,
  parent,
  level,
  siblings,
  onSaved,
}: NodeFormDialogProps) {
  const { create, update } = useNodeMutations(userId)
  const [error, setError] = useState<string | null>(null)
  const isEditing = node !== null
  const color = subject?.color_hex ?? '#98A2B3'

  const form = useForm<NodeFormInput>({
    resolver: zodResolver(nodeFormSchema),
    defaultValues: { name: '', difficulty: 5, mastery: 3, description: '', summary: '' },
  })
  const { errors } = form.formState
  const difficulty = useWatch({ control: form.control, name: 'difficulty' })
  const mastery = useWatch({ control: form.control, name: 'mastery' })

  useEffect(() => {
    if (!open) {
      return
    }

    setError(null)
    form.reset(
      node
        ? {
            name: node.name,
            difficulty: node.difficulty ?? 5,
            mastery: node.mastery ?? 3,
            description: node.description ?? '',
            summary: node.summary ?? '',
          }
        : { name: '', difficulty: 5, mastery: 3, description: '', summary: '' },
    )
    // Solo al abrir.
  }, [open, node])

  const saving = create.isPending || update.isPending

  async function onSubmit(values: NodeFormInput) {
    setError(null)
    const fields = {
      name: values.name,
      difficulty: values.difficulty,
      mastery: values.mastery,
      description: values.description || null,
      summary: values.summary || null,
    }

    try {
      if (node) {
        const saved = await update.mutateAsync({ nodeId: node.id, patch: fields })
        toast.success('Tema actualizado.')
        onSaved?.(saved)
      } else if (parent) {
        const position = newChildPosition(parent, siblings)
        const saved = await create.mutateAsync({
          ...fields,
          subject_id: parent.subject_id,
          parent_id: parent.id,
          position_x: position.x,
          position_y: position.y,
        })
        toast.success('Tema agregado al mapa.')
        onSaved?.(saved)
      }

      onOpenChange(false)
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'No pudimos guardar el tema. Intentá de nuevo.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-xl', mobileSheetClassName)}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar tema' : `Nuevo ${LEVEL_NAMES[level]?.toLowerCase() ?? 'tema'}`}
          </DialogTitle>
          <DialogDescription>
            {parent && !isEditing
              ? `Se agrega debajo de «${parent.name}», en ${subject?.name ?? 'la asignatura'}.`
              : 'La forma muestra la dificultad; la intensidad del color, cuánto lo dominás.'}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Field label="Nombre del tema" htmlFor="node-name" error={errors.name?.message} required>
            <Input
              id="node-name"
              placeholder="Funciones lineales"
              autoComplete="off"
              invalid={Boolean(errors.name)}
              {...form.register('name')}
            />
          </Field>

          <div className="flex items-center gap-4 rounded-xl border border-line bg-sunken/40 p-3">
            <NodeShape
              size={56}
              color={color}
              difficulty={difficulty}
              mastery={mastery}
              contour={null}
            />
            <p className="text-xs leading-5 text-ink-muted">
              <span className="font-semibold text-ink-secondary">{shapeName(difficulty)}</span> por
              la dificultad {difficulty}. El relleno es más intenso cuanto más lo dominás ({mastery}{' '}
              de 10). El contorno lo dan las notas vinculadas.
            </p>
          </div>

          <Controller
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-ink-secondary">
                  Dificultad{' '}
                  <span className="font-normal text-ink-disabled">
                    · qué tan difícil te resulta
                  </span>
                </legend>
                <div
                  className="grid grid-cols-5 gap-1.5 sm:grid-cols-10"
                  role="radiogroup"
                  aria-label="Dificultad"
                >
                  {SCALE.map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={field.value === value}
                      aria-label={`Dificultad ${value}: ${shapeName(value).toLowerCase()}`}
                      onClick={() => field.onChange(value)}
                      className={cn(
                        'flex flex-col items-center rounded-lg border py-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60',
                        field.value === value
                          ? 'border-rose/50 bg-rose/10 text-ink'
                          : 'border-line text-ink-muted hover:border-line-strong',
                      )}
                    >
                      <NodeShape
                        size={18}
                        color={color}
                        difficulty={value}
                        mastery={8}
                        contour={null}
                      />
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          />

          <Controller
            control={form.control}
            name="mastery"
            render={({ field }) => (
              <div className="space-y-2">
                <label
                  htmlFor="node-mastery"
                  className="flex justify-between text-sm font-medium text-ink-secondary"
                >
                  <span>
                    Dominio <span className="font-normal text-ink-disabled">· cuánto lo sabés</span>
                  </span>
                  <span className="tabular-nums text-ink">{field.value} / 10</span>
                </label>
                <input
                  id="node-mastery"
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={field.value}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                  className="w-full accent-rose"
                  aria-valuetext={`${field.value} de 10`}
                />
                <div className="flex justify-between text-[10px] text-ink-disabled">
                  <span>Recién empiezo</span>
                  <span>Lo domino</span>
                </div>
              </div>
            )}
          />

          <Field
            label="Descripción"
            htmlFor="node-description"
            error={errors.description?.message}
            hint="Opcional"
          >
            <Input
              id="node-description"
              placeholder="De qué se trata, en una línea"
              invalid={Boolean(errors.description)}
              {...form.register('description')}
            />
          </Field>

          <Field
            label="Resumen"
            htmlFor="node-summary"
            error={errors.summary?.message}
            hint="Opcional"
          >
            <Textarea
              id="node-summary"
              className="min-h-36 font-mono text-[13px]"
              placeholder={
                'Ideas clave del tema, como un mapa conceptual:\n- Definición\n  - Ejemplo\n- Relación con otros temas'
              }
              invalid={Boolean(errors.summary)}
              {...form.register('summary')}
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {isEditing ? 'Guardar cambios' : 'Agregar tema'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
