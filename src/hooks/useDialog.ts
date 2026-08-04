import { useEffect } from 'react'

export function useDialog(open: boolean, onClose: () => void, focusRef?: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const timer = setTimeout(() => {
      focusRef?.current?.focus()
    }, 30)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [open, onClose, focusRef])
}
