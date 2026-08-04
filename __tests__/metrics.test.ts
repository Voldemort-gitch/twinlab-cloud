import { describe, it, expect } from 'vitest'
import { bucketTrendMetrics } from '@/lib/metrics'

function row(timestamp: string, cpu: number, ram: number, disk: number) {
  return { timestamp, cpu_usage: cpu, ram_usage: ram, disk_usage: disk }
}

describe('bucketTrendMetrics', () => {
  it('returns an empty array for no rows', () => {
    expect(bucketTrendMetrics([])).toEqual([])
  })

  it('sorts rows by timestamp regardless of input order', () => {
    const out = bucketTrendMetrics([
      row('2026-08-04T10:00:00Z', 30, 40, 50),
      row('2026-08-04T09:00:00Z', 10, 20, 30),
      row('2026-08-04T08:00:00Z', 50, 60, 70),
    ], 24, 0)
    expect(out).toHaveLength(3)
    expect(out.every((p) => typeof p.timestamp === 'string' && p.timestamp.length > 0)).toBe(true)
    // First bucket should be the earliest time: 08:00Z
    expect(out[0].cpu).toBe(50)
    expect(out[1].cpu).toBe(10)
    expect(out[2].cpu).toBe(30)
  })

  it('caps the number of buckets at maxBuckets and averages each slice', () => {
    const rows = Array.from({ length: 100 }, (_, i) =>
      row(`2026-08-04T00:${String(i % 60).padStart(2, '0')}:00Z`, i, i * 2, i * 3)
    )
    const out = bucketTrendMetrics(rows, 24, 0)
    expect(out.length).toBeLessThanOrEqual(24)
    expect(out.every((p) => Number.isInteger(p.cpu))).toBe(true)
  })

  it('respects decimals precision', () => {
    const rows = [
      row('2026-08-04T00:00:00Z', 1, 2, 3),
      row('2026-08-04T00:00:05Z', 2, 3, 4),
    ]
    const out = bucketTrendMetrics(rows, 1, 1)
    expect(out).toHaveLength(1)
    expect(out[0].cpu).toBe(1.5)
  })
})
