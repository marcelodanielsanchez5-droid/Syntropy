import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, FileText, LogOut, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/features/auth/auth-provider'
import { acceptLegalDocuments } from '@/features/auth/auth-service'
import { DeleteAccountDialog } from '@/features/settings/DeleteAccountDialog'
import { exportMyData } from '@/features/settings/data-export'
import { getErrorMessage } from '@/lib/errors'
import { readLegalContact } from './legal-config'
import { privacyPolicy, termsOfUse } from './legal-documents'
import { LEGAL_EFFECTIVE_LABEL, type LegalAcceptanceState } from './legal-versions'

/**
 * Se muestra al ingresar cuando el perfil no aceptó la versión vigente de los
 * términos o de la privacidad (o no confirmó la edad mínima). Sin aceptar no
 * se puede usar la app, pero sí descargar los datos o eliminar la cuenta.
 */
export function LegalUpdateScreen({ pending }: { pending: LegalAcceptanceState }) {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const contact = useMemo(() => readLegalContact(), [])
  const documents = useMemo(() => [termsOfUse(contact), privacyPolicy(contact)], [contact])
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [age, setAge] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Aceptó alguna versión anterior: es una actualización, no la primera vez.
  const isUpdate = Boolean(profile?.terms_version || profile?.privacy_version)
  const changed = documents.filter((document) =>
    document.kind === 'terminos' ? pending.terms : pending.privacy,
  )
  const ready = terms && privacy && (!pending.age || age)

  async function handleAccept() {
    if (!ready) {
      setError('Marcá todas las casillas para continuar.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await acceptLegalDocuments(pending.age ? age : false)
      await refreshProfile()
      toast.success('Gracias. Ya podés seguir usando Syntropy.')
    } catch (acceptError) {
      setError(getErrorMessage(acceptError, 'No pudimos guardar tu aceptación.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleExport() {
    if (!user) {
      return
    }

    setExporting(true)

    try {
      const rows = await exportMyData(user, profile)
      toast.success(`Descargaste tus datos (${rows} registros).`)
    } catch (exportError) {
      toast.error(getErrorMessage(exportError, 'No pudimos preparar la descarga.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas px-5 py-10 sm:py-14">
      <main className="mx-auto w-full max-w-xl space-y-6">
        <Logo size="sm" />

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            {isUpdate
              ? 'Actualizamos los términos y la privacidad'
              : 'Antes de seguir, aceptá los términos'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            {isUpdate
              ? `Hay una versión nueva, vigente desde el ${LEGAL_EFFECTIVE_LABEL}. Leela y aceptala para seguir usando Syntropy.`
              : `Para usar Syntropy necesitás aceptar los términos de uso y la política de privacidad vigentes desde el ${LEGAL_EFFECTIVE_LABEL}.`}
          </p>
        </div>

        {changed.length > 0 ? (
          <section className="space-y-4 rounded-2xl border border-line bg-shell/70 p-5">
            {changed.map((document) => (
              <div key={document.kind}>
                <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                  <FileText className="h-4 w-4 text-rose-bright" aria-hidden="true" />
                  {isUpdate ? `Qué cambió en ${document.title.toLowerCase()}` : document.title}
                </h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-secondary">
                  {(isUpdate ? document.changes : document.summary).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Link
                  to={`/legal/${document.kind}`}
                  target="_blank"
                  className="mt-2 inline-flex text-xs font-semibold text-rose-bright hover:text-rose-soft"
                >
                  Leer el texto completo (se abre en otra pestaña)
                </Link>
              </div>
            ))}
          </section>
        ) : null}

        <div className="space-y-3 rounded-xl border border-line bg-sunken/50 p-4">
          <Checkbox
            id="legal-terms"
            label={`Leí y acepto los términos de uso (versión del ${LEGAL_EFFECTIVE_LABEL}).`}
            checked={terms}
            onChange={(event) => setTerms(event.target.checked)}
          />
          <Checkbox
            id="legal-privacy"
            label={`Leí y acepto la política de privacidad (versión del ${LEGAL_EFFECTIVE_LABEL}).`}
            checked={privacy}
            onChange={(event) => setPrivacy(event.target.checked)}
          />
          {pending.age ? (
            <Checkbox
              id="legal-age"
              label="Confirmo que tengo 13 años o más."
              description="Si tenés entre 13 y 17 años, usá Syntropy con la autorización de tus padres o tutores."
              checked={age}
              onChange={(event) => setAge(event.target.checked)}
            />
          ) : null}
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <Button
          size="lg"
          className="w-full"
          onClick={() => void handleAccept()}
          loading={saving}
          disabled={!ready}
        >
          Aceptar y continuar
        </Button>

        <div className="space-y-3 border-t border-line pt-5">
          <p className="text-xs leading-5 text-ink-muted">
            Si no estás de acuerdo, podés descargar una copia de tus datos y eliminar tu cuenta.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleExport()}
              loading={exporting}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              Descargar mis datos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger/10 hover:text-danger"
              onClick={() => setDeleteOpen(true)}
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Eliminar mi cuenta
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void signOut()}
              leftIcon={<LogOut className="h-3.5 w-3.5" />}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </main>

      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  )
}
