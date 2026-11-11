import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Logo } from '@/components/ui/Logo'

const documents = {
  terminos: {
    title: 'Términos de uso',
    description: 'Borrador de desarrollo. Debe revisarse con un profesional legal antes de publicar.',
    sections: [
      {
        title: '1. Aceptación',
        body: 'Al crear una cuenta aceptás estos términos. Si no estás de acuerdo, no uses la aplicación. El uso está permitido a personas de 13 años o más con capacidad para aceptar estas condiciones.',
      },
      {
        title: '2. Cuenta',
        body: 'Sos responsable de la confidencialidad de tu contraseña y de la actividad de tu cuenta. No compartas tus credenciales. Si detectás un acceso no autorizado, cambiá la contraseña y contactanos.',
      },
      {
        title: '3. Uso aceptable',
        body: 'Syntropy es una herramienta personal de organización académica. No está permitido usarla para acosar, publicar contenido ilegal, intentar vulnerar la seguridad del servicio o interferir con otros usuarios.',
      },
      {
        title: '4. Contenido',
        body: 'El contenido que cargás (asignaturas, tareas, notas, archivos) es tuyo. Nos autorizás a almacenarlo y procesarlo únicamente para prestarte el servicio. No vendemos tus datos.',
      },
      {
        title: '5. Disponibilidad',
        body: 'El servicio se ofrece “tal cual”. Puede haber interrupciones, mantenimiento o pérdida de datos si no se toman respaldos. El MVP no garantiza disponibilidad continua.',
      },
      {
        title: '6. Propiedad intelectual',
        body: 'El nombre, el logo, la interfaz y el código de Syntropy pertenecen a sus autores. El logo actual es provisional y será reemplazado antes de la publicación.',
      },
      {
        title: '7. Terminación',
        body: 'Podés eliminar tu cuenta desde Configuración. También podemos suspender cuentas que incumplan estos términos o pongan en riesgo el servicio.',
      },
      {
        title: '8. Cambios',
        body: 'Estos términos pueden cambiar. Si el cambio es relevante, se avisará dentro de la aplicación antes de que entre en vigor.',
      },
    ],
  },
  privacidad: {
    title: 'Política de privacidad',
    description: 'Borrador de desarrollo. Debe revisarse con un profesional legal antes de publicar.',
    sections: [
      {
        title: '1. Responsable',
        body: 'Syntropy es un proyecto académico en desarrollo. El responsable del tratamiento y los datos de contacto deben completarse antes de la publicación.',
      },
      {
        title: '2. Datos que recopilamos',
        body: 'Correo electrónico, nombre de usuario, nombre completo opcional, zona horaria, aceptación de términos y los datos académicos que cargues: años, asignaturas, tareas, exámenes, notas, horarios, nodos, fuentes y archivos.',
      },
      {
        title: '3. Finalidad',
        body: 'Usamos los datos para autenticarte, mostrarte tu espacio académico, sincronizar entre dispositivos y enviar correos de confirmación o recuperación. No usamos tus datos para publicidad.',
      },
      {
        title: '4. Base legal',
        body: 'El tratamiento se basa en tu consentimiento al crear la cuenta y en la ejecución del servicio. Podés retirar el consentimiento eliminando la cuenta.',
      },
      {
        title: '5. Almacenamiento',
        body: 'Los datos se guardan en Supabase (PostgreSQL, Auth y Storage) con RLS. Los archivos se almacenan en buckets privados. La caché offline se guarda en IndexedDB del dispositivo y se borra al cerrar sesión.',
      },
      {
        title: '6. Conservación',
        body: 'Los datos se conservan mientras la cuenta exista. Al eliminarla, se borran el perfil y los datos asociados mediante las cascadas de la base de datos, salvo obligaciones legales de conservación.',
      },
      {
        title: '7. Derechos',
        body: 'Podés acceder, corregir o eliminar tus datos desde la aplicación. Para solicitudes adicionales, el canal de contacto debe definirse antes de publicar.',
      },
      {
        title: '8. Menores',
        body: 'La edad mínima es 13 años. No se solicita fecha de nacimiento. Si se detecta una cuenta de un menor de 13 años, se eliminará.',
      },
      {
        title: '9. Seguridad',
        body: 'Usamos autenticación, RLS y buckets privados. Ningún sistema es completamente seguro. Si detectás una vulnerabilidad, reportala de forma responsable.',
      },
      {
        title: '10. Cambios',
        body: 'Esta política puede actualizarse. La versión vigente y la fecha de aceptación se registrarán en el perfil.',
      },
    ],
  },
} as const

type LegalKind = keyof typeof documents

export function LegalPage() {
  const { kind } = useParams<{ kind: string }>()
  const document = kind && kind in documents ? documents[kind as LegalKind] : null

  if (!document) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ink">Documento no encontrado</h1>
          <Link to="/ingresar" className="mt-4 inline-block text-sm text-rose-bright">
            Volver al ingreso
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-shell/70">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <Logo to="/ingresar" size="sm" />
          <Link
            to="/ingresar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-rose/20 bg-rose/10 text-rose-bright">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {document.title}
            </h1>
            <p className="text-xs text-ink-muted">Versión de desarrollo · 10 de noviembre de 2026</p>
          </div>
        </div>

        <Alert variant="warning" className="mb-6">
          {document.description} No uses este texto como documento legal definitivo.
        </Alert>

        <article className="space-y-6 rounded-2xl border border-line bg-shell/70 p-6 sm:p-8">
          {document.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-sm font-bold text-ink">{section.title}</h2>
              <p className="mt-1.5 text-sm leading-7 text-ink-muted">{section.body}</p>
            </section>
          ))}
        </article>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-disabled">
          <span>© 2026 Syntropy</span>
          <div className="flex gap-4">
            <Link to="/legal/terminos" className="hover:text-ink-secondary">
              Términos
            </Link>
            <Link to="/legal/privacidad" className="hover:text-ink-secondary">
              Privacidad
            </Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
