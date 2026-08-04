'use client'

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'

const MOBILE_BREAKPOINT = 768
const DESKTOP_MIN_NODE_PX = 144
const MOBILE_MIN_NODE_PX = 100
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Computer, Lab, ComputerStatus } from '@/types'
import { useRealtime } from '@/hooks/useRealtime'
import ComputerNode from '@/components/twin/ComputerNode'
import ComputerDetailDrawer, { MetricSnapshot } from '@/components/twin/ComputerDetailDrawer'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { matchesAnyQuery } from '@/lib/search'
import SearchInput from '@/components/ui/SearchInput'
import { ZoomIn, ZoomOut, Maximize2, Building2, Layers, Wifi, WifiOff, Wrench } from 'lucide-react'

export const dynamic = 'force-dynamic'

type MetricMap = Record<string, MetricSnapshot>

export default function DigitalTwinPage() {
  const [labs, setLabs] = useState<Lab[]>([])
  const [activeLabId, setActiveLabId] = useState<string | null>(null)
  const [computers, setComputers] = useState<Computer[]>([])
  const [metrics, setMetrics] = useState<MetricMap>({})
  const [loading, setLoading] = useState(true)
  const [selectedComputer, setSelectedComputer] = useState<Computer | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<ComputerStatus | 'all'>('all')
  const [zoom, setZoom] = useState(1)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'live' | 'offline'>('connecting')
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0)
  const selectedComputerRef = useRef<Computer | null>(null)

  useEffect(() => {
    selectedComputerRef.current = selectedComputer
  }, [selectedComputer])

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load labs on mount
  useEffect(() => {
    const loadLabs = async () => {
      const { data } = await supabase.from('labs').select('*').order('name')
      setLabs(data || [])
      if (data && data.length > 0) {
        setActiveLabId(data[0].id)
      }
    }
    loadLabs()
  }, [])

  // Load computers + latest metrics when lab changes
  useEffect(() => {
    if (!activeLabId) return
    let cancelled = false

    const loadLabData = async () => {
      setLoading(true)
      const { data: comps, error } = await supabase
        .from('computers')
        .select('*')
        .eq('lab_id', activeLabId)
        .order('position_y', { ascending: true })
        .order('position_x', { ascending: true })

      if (!cancelled && !error) {
        setComputers(comps || [])
      }

      // Load latest metric for every computer in this lab
      const ids = (comps || []).map((c) => c.id)
      if (ids.length > 0) {
        const { data: metricRows } = await supabase
          .from('computer_metrics')
          .select('computer_id, cpu_usage, ram_usage, disk_usage, temperature, network_upload, network_download, uptime, running_processes, health_score, timestamp')
          .in('computer_id', ids)
          .order('timestamp', { ascending: false })
          .limit(ids.length * 5)

        if (!cancelled && metricRows) {
          const map: MetricMap = {}
          metricRows.forEach((row) => {
            if (!map[row.computer_id]) map[row.computer_id] = row as MetricSnapshot
          })
          setMetrics(map)
        }
      }

      if (!cancelled) setLoading(false)
    }

    loadLabData()
    return () => {
      cancelled = true
    }
  }, [activeLabId])

  // Real-time: computer status updates
  useRealtime({
    table: 'computers',
    onUpdate: (record) => {
      setConnectionStatus('live')
      const r = record as unknown as Computer
      setComputers((prev) =>
        prev.map((c) => (c.id === r.id ? { ...c, ...r } : c))
      )
      if (selectedComputerRef.current?.id === r.id) {
        setSelectedComputer((prev) => (prev ? { ...prev, ...r } : prev))
      }
    },
  })

  // Real-time: new metrics per computer (only for active lab to keep it cheap)
  useRealtime({
    table: 'computer_metrics',
    onInsert: (record) => {
      setConnectionStatus('live')
      const r = record as unknown as MetricSnapshot & { computer_id: string }
      const computer = computers.find((c) => c.id === r.computer_id)
      if (computer) {
        setMetrics((prev) => ({ ...prev, [r.computer_id]: r }))
      }
    },
  })

  const filteredComputers = useMemo(() => {
    return computers.filter((c) => {
      const matchesSearch = matchesAnyQuery(
        [c.name, c.asset_id, c.ip_address, c.os, c.cpu],
        searchQuery
      )
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [computers, searchQuery, filterStatus])

  const isMobile = windowWidth < MOBILE_BREAKPOINT
  const effectiveLayout = useMemo(() => {
    const meta = labs.find((l) => l.id === activeLabId)?.layout_metadata as
      | { rows?: number; columns?: number }
      | undefined
    const base = {
      rows: meta?.rows ?? 4,
      columns: meta?.columns ?? 6,
    }
    if (isMobile) {
      // Fit within screen with 100px nodes + padding
      const maxCols = Math.max(2, Math.min(base.columns, Math.floor((windowWidth - 120) / MOBILE_MIN_NODE_PX)))
      const maxRows = Math.max(2, Math.min(base.rows, Math.floor((windowWidth - 120) / MOBILE_MIN_NODE_PX)))
      return { columns: maxCols, rows: maxRows }
    }
    return base
  }, [labs, activeLabId, isMobile, windowWidth])

  const gridNodeSize = isMobile ? MOBILE_MIN_NODE_PX : DESKTOP_MIN_NODE_PX
  const gridPositionDivisor = isMobile ? 160 : 220

  const counts = useMemo(() => {
    return {
      online: computers.filter((c) => c.status === ComputerStatus.ONLINE).length,
      offline: computers.filter((c) => c.status === ComputerStatus.OFFLINE).length,
      maintenance: computers.filter((c) => c.status === ComputerStatus.MAINTENANCE).length,
    }
  }, [computers])

  const selectedMetric = selectedComputer ? metrics[selectedComputer.id] : undefined

  const resetView = useCallback(() => setZoom(1), [])

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold mb-1 flex items-center gap-3">
            Digital Twin
            <span className="chip">Spatial View</span>
          </h2>
          <p className="text-brand-dark-text-muted">Spatial lab visualization with real-time monitoring</p>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2 text-xs glass rounded-full px-3 py-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'live'
                ? 'bg-status-online animate-pulse'
                : connectionStatus === 'connecting'
                  ? 'bg-status-maintenance animate-pulse'
                  : 'bg-status-offline'
            }`}
          />
          <span className="text-brand-dark-text-muted capitalize">{connectionStatus}</span>
        </div>
      </motion.div>

      {/* Lab Tabs */}
      <motion.div variants={staggerItem} className="flex gap-2 flex-wrap">
        {labs.map((lab) => (
          <button
            key={lab.id}
            onClick={() => setActiveLabId(lab.id)}
            aria-pressed={activeLabId === lab.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
              activeLabId === lab.id
                ? 'bg-accent/20 text-accent border-accent/40 shadow-glow-sm'
                : 'bg-brand-dark-surface text-brand-dark-text-muted border-brand-dark-border hover:bg-brand-dark-surface-hover hover:text-brand-dark-text'
            }`}
          >
            <Building2 className="w-4 h-4" />
            {lab.name}
          </button>
        ))}
      </motion.div>

      {/* Controls */}
      <motion.div variants={staggerItem} className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, asset ID, IP, or OS..."
          className="flex-1 min-w-[220px]"
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ComputerStatus | 'all')}
          className="input !w-auto"
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value={ComputerStatus.ONLINE}>Online</option>
          <option value={ComputerStatus.OFFLINE}>Offline</option>
          <option value={ComputerStatus.MAINTENANCE}>Maintenance</option>
        </select>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 clay rounded-xl p-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))}
            className="p-1.5 hover:bg-brand-dark-surface-hover rounded-lg text-brand-dark-text-muted"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-brand-dark-text-muted w-10 text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.75, +(z + 0.15).toFixed(2)))}
            className="p-1.5 hover:bg-brand-dark-surface-hover rounded-lg text-brand-dark-text-muted"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 hover:bg-brand-dark-surface-hover rounded-lg text-brand-dark-text-muted"
            title="Reset view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Legend */}
      <motion.div variants={staggerItem} className="flex items-center gap-5 text-xs text-brand-dark-text-muted glass rounded-xl px-4 py-2.5 w-fit flex-wrap">
        <span className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-status-online" />
          Online <b className="text-status-online">{counts.online}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-status-maintenance" />
          Maintenance <b className="text-status-maintenance">{counts.maintenance}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <WifiOff className="w-3.5 h-3.5 text-status-offline" />
          Offline <b className="text-status-offline">{counts.offline}</b>
        </span>
        <span className="flex items-center gap-1.5 text-brand-dark-text-subtle">
          <Layers className="w-3.5 h-3.5 text-accent" />
          Click a node for details
        </span>
      </motion.div>

      {/* Grid */}
      <motion.div variants={staggerItem} className="card overflow-auto">
        {loading ? (
          <div className="h-[480px] grid place-items-center">
            <div className="flex items-center gap-3 text-brand-dark-text-muted">
              <div className="w-5 h-5 rounded-full border-2 border-brand-dark-border-bright border-t-accent animate-spin" />
              Loading spatial layout...
            </div>
          </div>
        ) : (
          <div
            className="min-h-[480px]"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${effectiveLayout.columns}, minmax(${gridNodeSize}px, 1fr))`,
              gridTemplateRows: `repeat(${effectiveLayout.rows}, minmax(${gridNodeSize}px, 1fr))`,
              gap: '1rem',
              padding: '1.5rem',
            }}
          >
            {filteredComputers.map((computer) => {
              const col = Math.min(Math.floor(computer.position_x / gridPositionDivisor), effectiveLayout.columns - 1)
              const row = Math.min(Math.floor(computer.position_y / 140), effectiveLayout.rows - 1)
              return (
                <div
                  key={computer.id}
                  style={{
                    gridColumn: col + 1,
                    gridRow: row + 1,
                    alignSelf: 'center',
                    justifySelf: 'center',
                  }}
                >
                  <ComputerNode
                    computer={computer}
                    latestMetric={metrics[computer.id]}
                    scale={zoom}
                    selected={selectedComputer?.id === computer.id}
                    onSelect={setSelectedComputer}
                  />
                </div>
              )
            })}
            {filteredComputers.length === 0 && (
              <div
                className="text-brand-dark-text-muted text-center"
                style={{ gridColumn: `1 / -1`, gridRow: `1 / -1` }}
              >
                {computers.length === 0
                  ? 'No computers in this lab yet'
                  : 'No computers match your filters'}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Status footer */}
      <motion.div variants={staggerItem}>
        <div className="card-glass flex items-center gap-3 p-4">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent/15 shrink-0">
            <Wifi className="w-4 h-4 text-accent" />
          </span>
          <div>
            <p className="text-sm text-accent font-medium">Online nodes pulse — this view updates live via Supabase Realtime.</p>
            <p className="text-xs text-brand-dark-text-muted mt-0.5">
              {computers.length} computers · {effectiveLayout.rows}×{effectiveLayout.columns} layout
              {searchQuery || filterStatus !== 'all' ? ` · filtered to ${filteredComputers.length}` : ''}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedComputer && (
          <ComputerDetailDrawer
            computer={selectedComputer}
            metric={selectedMetric}
            onClose={() => setSelectedComputer(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
