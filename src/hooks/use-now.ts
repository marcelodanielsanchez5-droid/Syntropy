import { useEffect, useState } from 'react'

/**
 * Hora actual que se renueva sola. Las cuentas regresivas («Hoy», «Atrasada»)
 * dependen del reloj: sin esto quedarían congeladas mientras la pantalla sigue abierta.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)

    return () => window.clearInterval(timer)
  }, [intervalMs])

  return now
}
