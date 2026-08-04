import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useThrottledCallback } from '@/hooks/useThrottledCallback'

describe('useThrottledCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires immediately on the leading call', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useThrottledCallback(fn, 3000))

    act(() => result.current(1))
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1)
  })

  it('coalesces a burst of rapid calls into one, with a trailing call', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useThrottledCallback(fn, 3000))

    act(() => {
      result.current(1) // leading — fires
      result.current(2)
      result.current(3)
    })
    expect(fn).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith(3)
  })

  it('does not fire more than once per window during a steady stream', () => {
    const fn = vi.fn()
    const { result } = renderHook(() => useThrottledCallback(fn, 1000))

    for (let i = 0; i < 50; i++) {
      act(() => result.current(i))
      act(() => vi.advanceTimersByTime(100))
    }
    expect(fn.mock.calls.length).toBeLessThanOrEqual(10)
  })

  it('uses the latest callback after re-render', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result, rerender } = renderHook(
      ({ cb }) => useThrottledCallback(cb, 100),
      { initialProps: { cb: first } }
    )

    rerender({ cb: second })
    act(() => result.current())
    act(() => vi.advanceTimersByTime(100))

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalled()
  })
})
