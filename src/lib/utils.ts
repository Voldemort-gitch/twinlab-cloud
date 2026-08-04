import { ComputerStatus, TicketStatus, TicketPriority, AlertSeverity } from '@/types'

export function getStatusColor(status: ComputerStatus): string {
  switch (status) {
    case ComputerStatus.ONLINE:
      return 'status-online'
    case ComputerStatus.MAINTENANCE:
      return 'status-maintenance'
    case ComputerStatus.OFFLINE:
      return 'status-offline'
    default:
      return 'status-offline'
  }
}

export function getStatusBadgeClass(status: ComputerStatus): string {
  switch (status) {
    case ComputerStatus.ONLINE:
      return 'status-badge-online'
    case ComputerStatus.MAINTENANCE:
      return 'status-badge-maintenance'
    case ComputerStatus.OFFLINE:
      return 'status-badge-offline'
    default:
      return 'status-badge-offline'
  }
}

export function getStatusLabel(status: ComputerStatus): string {
  switch (status) {
    case ComputerStatus.ONLINE:
      return 'Online'
    case ComputerStatus.MAINTENANCE:
      return 'Under Maintenance'
    case ComputerStatus.OFFLINE:
      return 'Offline'
    default:
      return 'Unknown'
  }
}

export function getTicketStatusLabel(status: TicketStatus): string {
  switch (status) {
    case TicketStatus.OPEN:
      return 'Open'
    case TicketStatus.ASSIGNED:
      return 'Assigned'
    case TicketStatus.IN_PROGRESS:
      return 'In Progress'
    case TicketStatus.RESOLVED:
      return 'Resolved'
    case TicketStatus.CLOSED:
      return 'Closed'
    default:
      return 'Unknown'
  }
}

export function getTicketStatusBadgeClass(status: TicketStatus): string {
  return `status-badge-${status}`
}

export function getNextTicketStatus(status: TicketStatus): TicketStatus | null {
  switch (status) {
    case TicketStatus.OPEN:
      return TicketStatus.ASSIGNED
    case TicketStatus.ASSIGNED:
      return TicketStatus.IN_PROGRESS
    case TicketStatus.IN_PROGRESS:
      return TicketStatus.RESOLVED
    case TicketStatus.RESOLVED:
      return TicketStatus.CLOSED
    default:
      return null
  }
}

export function getTicketPriorityLabel(priority: TicketPriority): string {
  switch (priority) {
    case TicketPriority.LOW:
      return 'Low'
    case TicketPriority.MEDIUM:
      return 'Medium'
    case TicketPriority.HIGH:
      return 'High'
    case TicketPriority.CRITICAL:
      return 'Critical'
    default:
      return 'Unknown'
  }
}

export function getTicketPriorityColor(priority: TicketPriority): string {
  switch (priority) {
    case TicketPriority.LOW:
      return 'text-accent-muted'
    case TicketPriority.MEDIUM:
      return 'text-yellow-400'
    case TicketPriority.HIGH:
      return 'text-orange-400'
    case TicketPriority.CRITICAL:
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

export function getAlertSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case AlertSeverity.INFO:
      return 'text-accent-muted'
    case AlertSeverity.WARNING:
      return 'text-yellow-400'
    case AlertSeverity.CRITICAL:
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatMetric(value: number, unit: string): string {
  return `${Math.round(value * 100) / 100}${unit}`
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`
}

export function getTrendIndicator(
  trend: 'improving' | 'declining' | 'stable'
): string {
  switch (trend) {
    case 'improving':
      return '↑'
    case 'declining':
      return '↓'
    case 'stable':
      return '→'
    default:
      return '→'
  }
}

export function getTrendColor(trend: 'improving' | 'declining' | 'stable'): string {
  switch (trend) {
    case 'improving':
      return 'text-status-online'
    case 'declining':
      return 'text-status-offline'
    case 'stable':
      return 'text-brand-dark-text-muted'
    default:
      return 'text-brand-dark-text-muted'
  }
}

export function isNavItemActive(pathname: string | undefined, href: string): boolean {
  if (!pathname) return false
  if (href === '/dashboard') return pathname === href
  return pathname.startsWith(href)
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.max(0, Math.floor(Math.log(Math.abs(bytes)) / Math.log(k)))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
