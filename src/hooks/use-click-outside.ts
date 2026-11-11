import { useEffect, useRef } from 'react'

export function useClickOutside<T extends HTMLElement>(onOutside: () => void, active = true) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!active) {
      return
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target

      if (target instanceof Node && ref.current && !ref.current.contains(target)) {
        onOutside()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOutside()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [active, onOutside])

  return ref
}
