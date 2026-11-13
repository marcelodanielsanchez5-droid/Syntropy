/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_APP_URL?: string
  readonly VITE_APP_ENV?: string
  readonly VITE_APP_VERSION?: string
  /** Responsable, correo y domicilio que muestran los textos legales (Fase 8). */
  readonly VITE_LEGAL_OWNER?: string
  readonly VITE_LEGAL_CONTACT_EMAIL?: string
  readonly VITE_LEGAL_LOCATION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
