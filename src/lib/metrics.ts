export interface TrendMetricRow {
  timestamp: string
  cpu_usage: number
  ram_usage: number
  disk_usage: number
}

export interface TrendPoint {
  timestamp: string
  cpu: number
  ram: number
  disk: number
}

const roundTo = (n: number, decimals: number): number => {
  const factor = Math.pow(10, decimals)
  return Math.round(n * factor) / factor
}

/**
 * Reduces an ordered-by-insertion list of raw metric rows into at most
 * `maxBuckets` fleet-average points for trend charts. Rows are sorted by
 * timestamp internally so callers do not need to depend on query order.
 */
export function bucketTrendMetrics(
  rows: TrendMetricRow[],
  maxBuckets = 24,
  decimals = 0
): TrendPoint[] {
  if (rows.length === 0) return []

  const sorted = [...rows].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  const bucketSize = Math.max(1, Math.ceil(sorted.length / maxBuckets))
  const points: TrendPoint[] = []

  for (let i = 0; i < sorted.length; i += bucketSize) {
    const slice = sorted.slice(i, i + bucketSize)
    const avg = (key: 'cpu_usage' | 'ram_usage' | 'disk_usage') =>
      roundTo(slice.reduce((sum, m) => sum + m[key], 0) / slice.length, decimals)
    const mid = slice[Math.floor(slice.length / 2)]
    points.push({
      timestamp: new Date(mid.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      cpu: avg('cpu_usage'),
      ram: avg('ram_usage'),
      disk: avg('disk_usage'),
    })
  }

  return points
}
