'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

type ConnectionState = 'checking' | 'connected' | 'degraded' | 'offline'

const SIM_URL = process.env.NEXT_PUBLIC_SIMULATION_SERVICE_URL || 'http://localhost:3001'
const SIM_TOKEN = process.env.NEXT_PUBLIC_SIMULATION_SERVICE_TOKEN || ''

const simHeaders: Record<string, string> = SIM_TOKEN
  ? { Authorization: `Bearer ${SIM_TOKEN}` }
  : {}

export default function LiveConnection() {
  const [state, setState] = useState<ConnectionState>('checking')

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        const res = await fetch(`${SIM_URL}/health`, { signal: controller.signal, headers: simHeaders })
        clearTimeout(timeoutId)
        if (cancelled) return
        if (res.ok) setState('connected')
        else setState('degraded')
      } catch {
        if (!cancelled) setState('offline')
      }
    }

    check()
    const timer = setInterval(check, 15000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const config = {
    checking: { label: 'Checking', dot: 'bg-brand-dark-text-muted', Icon: Loader2, pulse: true },
    connected: { label: 'Live', dot: 'bg-status-online', Icon: Wifi, pulse: true },
    degraded: { label: 'Degraded', dot: 'bg-status-maintenance', Icon: Wifi, pulse: true },
    offline: { label: 'Offline', dot: 'bg-status-offline', Icon: WifiOff, pulse: false },
  }[state]

  const { label, dot, Icon, pulse } = config

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-dark-border bg-brand-dark-surface/70 text-xs font-medium text-brand-dark-text-muted"
      title={`Simulation service: ${label}`}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        {pulse && state !== 'checking' && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${dot} opacity-60 animate-ping`} />
        )}
        {state === 'checking' ? (
          <Loader2 className={`w-2 h-2 ${dot} animate-spin`} />
        ) : (
          <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
        )}
      </span>
      <Icon className="w-3.5 h-3.5" />
      <span className="capitalize">{label}</span>
    </motion.div>
  )
}
