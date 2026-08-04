'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Computer, ComputerStatus } from '@/types'
import { getStatusLabel } from '@/lib/utils'
import { Monitor, Wifi, WifiOff, Wrench } from 'lucide-react'

interface ComputerNodeProps {
  computer: Computer
  latestMetric?: {
    cpu_usage: number
    health_score: number
  }
  scale: number
  selected: boolean
  onSelect: (computer: Computer) => void
}

const ComputerNode = memo(function ComputerNode({
  computer,
  latestMetric,
  scale,
  selected,
  onSelect,
}: ComputerNodeProps) {
  const status = computer.status as ComputerStatus
  const isOnline = status === ComputerStatus.ONLINE

  const statusStyles: Record<ComputerStatus, string> = {
    [ComputerStatus.ONLINE]: 'border-status-online/60 shadow-glow-online',
    [ComputerStatus.MAINTENANCE]: 'border-status-maintenance/60 shadow-glow-maintenance',
    [ComputerStatus.OFFLINE]: 'border-status-offline/60 shadow-glow-offline',
  }

  const indicatorColor: Record<ComputerStatus, string> = {
    [ComputerStatus.ONLINE]: 'bg-status-online',
    [ComputerStatus.MAINTENANCE]: 'bg-status-maintenance',
    [ComputerStatus.OFFLINE]: 'bg-status-offline',
  }

  const healthColor =
    latestMetric && latestMetric.health_score >= 70
      ? 'text-status-online'
      : latestMetric && latestMetric.health_score >= 40
        ? 'text-status-maintenance'
        : 'text-status-offline'

  return (
    <motion.button
      onClick={() => onSelect(computer)}
      style={{ transform: `scale(${scale})` }}
      initial={{ opacity: 0, scale: scale * 0.85, y: 8 }}
      animate={{ opacity: 1, scale, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      whileHover={{ scale: scale * 1.05, zIndex: 10 }}
      whileTap={{ scale: scale * 0.96 }}
      className={`group relative w-28 sm:w-36 origin-center cursor-pointer rounded-xl border p-3 text-left transition-colors duration-200 ${statusStyles[status]} ${
        selected ? 'ring-2 ring-accent z-10' : ''
      }`}
      title={`${computer.name} - ${getStatusLabel(status)}`}
    >
      {/* Status indicator dot */}
      <motion.span
        animate={isOnline ? { opacity: [1, 0.6, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
        className={`absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full ${indicatorColor[status]} ${
          isOnline ? 'animate-pulse' : ''
        }`}
      />

      {/* Monitor icon with status */}
      <div className="flex items-center gap-2 mb-2">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-status-online" />
        ) : status === ComputerStatus.MAINTENANCE ? (
          <Wrench className="w-4 h-4 text-status-maintenance" />
        ) : (
          <WifiOff className="w-4 h-4 text-status-offline" />
        )}
        <span className="text-xs font-semibold truncate">{computer.name}</span>
      </div>

      <div className="flex items-center justify-between text-[10px] text-brand-dark-text-muted">
        <span className="truncate">{computer.os?.split(' ')[0]}</span>
        {latestMetric ? (
          <span className={`font-mono font-semibold ${healthColor}`}>
            {Math.round(latestMetric.cpu_usage)}%
          </span>
        ) : (
          <Monitor className="w-3 h-3 opacity-40" />
        )}
      </div>
    </motion.button>
  )
})

export default ComputerNode
