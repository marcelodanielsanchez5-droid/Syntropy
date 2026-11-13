import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileUp, Link2, Upload, X } from 'lucide-react'
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
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { NodeSelect } from '@/features/nodes/NodeSelect'
import { cn } from '@/lib/cn'
import { getErrorMessage } from '@/lib/errors'
import type { Source, SourceType, Subject } from '@/types/database'
import { SourceIcon } from './SourceIcon'
import { TaskSelect } from './TaskSelect'
import { useLibraryMutations } from './library-hooks'
import {
  ALLOWED_MIME_TYPES,
  LIBRARY_MAX_BYTES,
  SOURCE_TYPES,
  SOURCE_TYPE_LABELS,
  checkUpload,
  formatBytes,
  sourceTypeForMime,
  titleFromFileName,
} from './library-rules'
import {
  emptySourceFormValues,
  sourceFormSchema,
  sourceToFormValues,
  suggestedLinkType,
  toSourceFields,
  type SourceFormInput,
} from './source-form'

interface SourceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  /** `null` para agregar una fuente nueva. */
  source: Source | null
  subjects: Subject[]
  lockedSubjectId?: string
  usedBytes: number
  sourceCount: number
  onSaved?: (source: Source) => void
}

export function SourceFormDialog({
  open,
  onOpenChange,
  userId,
  source,
  subjects,
  lockedSubjectId,
  usedBytes,
  sourceCount,
  onSaved,
}: SourceFormDialogProps) {
  const { addFile, addLink, update } = useLibraryMutations(userId)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const typeTouched = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const isEditing = source !== null

  const form = useForm<SourceFormInput>({
    resolver: zodResolver(sourceFormSchema),
    defaultValues: emptySourceFormValues(),
  })
  const { errors } = form.formState
  const mode = useWatch({ control: form.control, name: 'mode' })
  const subjectId = useWatch({ control: form.control, name: 'subject_id' })

  useEffect(() => {
    if (!open) {
      return
    }

    setError(null)
    setFile(null)
    setFileError(null)
    typeTouched.current = Boolean(source)
    form.reset(
      source
        ? sourceToFormValues(source)
        : emptySourceFormValues({
            subjectId: lockedSubjectId ?? (subjects.length === 1 ? subjects[0].id : ''),
          }),
    )
    // Solo al abrir.
  }, [open, source])

  function pickFile(next: File | undefined) {
    if (!next) {
      return
    }

    const check = checkUpload(next, { usedBytes, sourceCount })

    if (!check.ok) {
      setFile(null)
      setFileError(check.message)
      return
    }

    setFile(next)
    setFileError(null)

    if (!form.getValues('title')) {
      form.setValue('title', titleFromFileName(next.name))
    }

    if (!typeTouched.current) {
      form.setValue('source_type', sourceTypeForMime(next.type))
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    pickFile(event.dataTransfer.files?.[0])
  }

  const saving = addFile.isPending || addLink.isPending || update.isPending

  async function onSubmit(values: SourceFormInput) {
    setError(null)

    try {
      let saved: Source

      if (source) {
        saved = await update.mutateAsync({
          sourceId: source.id,
          patch: {
            ...toSourceFields(values, source.title),
            ...(source.external_url ? { external_url: values.url } : {}),
          },
        })
        toast.success('Fuente actualizada.')
      } else if (values.mode === 'link') {
        saved = await addLink.mutateAsync({ ...toSourceFields(values), url: values.url })
        toast.success('Enlace agregado a la biblioteca.')
      } else {
        if (!file) {
          setFileError('Elegí un archivo para subir.')
          return
        }

        saved = await addFile.mutateAsync({
          fields: toSourceFields(values, titleFromFileName(file.name)),
          file,
        })
        toast.success('Archivo subido a la biblioteca.')
      }

      onOpenChange(false)
      onSaved?.(saved)
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'No pudimos guardar la fuente. Intentá de nuevo.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-xl', mobileSheetClassName)}>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar fuente' : 'Agregar fuente'}</DialogTitle>
          <DialogDescription>
            Libros, apuntes, enlaces, videos, imágenes o audios. Cada fuente pertenece a una
            asignatura; el tema y la tarea son opcionales.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {isEditing ? null : (
            <Controller
              control={form.control}
              name="mode"
              render={({ field }) => (
                <SegmentedControl
                  label="Qué querés agregar"
                  value={field.value}
                  onChange={(next: 'file' | 'link') => {
                    field.onChange(next)

                    if (!typeTouched.current) {
                      form.setValue(
                        'source_type',
                        next === 'link' ? 'link' : file ? sourceTypeForMime(file.type) : 'document',
                      )
                    }
                  }}
                  className="w-full"
                  options={[
                    {
                      value: 'file',
                      label: (
                        <>
                          <FileUp className="h-4 w-4" aria-hidden="true" />
                          Archivo
                        </>
                      ),
                    },
                    {
                      value: 'link',
                      label: (
                        <>
                          <Link2 className="h-4 w-4" aria-hidden="true" />
                          Enlace
                        </>
                      ),
                    },
                  ]}
                />
              )}
            />
          )}

          {mode === 'file' && !isEditing ? (
            <div className="space-y-1.5">
              <div
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition',
                  dragging ? 'border-rose-bright bg-rose/10' : 'border-line-strong bg-sunken/40',
                  fileError && 'border-danger/60',
                )}
              >
                {file ? (
                  <div className="flex w-full items-center gap-3 text-left">
                    <SourceIcon
                      type={sourceTypeForMime(file.type)}
                      className="h-8 w-8 shrink-0 text-rose-bright"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
                      <p className="text-xs text-ink-muted">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition hover:bg-white/5 hover:text-ink"
                      aria-label="Quitar el archivo elegido"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-ink-disabled" aria-hidden="true" />
                    <p className="text-sm text-ink-secondary">Arrastrá un archivo acá o</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => fileInput.current?.click()}
                    >
                      Elegir archivo
                    </Button>
                    <p className="text-[11px] text-ink-disabled">
                      PDF, Word, PowerPoint, texto, imagen, audio o video MP4 · hasta 25 MB · te
                      quedan {formatBytes(Math.max(0, LIBRARY_MAX_BYTES - usedBytes))}
                    </p>
                  </>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Archivo"
                  accept={ALLOWED_MIME_TYPES.join(',')}
                  onChange={(event) => {
                    pickFile(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </div>
              {fileError ? (
                <p className="text-xs font-medium text-danger" role="alert">
                  {fileError}
                </p>
              ) : null}
            </div>
          ) : null}

          {mode === 'link' ? (
            <Field label="Enlace" htmlFor="source-url" error={errors.url?.message} required>
              <Input
                id="source-url"
                inputMode="url"
                placeholder="https://…"
                invalid={Boolean(errors.url)}
                {...form.register('url', {
                  onChange: (event) =>
                    form.setValue(
                      'source_type',
                      suggestedLinkType(
                        event.target.value,
                        form.getValues('source_type'),
                        typeTouched.current,
                      ),
                    ),
                })}
              />
            </Field>
          ) : null}

          {isEditing && source?.storage_path ? (
            <p className="flex items-center gap-2 rounded-lg border border-line bg-sunken/40 px-3 py-2 text-xs text-ink-muted">
              <SourceIcon type={source.source_type} className="h-4 w-4" />
              El archivo no se cambia: para reemplazarlo, eliminá esta fuente y subí otra.
              {source.size_bytes ? ` (${formatBytes(source.size_bytes)})` : ''}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
            <Field
              label="Título"
              htmlFor="source-title"
              error={errors.title?.message}
              required={mode === 'link'}
              hint={mode === 'file' && !isEditing ? 'Si lo dejás vacío, el del archivo' : undefined}
            >
              <Input
                id="source-title"
                placeholder="Manual de Física, capítulo 3"
                invalid={Boolean(errors.title)}
                {...form.register('title')}
              />
            </Field>
            <Field label="Tipo" htmlFor="source-type">
              <Select
                id="source-type"
                {...form.register('source_type', {
                  onChange: () => {
                    typeTouched.current = true
                  },
                })}
              >
                {SOURCE_TYPES.map((type: SourceType) => (
                  <option key={type} value={type}>
                    {SOURCE_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {lockedSubjectId ? null : (
            <Field
              label="Asignatura"
              htmlFor="source-subject"
              error={errors.subject_id?.message}
              required
            >
              <Select
                id="source-subject"
                invalid={Boolean(errors.subject_id)}
                {...form.register('subject_id', {
                  onChange: () => {
                    form.setValue('node_id', '')
                    form.setValue('task_id', '')
                  },
                })}
              >
                <option value="">Elegí una asignatura</option>
                {subjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tema" htmlFor="source-node" hint="Opcional">
              <NodeSelect
                id="source-node"
                userId={userId}
                subjectId={subjectId}
                {...form.register('node_id')}
              />
            </Field>
            <Field label="Se usa en la tarea" htmlFor="source-task" hint="Opcional">
              <TaskSelect
                id="source-task"
                userId={userId}
                subjectId={subjectId}
                {...form.register('task_id')}
              />
            </Field>
          </div>

          <Field
            label="Descripción"
            htmlFor="source-description"
            error={errors.description?.message}
            hint="Opcional"
          >
            <Textarea
              id="source-description"
              className="min-h-20"
              placeholder="Qué tiene, qué páginas o minutos sirven…"
              invalid={Boolean(errors.description)}
              {...form.register('description')}
            />
          </Field>

          <Field
            label="Etiquetas"
            htmlFor="source-tags"
            error={errors.tagsText?.message}
            hint="Separadas por comas"
          >
            <Input
              id="source-tags"
              placeholder="parcial 1, resumen, ejercicios"
              {...form.register('tagsText')}
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
              {isEditing ? 'Guardar cambios' : mode === 'file' ? 'Subir archivo' : 'Agregar enlace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
