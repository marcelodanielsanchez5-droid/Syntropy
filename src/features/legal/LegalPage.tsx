import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/features/auth/auth-provider'
import { missingLegalVariables, readLegalContact } from './legal-config'
import { getLegalDocument } from './legal-documents'

export function LegalPage() {
  const { kind } = useParams<{ kind: string }>()
  const { session } = useAuth()
  const contact = useMemo(() => readLegalContact(), [])
  const document = useMemo(() => getLegalDocument(kind, contact), [kind, contact])
  const missing = missingLegalVariables(contact)
  const backTo = session ? '/configuracion#cuenta' : '/ingresar'

  useEffect(() => {
    if (document) {
      window.document.title = `${document.title} · Syntropy`
    }
  }, [document])

  if (!document) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ink">Documento no encontrado</h1>
          <Link to={backTo} className="mt-4 inline-block text-sm text-rose-bright">
            Volver
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-shell/70">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Logo to={session ? '/inicio' : '/ingresar'} size="sm" />
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose/20 bg-rose/10 text-rose-bright">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {document.title}
            </h1>
            <p className="text-xs text-ink-muted">Vigente desde el {document.effectiveLabel}</p>
          </div>
        </div>

        {missing.length > 0 ? (
          <Alert variant="warning" className="mb-6" title="Faltan los datos del responsable">
            Antes de publicar hay que completar {missing.join(', ')}. Mientras tanto, el texto
            muestra «[dato pendiente]».
          </Alert>
        ) : null}

        <section
          aria-labelledby="legal-summary"
          className="mb-6 rounded-2xl border border-rose/20 bg-rose/[0.05] p-5 sm:p-6"
        >
          <h2 id="legal-summary" className="text-sm font-bold text-ink">
            Lo esencial
          </h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-ink-secondary">
            {document.summary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-muted">
            Este resumen no reemplaza el texto completo.
          </p>
        </section>

        <nav aria-label="Secciones" className="mb-6">
          <ol className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {document.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-ink-muted transition hover:text-rose-bright"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="space-y-7 rounded-2xl border border-line bg-shell/70 p-6 sm:p-8">
          {document.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-6">
              <h2 className="text-base font-bold text-ink">{section.title}</h2>
              <div className="mt-2 space-y-3 text-sm leading-7 text-ink-secondary">
                {section.blocks.map((block, index) =>
                  Array.isArray(block) ? (
                    <ul key={index} className="list-disc space-y-1.5 pl-5">
                      {block.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={index}>{block}</p>
                  ),
                )}
              </div>
            </section>
          ))}
        </article>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-disabled">
          <span>Versión {document.version}</span>
          <div className="flex gap-4">
            <Link to="/legal/terminos" className="hover:text-ink-secondary">
              Términos de uso
            </Link>
            <Link to="/legal/privacidad" className="hover:text-ink-secondary">
              Política de privacidad
            </Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
