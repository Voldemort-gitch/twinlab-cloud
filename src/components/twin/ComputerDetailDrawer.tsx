'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Computer } from '@/types'
import { getStatusBadgeClass, getStatusLabel, formatDate, formatDateTime } from '@/lib/utils'
import { X, Cpu, MemoryStick, HardDrive, Network, Thermometer, Clock, Monitor, HeartPulse } from 'lucide-react'
import { useDialog } from '@/hooks/useDialog'

export interface MetricSnapshot {
  cpu_usage: number
  ram_usage: number
  disk_usage: number
  temperature: number
  network_upload: number
  network_download: number
  uptime: number
  running_processes: number
  health_score: number
  timestamp: string
}

interface ComputerDetailDrawerProps {
  computer: Computer
  metric?: MetricSnapshot
  onClose: () => void
}

export default function ComputerDetailDrawer({ computer, metric, onClose }: ComputerDetailDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useDialog(true, onClose, closeRef)

  const healthScore = metric ? Math.min(metric.health_score, 100) : 0
  const healthColor =
    metric && metric.health_score >= 70
      ? '#34D399'
      : metric && metric.health_score >= 40
        ? '#FBBF24'
        : '#F87171'

  const uptimeHours = metric ? Math.floor(metric.uptime / 3600) : 0
  const uptimeMinutes = metric ? Math.floor((metric.uptime % 3600) / 60) : 0

  // Ring geometry
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - healthScore / 100)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: 420, opacity: 0.5 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 420, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="relative w-full max-w-md h-full bg-brand-dark-glass-strong backdrop-blur-glass border-l border-white/10 shadow-2xl overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={`${computer.name} details`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 glass-strong border-b border-white/10 px-6 py-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent/15" style={{ boxShadow: '0 0 16px rgba(143,99,247,0.3)' }}>
                <Monitor className="w-5 h-5 text-accent" />
              </span>
              <h3 className="font-display text-xl font-bold">{computer.name}</h3>
              <span className={`status-badge ${getStatusBadgeClass(computer.status)} text-xs`}>
                {getStatusLabel(computer.status)}
              </span>
            </div>
            <p className="text-sm text-brand-dark-text-muted font-mono">{computer.asset_id}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.08, rotate: 90 }}
            whileTap={{ scale: 0.92 }}
            onClick={onClose}
            className="p-2 clay rounded-xl text-brand-dark-text-muted hover:text-brand-dark-text transition-colors"
            title="Close"
            aria-label="Close"
            ref={closeRef}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="p-6 space-y-6">
          {/* Health Score ring */}
          {metric && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="card-glass"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-brand-dark-text-muted flex items-center gap-2">
                  <HeartPulse className="w-4 h-4" style={{ color: healthColor }} /> Health Score
                </p>
                <span className="text-xs text-brand-dark-text-muted">{formatDateTime(metric.timestamp)}</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke={healthColor}
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: dashOffset }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                      style={{ filter: `drop-shadow(0 0 6px ${healthColor}88)` }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-2xl font-bold" style={{ color: healthColor }}>
                      {Math.round(healthScore)}
                    </span>
                    <span className="text-[10px] text-brand-dark-text-subtle">/ 100</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-status-online" />
                    <span className="text-brand-dark-text-muted">Good {'>='} 70</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-status-maintenance" />
                    <span className="text-brand-dark-text-muted">Fair 40–69</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-status-offline" />
                    <span className="text-brand-dark-text-muted">Poor {'<'} 40</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Live Metrics */}
          <div>
            <p className="text-sm font-semibold text-brand-dark-text-muted mb-3">Live Metrics</p>
            <div className="grid grid-cols-2 gap-3">
              {metric ? (
                <>
                  <MetricCard icon={<Cpu className="w-4 h-4 text-accent" />} label="CPU" value={`${Math.round(metric.cpu_usage)}%`} />
                  <MetricCard icon={<MemoryStick className="w-4 h-4 text-status-online" />} label="RAM" value={`${Math.round(metric.ram_usage)}%`} />
                  <MetricCard icon={<HardDrive className="w-4 h-4 text-status-maintenance" />} label="Disk" value={`${Math.round(metric.disk_usage)}%`} />
                  <MetricCard icon={<Thermometer className="w-4 h-4 text-status-offline" />} label="Temp" value={`${Math.round(metric.temperature)}°C`} />
                  <MetricCard icon={<Network className="w-4 h-4 text-accent" />} label="Upload" value={`${metric.network_upload.toFixed(1)} MB/s`} />
                  <MetricCard icon={<Network className="w-4 h-4 text-purple-400" />} label="Download" value={`${metric.network_download.toFixed(1)} MB/s`} />
                  <MetricCard icon={<Clock className="w-4 h-4 text-brand-dark-text-muted" />} label="Uptime" value={`${uptimeHours}h ${uptimeMinutes}m`} />
                  <MetricCard icon={<Monitor className="w-4 h-4 text-brand-dark-text-muted" />} label="Processes" value={`${metric.running_processes}`} />
                </>
              ) : (
                <div className="col-span-2 text-sm text-brand-dark-text-muted py-6 text-center">
                  No metric data available yet
                </div>
              )}
            </div>
          </div>

          {/* Hardware */}
          <div>
            <p className="text-sm font-semibold text-brand-dark-text-muted mb-3">Hardware</p>
            <div className="card-glass !p-4 space-y-3">
              <InfoRow label="Operating System" value={computer.os} />
              <InfoRow label="Processor" value={computer.cpu} />
              <InfoRow label="Memory" value={`${computer.ram_gb} GB`} />
              <InfoRow label="Storage" value={`${computer.storage_gb} GB`} />
              <InfoRow label="IP Address" value={computer.ip_address} mono />
              <InfoRow label="MAC Address" value={computer.mac_address} mono />
            </div>
          </div>

          {/* Purchase Info */}
          <div>
            <p className="text-sm font-semibold text-brand-dark-text-muted mb-3">Asset Info</p>
            <div className="card-glass !p-4 space-y-3">
              <InfoRow label="Purchased" value={computer.purchase_date ? formatDate(computer.purchase_date) : '—'} />
              <InfoRow label="Warranty Until" value={computer.warranty_date ? formatDate(computer.warranty_date) : '—'} />
              <InfoRow label="Location" value={`(${Math.round(computer.position_x)}, ${Math.round(computer.position_y)})`} mono />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="card-glass !p-3 hover:shadow-glow-sm"
    >
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-xs text-brand-dark-text-muted">{label}</span>
      </div>
      <p className="text-sm font-bold font-mono">{value}</p>
    </motion.div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-brand-dark-text-muted shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}
