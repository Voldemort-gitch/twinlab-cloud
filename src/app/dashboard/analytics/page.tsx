'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useRealtime } from '@/hooks/useRealtime'
import { useThrottledCallback } from '@/hooks/useThrottledCallback'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Cpu,
  MemoryStick,
  HardDrive,
  HeartPulse,
  BarChart3,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import CountUp from '@/components/ui/CountUp'
import { staggerContainer, staggerItem, whileHover } from '@/lib/motion'
import { bucketTrendMetrics } from '@/lib/metrics'
import { useToast } from '@/components/ui/Toast'

export const dynamic = 'force-dynamic'

interface TrendPoint {
  label: string
  cpu: number
  ram: number
  disk: number
}

interface LabHealth {
  name: string
  score: number
  computers: number
}

interface FaultData {
  type: string
  count: number
}

interface TicketData {
  status: string
  count: number
}

const COLORS = ['#34D399', '#FBBF24', '#F87171', '#8F63F7', '#A78BFA', '#F472B6']

const tooltipStyle = {
  backgroundColor: 'rgba(19, 23, 34, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  backdropFilter: 'blur(12px)',
  color: '#E6E9F0',
  fontSize: '12px',
}

export default function AnalyticsPage() {
  const { toast } = useToast()
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [labHealth, setLabHealth] = useState<LabHealth[]>([])
  const [faults, setFaults] = useState<FaultData[]>([])
  const [ticketData, setTicketData] = useState<TicketData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | 'all'>('24h')

  const loadAnalytics = useCallback(async () => {
    try {
      const hoursAgo = new Date()
      hoursAgo.setHours(hoursAgo.getHours() - (timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 24 * 60))

      const { data: metrics } = await supabase
        .from('computer_metrics')
        .select('cpu_usage, ram_usage, disk_usage, timestamp')
        .gte('timestamp', hoursAgo.toISOString())
        .order('timestamp', { ascending: false })
        .limit(timeRange === 'all' ? 500 : 200)

      if (metrics && metrics.length > 0) {
        setTrends(
          bucketTrendMetrics(metrics, 24, 1).map((p) => ({
            label: p.timestamp,
            cpu: p.cpu,
            ram: p.ram,
            disk: p.disk,
          }))
        )
      } else {
        setTrends([])
      }

      const { data: labs } = await supabase.from('labs').select('id, name')
      const { data: computers } = await supabase.from('computers').select('id, lab_id, status')
      const { data: latestMetrics } = await supabase
        .from('computer_metrics')
        .select('computer_id, health_score')
        .order('timestamp', { ascending: false })
        .limit(500)

      if (labs && computers && latestMetrics) {
        const latestByComputer: Record<string, number> = {}
        latestMetrics.forEach((m) => {
          if (!(m.computer_id in latestByComputer)) {
            latestByComputer[m.computer_id] = m.health_score
          }
        })

        const health = labs.map((lab) => {
          const labComputers = computers.filter((c) => c.lab_id === lab.id)
          const scores = labComputers
            .map((c) => latestByComputer[c.id])
            .filter((s): s is number => s !== undefined)
          const avgScore =
            scores.length > 0
              ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
              : 0
          return { name: lab.name, score: avgScore, computers: labComputers.length }
        })
        setLabHealth(health)
      }

      const { data: alerts } = await supabase
        .from('alerts')
        .select('alert_type, severity, resolved_at')
        .order('created_at', { ascending: false })
        .limit(500)
      if (alerts) {
        const counts: Record<string, number> = {}
        alerts.forEach((a) => {
          counts[a.alert_type] = (counts[a.alert_type] || 0) + 1
        })
        setFaults(Object.entries(counts).map(([type, count]) => ({ type, count })))
      }

      const { data: tickets } = await supabase
        .from('maintenance_tickets')
        .select('status')
        .limit(500)
      if (tickets) {
        const counts: Record<string, number> = {}
        tickets.forEach((t) => {
          counts[t.status] = (counts[t.status] || 0) + 1
        })
        setTicketData(
          Object.entries(counts).map(([status, count]) => ({ status: status.replace('_', ' '), count }))
        )
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast('Failed to load analytics data', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [timeRange, toast])

  useEffect(() => {
    const run = async () => {
      await loadAnalytics()
    }
    void run()
  }, [loadAnalytics])

  // Analytics data changes slowly, so only refresh on realtime events at most
  // every 30s instead of re-running the full query set on every metric insert.
  const realtimeRefresh = useThrottledCallback(() => {
    loadAnalytics()
  }, 30000)
  useRealtime({ table: 'computer_metrics', onInsert: realtimeRefresh })
  useRealtime({ table: 'alerts', onInsert: realtimeRefresh })

  const avgCurrent = useMemo(() => {
    const last = trends[trends.length - 1]
    return last ? { cpu: last.cpu, ram: last.ram, disk: last.disk } : { cpu: 0, ram: 0, disk: 0 }
  }, [trends])

  const overallFleetHealth = useMemo(() => {
    if (labHealth.length === 0) return 0
    return Math.round(labHealth.reduce((sum, l) => sum + l.score, 0) / labHealth.length)
  }, [labHealth])

  const getTrendIcon = (value: number) => {
    if (value > 75) return <TrendingDown className="w-4 h-4 text-status-offline" />
    if (value > 50) return <Minus className="w-4 h-4 text-status-maintenance" />
    return <TrendingUp className="w-4 h-4 text-status-online" />
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-32">
              <div className="skeleton h-4 w-20 mb-4"></div>
              <div className="skeleton h-9 w-16"></div>
            </div>
          ))}
        </div>
        <div className="card h-80">
          <div className="skeleton h-5 w-48 mb-6"></div>
          <div className="skeleton h-56 w-full"></div>
        </div>
      </div>
    )
  }

  const metricCards = [
    { label: 'Fleet Health', value: overallFleetHealth, suffix: '%', icon: HeartPulse, color: '#C084FC' },
    { label: 'Avg CPU', value: avgCurrent.cpu, suffix: '%', icon: Cpu, color: '#8F63F7' },
    { label: 'Avg RAM', value: avgCurrent.ram, suffix: '%', icon: MemoryStick, color: '#34D399' },
    { label: 'Avg Disk', value: avgCurrent.disk, suffix: '%', icon: HardDrive, color: '#FBBF24' },
  ]

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={staggerItem} className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold mb-1 flex items-center gap-3">
            Analytics <span className="chip">Insights</span>
          </h2>
          <p className="text-brand-dark-text-muted">Fleet health, trends, and performance insights</p>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-1 clay rounded-xl p-1">
          {(['24h', '7d', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                timeRange === r
                  ? 'bg-accent/20 text-accent shadow-glow-sm'
                  : 'text-brand-dark-text-muted hover:bg-brand-dark-surface-hover hover:text-brand-dark-text'
              }`}
            >
              {r === 'all' ? 'All' : r.toUpperCase()}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m, i) => {
          const Icon = m.icon
          return (
            <motion.div key={m.label} variants={staggerItem} whileHover={whileHover}>
              <Card className="h-full">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-brand-dark-text-muted flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: m.color }} /> {m.label}
                  </p>
                  {i === 0 && getTrendIcon(overallFleetHealth)}
                </div>
                <p className="text-4xl font-display font-bold" style={{ color: m.color }}><CountUp value={m.value} suffix={m.suffix} /></p>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Fleet Trends */}
      <motion.div variants={staggerItem}>
        <Card variant="glass">
          <p className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" /> Fleet-wide Resource Trends
          </p>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="gradCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8F63F7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8F63F7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34D399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#8B93A7" tick={{ fontSize: 12 }} />
                <YAxis stroke="#8B93A7" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="cpu" stroke="#8F63F7" fill="url(#gradCpu)" name="CPU %" strokeWidth={2.5} />
                <Area type="monotone" dataKey="ram" stroke="#34D399" fill="url(#gradRam)" name="RAM %" strokeWidth={2.5} />
                <Area type="monotone" dataKey="disk" stroke="#FBBF24" fill="url(#gradDisk)" name="Disk %" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-brand-dark-text-muted">No metric data in this range</div>
          )}
        </Card>
      </motion.div>

      {/* Lab Health + Fault Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={staggerItem}>
          <Card variant="glass" className="h-full">
            <p className="text-lg font-display font-bold mb-4">Lab Health Breakdown</p>
            {labHealth.length > 0 ? (
              <div className="space-y-5">
                {labHealth.map((lab) => {
                  const healthColor =
                    lab.score >= 70 ? '#34D399' : lab.score >= 40 ? '#FBBF24' : '#F87171'
                  return (
                    <div key={lab.name}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium">{lab.name}</span>
                          <span className="text-xs text-brand-dark-text-muted ml-2">{lab.computers} computers</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: healthColor }}>{lab.score}%</span>
                      </div>
                      <div className="w-full bg-brand-dark-surface rounded-full h-2.5 overflow-hidden clay-inset">
                        <motion.div
                          className="h-2.5 rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${healthColor}66, ${healthColor})`,
                            boxShadow: `0 0 10px ${healthColor}66`,
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(lab.score, 100)}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-brand-dark-text-muted">No health data yet</div>
            )}
          </Card>
        </motion.div>

        {/* Fault Distribution */}
        <motion.div variants={staggerItem}>
          <Card variant="clay" className="h-full">
            <p className="text-lg font-display font-bold mb-4">Fault Distribution</p>
            {faults.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={faults}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name }) => String(name)}
                  >
                    {faults.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-brand-dark-text-muted">No alerts recorded</div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Ticket Analytics */}
      <motion.div variants={staggerItem}>
        <Card variant="glass">
          <p className="text-lg font-display font-bold mb-4">Maintenance Ticket Status</p>
          {ticketData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ticketData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="status" stroke="#8B93A7" tick={{ fontSize: 12 }} />
                <YAxis stroke="#8B93A7" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" name="Tickets" radius={[6, 6, 0, 0]}>
                  {ticketData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-brand-dark-text-muted">No maintenance tickets yet</div>
          )}
        </Card>
      </motion.div>

      <motion.div variants={staggerItem}>
        <div className="card-glass flex items-center gap-3 p-4">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent/15 shrink-0">
            <BarChart3 className="w-4 h-4 text-accent" />
          </span>
          <div>
            <p className="text-sm text-accent font-medium">Analytics refresh live via Supabase Realtime</p>
            <p className="text-xs text-brand-dark-text-muted mt-0.5">
              Health scores derived from the latest per-computer metric snapshots.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
