import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Link2,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { getErrorMessage } from '@/lib/errors'
import type { KnowledgeNode, Source, SourceType } from '@/types/database'
import { useNodeSources, useSourceMutations } from './node-hooks'
import { useLibrarySources } from '@/features/library/library-hooks'
import { checkUpload } from '@/features/library/library-rules'
import { ATTACHMENT_MIME_TYPES, openSourceUrl } from './node-service'

const SOURCE_ICONS: Record<SourceType, LucideIcon> = {
  document: FileText,
  book: FileText,
  link: Link2,
  video: FileVideo,
  image: FileImage,
  audio: FileAudio,
  other: Paperclip,
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

/** Documentos, fotos, audios y enlaces del tema (Fase 5B). */
export function NodeAttachments({ userId, node }: { userId: string; node: KnowledgeNode }) {
  const sourcesQuery = useNodeSources(userId, node.id)
  const library = useLibrarySources(userId)
  const { addLink, addFile, remove } = useSourceMutations(userId)
  const fileInput = useRef<HTMLInputElement>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const sources = sourcesQuery.data ?? []

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    // Mismos límites que la biblioteca: tipo, 25 MB por archivo y espacio por usuario.
    const check = checkUpload(file, { usedBytes: library.usedBytes, sourceCount: library.sourceCount })

    if (!check.ok) {
      toast.error(check.message)
      return
    }

    try {
      await addFile.mutateAsync({ node, file })
      toast.success('Archivo adjuntado.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'No pudimos subir el archivo.'))
    }
  }

  async function handleLink(event: FormEvent) {
    event.preventDefault()
    const cleanUrl = url.trim()

    if (!isHttpUrl(cleanUrl)) {
      setLinkError('Pegá un enlace completo, que empiece con https://')
      return
    }

    try {
      await addLink.mutateAsync({
        node,
        url: cleanUrl,
        title: title.trim().slice(0, 200) || new URL(cleanUrl).hostname,
      })
      setTitle('')
      setUrl('')
      setLinkError(null)
      setLinkOpen(false)
      toast.success('Enlace agregado.')
    } catch (error) {
      setLinkError(getErrorMessage(error, 'No pudimos guardar el enlace.'))
    }
  }

  async function handleOpen(source: Source) {
    // La ventana se abre antes de pedir el enlace firmado para que el navegador no la bloquee.
    // Con `noopener` window.open devuelve null, así que el vínculo se corta a mano.
    const target = window.open('', '_blank')

    if (target) {
      target.opener = null
    }

    try {
      const href = await openSourceUrl(source)

      if (target) {
        target.location.href = href
      } else {
        window.open(href, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      target?.close()
      toast.error(getErrorMessage(error, 'No pudimos abrir el archivo.'))
    }
  }

  async function handleRemove(source: Source) {
    try {
      await remove.mutateAsync(source)
      toast.success(source.storage_path ? 'Archivo eliminado.' : 'Enlace quitado.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'No pudimos quitar el adjunto.'))
    }
  }

  return (
    <section aria-labelledby="node-attachments-title">
      <div className="flex items-center justify-between gap-2">
        <h3
          id="node-attachments-title"
          className="flex items-center gap-2 text-sm font-bold text-ink"
        >
          <Paperclip className="h-4 w-4 text-rose-bright" aria-hidden="true" />
          Adjuntos
        </h3>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            onClick={() => setLinkOpen((value) => !value)}
            aria-expanded={linkOpen}
            leftIcon={<Link2 className="h-3.5 w-3.5" />}
          >
            Enlace
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            loading={addFile.isPending}
            onClick={() => fileInput.current?.click()}
            leftIcon={<Upload className="h-3.5 w-3.5" />}
          >
            Archivo
          </Button>
          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            accept={ATTACHMENT_MIME_TYPES.join(',')}
            onChange={(event) => void handleFile(event)}
          />
        </div>
      </div>

      {linkOpen ? (
        <form
          onSubmit={(event) => void handleLink(event)}
          className="mt-2 space-y-2 rounded-xl border border-line bg-sunken/40 p-3"
          noValidate
        >
          <Input
            aria-label="Dirección del enlace"
            placeholder="https://…"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            invalid={Boolean(linkError)}
          />
          <Input
            aria-label="Nombre del enlace"
            placeholder="Nombre (opcional)"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          {linkError ? (
            <p className="text-xs font-medium text-danger" role="alert">
              {linkError}
            </p>
          ) : null}
          <Button
            type="submit"
            size="sm"
            loading={addLink.isPending}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Agregar enlace
          </Button>
        </form>
      ) : null}

      {sourcesQuery.isLoading ? (
        <div className="flex justify-center py-3">
          <Spinner />
        </div>
      ) : sources.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {sources.map((source) => {
            const Icon = SOURCE_ICONS[source.source_type]

            return (
              <li
                key={source.id}
                className="flex items-center gap-2 rounded-lg border border-line bg-surface/30 px-2.5 py-2"
              >
                <Icon className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => void handleOpen(source)}
                  className="min-w-0 flex-1 truncate text-left text-sm text-ink-secondary hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60"
                >
                  {source.title}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemove(source)}
                  disabled={remove.isPending}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-disabled transition hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-bright/60"
                  aria-label={`Quitar ${source.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-2 text-xs leading-5 text-ink-muted">
          Sumá apuntes, fotos del pizarrón, audios o enlaces. Se guardan en privado y después
          aparecen en la biblioteca.
        </p>
      )}
    </section>
  )
}
