'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useRealtime } from '@/hooks/useRealtime'
import { useThrottledCallback } from '@/hooks/useThrottledCallback'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  Monitor,
  HeartPulse,
  Wrench,
  ArrowRight,
  Activity,
  AlertTriangle,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import CountUp from '@/components/ui/CountUp'
import { staggerContainer, staggerItem, whileHover } from '@/lib/motion'
import { bucketTrendMetrics, TrendPoint } from '@/lib/metrics'
import { useToast } from '@/components/ui/Toast'

export const dynamic = 'force-dynamic'

interface DashboardStats {
  totalLabs: number
  totalComputers: number
  onlineComputers: number
  offlineComputers: number
  maintenanceComputers: number
  overallHealth: number
  healthTrend: 'improving' | 'declining' | 'stable'
}

interface AlertData {
  type: string
  count: number
}

const tooltipStyle = {
  backgroundColor: 'rgba(19, 23, 34, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  backdropFilter: 'blur(12px)',
  fontSize: '12px',
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [loading, setLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    try {
      const { count: labsCount } = await supabase.from('labs').select('*', { count: 'exact', head: true })

      const { data: computers } = await supabase.from('computers').select('status')

      const { data: healthScores } = await supabase
        .from('health_scores')
        .select('overall_score, trend')
        .order('timestamp', { ascending: false })
        .limit(1)

      const { data: metrics } = await supabase
        .from('computer_metrics')
        .select('cpu_usage, ram_usage, disk_usage, timestamp')
        .order('timestamp', { ascending: false })
        .limit(200)

      const { data: allAlerts } = await supabase
        .from('alerts')
        .select('alert_type, severity')
        .order('created_at', { ascending: false })
        .limit(200)

      const computersByStatus = {
        online: computers?.filter((c) => c.status === 'online').length ?? 0,
        offline: computers?.filter((c) => c.status === 'offline').length ?? 0,
        maintenance: computers?.filter((c) => c.status === 'maintenance').length ?? 0,
      }

      const processedTrends = bucketTrendMetrics(metrics ?? [])

      const alertCounts: Record<string, number> = {}
      allAlerts?.forEach((a) => {
        alertCounts[a.alert_type] = (alertCounts[a.alert_type] || 0) + 1
      })
      const processedAlerts = Object.entries(alertCounts).map(([type, count]) => ({ type, count }))

      setStats({
        totalLabs: labsCount ?? 0,
        totalComputers: computers?.length ?? 0,
        onlineComputers: computersByStatus.online,
        offlineComputers: computersByStatus.offline,
        maintenanceComputers: computersByStatus.maintenance,
        overallHealth: healthScores?.[0]?.overall_score ?? 100,
        healthTrend: healthScores?.[0]?.trend ?? 'stable',
      })

      setTrends(processedTrends)
      setAlerts(processedAlerts)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast('Failed to load dashboard data', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const realtimeRefresh = useThrottledCallback(() => {
    loadDashboardData()
  }, 3000)

  useRealtime({ table: 'computers', onUpdate: realtimeRefresh })
  useRealtime({ table: 'computer_metrics', onInsert: realtimeRefresh })
  useRealtime({ table: 'alerts', onInsert: realtimeRefresh })

  useEffect(() => {
    const refresh = async () => {
      await loadDashboardData()
    }
    void refresh()
    const interval = setInterval(() => {
      void refresh()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadDashboardData])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-status-online" />
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-status-offline" />
      default:
        return <Minus className="w-4 h-4 text-brand-dark-text-muted" />
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card h-36">
            <div className="skeleton h-4 w-24 mb-4"></div>
            <div className="skeleton h-9 w-20 mb-3"></div>
            <div className="skeleton h-3 w-32"></div>
          </div>
        ))}
      </div>
    )
  }

  const onlinePct = stats?.totalComputers ? Math.round((stats.onlineComputers / stats.totalComputers) * 100) : 0

  const statCards = [
    {
      label: 'Total Labs',
      value: stats?.totalLabs ?? 0,
      sub: `${stats?.totalComputers ?? 0} computers`,
      icon: Building2,
      color: '#8F63F7',
      className: '',
    },
    {
      label: 'Online',
      value: stats?.onlineComputers ?? 0,
      sub: `${onlinePct}% online`,
      icon: Monitor,
      color: '#34D399',
      className: '',
    },
    {
      label: 'Overall Health',
      value: stats?.overallHealth ?? 0,
      suffix: '%',
      sub: stats?.healthTrend ?? 'stable',
      icon: HeartPulse,
      color: '#C084FC',
      className: '',
    },
    {
      label: 'Maintenance',
      value: stats?.maintenanceComputers ?? 0,
      sub: `${stats?.offlineComputers ?? 0} offline`,
      icon: Wrench,
      color: '#FBBF24',
      className: '',
    },
  ]

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Hero banner */}
      <motion.div variants={staggerItem} className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(143,99,247,0.16), rgba(167,139,250,0.10) 45%, rgba(19,23,34,0.6))',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.35), 0 0 60px rgba(143,99,247,0.14)',
        }}
      >
        <div className="orb w-48 h-48 top-[-40%] right-[5%]" style={{ background: 'rgba(143,99,247,0.5)' }} />
        <div className="orb w-40 h-40 bottom-[-60%] left-[30%]" style={{ background: 'rgba(167,139,250,0.4)' }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent/80 font-semibold mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-status-online animate-pulse" />
              Live Fleet Overview
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold">
              Welcome back,{' '}
              <span className="text-gradient-accent">{profile?.full_name || 'User'}</span>
            </h2>
            <p className="text-brand-dark-text-muted mt-1.5 text-sm">
              {stats?.onlineComputers} systems online · {stats?.overallHealth}% fleet health · syncing in real time
            </p>
          </div>
          <a
            href="/dashboard/twin"
            className="btn btn-primary self-start sm:self-auto"
          >
            Open Digital Twin <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} variants={staggerItem} whileHover={whileHover}>
              <Card className="h-full">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-brand-dark-text-muted text-sm">{s.label}</p>
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: `${s.color}14`,
                      boxShadow: `0 0 16px ${s.color}33, inset 0 0 0 1px ${s.color}26`,
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: s.color }} />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-4xl font-display font-bold" style={{ color: s.color }}>
                    <CountUp value={s.value} suffix={s.suffix || ''} />
                  </p>
                  {s.label === 'Online' && <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute h-full w-full rounded-full bg-status-online opacity-60" /><span className="relative h-2.5 w-2.5 rounded-full bg-status-online" /></span>}
                </div>
                <p className="text-xs text-brand-dark-text-muted mt-2 capitalize flex items-center gap-1.5">
                  {getTrendIcon(stats?.healthTrend || 'stable')} {s.sub}
                </p>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={staggerItem}>
          <Card variant="glass" className="h-full">
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-display font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" /> Fleet Resource Trends
              </p>
              <span className="chip">Live</span>
            </div>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="timestamp" stroke="#8B93A7" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#8B93A7" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#E6E9F0' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="cpu" stroke="#8F63F7" name="CPU %" dot={false} strokeWidth={2.5} />
                  <Line type="monotone" dataKey="ram" stroke="#34D399" name="RAM %" dot={false} strokeWidth={2.5} />
                  <Line type="monotone" dataKey="disk" stroke="#FBBF24" name="Disk %" dot={false} strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-brand-dark-text-muted">No data available</div>
            )}
          </Card>
        </motion.div>

        {/* Status Breakdown */}
        <motion.div variants={staggerItem}>
          <Card variant="glass" className="h-full">
            <p className="text-lg font-display font-bold mb-6">Status Distribution</p>
            <div className="space-y-5">
              {[
                { label: 'Online', value: stats?.onlineComputers ?? 0, color: '#34D399', glow: '' },
                { label: 'Maintenance', value: stats?.maintenanceComputers ?? 0, color: '#FBBF24', glow: '' },
                { label: 'Offline', value: stats?.offlineComputers ?? 0, color: '#F87171', glow: '' },
              ].map((row) => {
                const pct = stats?.totalComputers ? (row.value / stats.totalComputers) * 100 : 0
                return (
                  <div key={row.label}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${row.glow}`} style={{ background: row.color, boxShadow: `0 0 8px ${row.color}` }} />
                        <span className="text-sm text-brand-dark-text-muted">{row.label}</span>
                      </div>
                      <span className="font-bold text-sm" style={{ color: row.color }}>{row.value}</span>
                    </div>
                    <div className="w-full bg-brand-dark-surface rounded-full h-2 overflow-hidden clay-inset">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${row.color}66, ${row.color})`, boxShadow: `0 0 10px ${row.color}66` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card variant="clay">
            <p className="text-lg font-display font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-status-maintenance" /> Alert Distribution
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={alerts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="type" stroke="#8B93A7" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#8B93A7" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#E6E9F0' }} />
                <Bar dataKey="count" fill="#8F63F7" name="Count" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      )}

      {/* Footer Note */}
      <motion.div variants={staggerItem}>
        <div className="card-glass flex items-center gap-3 p-4" style={{ boxShadow: '0 0 24px rgba(143,99,247,0.18)' }}>
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent/15">
            <Activity className="w-4 h-4 text-accent" />
          </span>
          <div>
            <p className="text-sm text-accent font-medium">Live dashboard — updates via Supabase Realtime</p>
            <p className="text-xs text-brand-dark-text-muted mt-0.5">
              Explore the Digital Twin view for spatial computer monitoring.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
