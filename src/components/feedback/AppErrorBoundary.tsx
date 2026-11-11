import { Component, type ErrorInfo, type ReactNode } from 'react'

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no controlado en Syntropy', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-[#0C141F] px-6 text-white">
          <div className="w-full max-w-md space-y-4 text-center">
            <img src="/brand/logo-mark.svg" alt="" className="mx-auto h-16 w-16" />
            <h1 className="text-xl font-bold">Algo se desordenó</h1>
            <p className="text-sm leading-6 text-[#98A2B3]">
              La aplicación encontró un error inesperado. Recargá la página para volver a empezar.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#E01462] px-5 text-sm font-semibold text-white transition hover:bg-[#C11254]"
            >
              Recargar Syntropy
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
