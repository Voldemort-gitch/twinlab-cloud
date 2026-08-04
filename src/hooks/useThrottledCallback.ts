'use client'

import { useEffect, useRef } from 'react'

/**
 * Returns a callback throttled to at most one invocation per `waitMs`,
 * with a guaranteed trailing call. Rapid calls within the window are
 * coalesced, so a steady high-frequency stream (e.g. realtime metric
 * inserts) triggers at most one call per `waitMs` instead of one per event.
 * The trailing call uses the most recently supplied arguments.
 */
export function useThrottledCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  waitMs: number
): (...args: Args) => void {
  const lastFireRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(callback)
  const pendingArgsRef = useRef<Args | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (...args: Args) => {
    const now = Date.now()
    const remaining = waitMs - (now - lastFireRef.current)

    if (remaining <= 0) {
      // Leading invocation — fire now, then allow a trailing refresh.
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      pendingArgsRef.current = null
      lastFireRef.current = now
      callbackRef.current(...args)
    } else {
      // Coalesce within the window, remembering the latest arguments.
      pendingArgsRef.current = args
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null
          lastFireRef.current = Date.now()
          const pending = pendingArgsRef.current
          pendingArgsRef.current = null
          if (pending) callbackRef.current(...pending)
        }, remaining)
      }
    }
  }
}
