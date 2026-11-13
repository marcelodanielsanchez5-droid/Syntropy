/**
 * Datos del responsable que aparecen en los textos legales. Se cargan con
 * variables de entorno para no dejar datos personales en el repositorio.
 * Antes de publicar tienen que estar completos (ver docs/fase-8/README.md).
 */
export interface LegalContact {
  /** Nombre y apellido, o razón social, del responsable de Syntropy. */
  owner: string | null
  /** Correo para consultas, pedidos sobre los datos y reportes de seguridad. */
  email: string | null
  /** Ciudad y país (o domicilio) del responsable. */
  location: string | null
}

type LegalEnv = Partial<
  Record<'VITE_LEGAL_OWNER' | 'VITE_LEGAL_CONTACT_EMAIL' | 'VITE_LEGAL_LOCATION', string>
>

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function readLegalContact(env: LegalEnv = import.meta.env): LegalContact {
  const email = clean(env.VITE_LEGAL_CONTACT_EMAIL)

  return {
    owner: clean(env.VITE_LEGAL_OWNER),
    email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
    location: clean(env.VITE_LEGAL_LOCATION),
  }
}

/** Variables que faltan para publicar los textos legales. */
export function missingLegalVariables(contact: LegalContact): string[] {
  const missing: string[] = []

  if (!contact.owner) {
    missing.push('VITE_LEGAL_OWNER')
  }

  if (!contact.email) {
    missing.push('VITE_LEGAL_CONTACT_EMAIL')
  }

  if (!contact.location) {
    missing.push('VITE_LEGAL_LOCATION')
  }

  return missing
}
