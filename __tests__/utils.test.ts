import { describe, it, expect } from 'vitest'
import {
  getStatusColor,
  getStatusLabel,
  getStatusBadgeClass,
  getTicketStatusLabel,
  getNextTicketStatus,
  getTicketPriorityLabel,
  getTicketPriorityColor,
  formatBytes,
  formatPercentage,
  formatMetric,
  getTrendIndicator,
  getTrendColor,
  isNavItemActive,
} from '@/lib/utils'
import { ComputerStatus, TicketStatus, TicketPriority } from '@/types'

describe('status helpers', () => {
  it('maps computer status to color/label/badge', () => {
    expect(getStatusColor(ComputerStatus.ONLINE)).toBe('status-online')
    expect(getStatusColor(ComputerStatus.MAINTENANCE)).toBe('status-maintenance')
    expect(getStatusColor(ComputerStatus.OFFLINE)).toBe('status-offline')
    expect(getStatusLabel(ComputerStatus.MAINTENANCE)).toBe('Under Maintenance')
    expect(getStatusBadgeClass(ComputerStatus.ONLINE)).toBe('status-badge-online')
  })

  it('falls back for unknown statuses', () => {
    expect(getStatusColor('unknown' as ComputerStatus)).toBe('status-offline')
    expect(getStatusLabel('unknown' as ComputerStatus)).toBe('Unknown')
  })
})

describe('ticket status lifecycle', () => {
  it('advances through the full workflow', () => {
    expect(getNextTicketStatus(TicketStatus.OPEN)).toBe(TicketStatus.ASSIGNED)
    expect(getNextTicketStatus(TicketStatus.ASSIGNED)).toBe(TicketStatus.IN_PROGRESS)
    expect(getNextTicketStatus(TicketStatus.IN_PROGRESS)).toBe(TicketStatus.RESOLVED)
    expect(getNextTicketStatus(TicketStatus.RESOLVED)).toBe(TicketStatus.CLOSED)
    expect(getNextTicketStatus(TicketStatus.CLOSED)).toBeNull()
  })

  it('labels all statuses', () => {
    expect(getTicketStatusLabel(TicketStatus.OPEN)).toBe('Open')
    expect(getTicketStatusLabel(TicketStatus.IN_PROGRESS)).toBe('In Progress')
    expect(getTicketStatusLabel(TicketStatus.CLOSED)).toBe('Closed')
  })
})

describe('priority helpers', () => {
  it('labels all priorities', () => {
    expect(getTicketPriorityLabel(TicketPriority.LOW)).toBe('Low')
    expect(getTicketPriorityLabel(TicketPriority.CRITICAL)).toBe('Critical')
  })

  it('maps critical to red and low to accent-muted', () => {
    expect(getTicketPriorityColor(TicketPriority.CRITICAL)).toContain('red')
    expect(getTicketPriorityColor(TicketPriority.LOW)).toBe('text-accent-muted')
  })
})

describe('formatting helpers', () => {
  it('formats bytes with appropriate units', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB')
  })

  it('handles fractional byte values without crashing', () => {
    expect(formatBytes(0.5)).toBe('0.5 B')
    expect(formatBytes(-1)).toBe('-1 B')
  })

  it('formats percentages and metrics', () => {
    expect(formatPercentage(87.6)).toBe('88%')
    expect(formatMetric(3.14159, 'GHz')).toBe('3.14GHz')
  })
})

describe('trend helpers', () => {
  it('returns correct indicators', () => {
    expect(getTrendIndicator('improving')).toBe('↑')
    expect(getTrendIndicator('declining')).toBe('↓')
    expect(getTrendIndicator('stable')).toBe('→')
  })

  it('returns correct colors', () => {
    expect(getTrendColor('improving')).toBe('text-status-online')
    expect(getTrendColor('declining')).toBe('text-status-offline')
    expect(getTrendColor('stable')).toBe('text-brand-dark-text-muted')
  })
})

describe('isNavItemActive', () => {
  it('matches the dashboard only on the exact route', () => {
    expect(isNavItemActive('/dashboard', '/dashboard')).toBe(true)
    expect(isNavItemActive('/dashboard/labs', '/dashboard')).toBe(false)
  })

  it('matches nested routes for section pages', () => {
    expect(isNavItemActive('/dashboard/twin', '/dashboard/twin')).toBe(true)
    expect(isNavItemActive('/dashboard/twin/123', '/dashboard/twin')).toBe(true)
    expect(isNavItemActive('/dashboard', '/dashboard/twin')).toBe(false)
  })

  it('returns false for undefined pathname', () => {
    expect(isNavItemActive(undefined, '/dashboard')).toBe(false)
  })
})
