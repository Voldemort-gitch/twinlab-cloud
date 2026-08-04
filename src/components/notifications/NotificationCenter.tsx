'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  Monitor,
  Inbox,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRealtime } from '@/hooks/useRealtime'
import { springGentle } from '@/lib/motion'
import { formatDateTime } from '@/lib/utils'

interface NotificationAlert {
  id: string
  computer_id: string
  alert_type: string
  severity: string
  message: string
  resolved_at: string | null
  created_at: string
  computers?: { name: string }[] | null
}

const severityStyles: Record<string, { icon: typeof Info; dot: string; text: string; bg: string }> = {
  critical: {
    icon: AlertOctagon,
    dot: 'bg-status-offline',
    text: 'text-status-offline',
    bg: 'bg-status-offline/10',
  },
  warning: {
    icon: AlertTriangle,
    dot: 'bg-status-maintenance',
    text: 'text-status-maintenance',
    bg: 'bg-status-maintenance/10',
  },
  info: {
    icon: Info,
    dot: 'bg-info',
    text: 'text-info',
    bg: 'bg-info/10',
  },
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<NotificationAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const panelRef = useRef<HTMLDivElement>(null)

  const loadAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*, computers(name)')
        .order('created_at', { ascending: false })
        .limit(30)
      if (!error && data) setAlerts(data as NotificationAlert[])
    } catch (err) {
      console.error('Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    loadAlerts()
  }, [loadAlerts])

  useRealtime({
    table: 'alerts',
    onInsert: (record) => {
      const r = record as unknown as NotificationAlert
      setAlerts((prev) => [r, ...prev].slice(0, 30))
    },
    onUpdate: (record) => {
      const r = record as unknown as NotificationAlert
      setAlerts((prev) => prev.map((a) => (a.id === r.id ? r : a)))
    },
    onDelete: (record) => {
      const r = record as unknown as NotificationAlert
      setAlerts((prev) => prev.filter((a) => a.id !== r.id))
    },
  })

  // Close on outside click / Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const unread = alerts.filter(
    (a) => !a.resolved_at && !readIds.has(a.id)
  )
  const unreadCount = unread.length

  const markAllRead = () => {
    setReadIds((prev) => new Set([...prev, ...unread.map((a) => a.id)]))
  }

  const markRead = (id: string) => {
    setReadIds((prev) => new Set(prev).add(id))
  }

  const stylesFor = (severity: string) =>
    severityStyles[severity] ?? severityStyles.info

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(!open)}
        className="p-2.5 clay rounded-xl text-brand-dark-text-muted hover:text-brand-dark-text transition-colors relative"
        title="Notifications"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-accent" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={springGentle}
              className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-status-offline text-white text-[10px] font-bold flex items-center justify-center"
              style={{ boxShadow: '0 0 10px rgba(248,113,113,0.5)' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={springGentle}
            className="absolute right-0 mt-3 w-80 sm:w-96 glass-strong rounded-2xl overflow-hidden z-50"
            style={{ boxShadow: 'var(--shadow-glass-2), 0 20px 50px rgba(0,0,0,0.5)' }}
            role="dialog"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-dark-border/60">
              <div>
                <h3 className="font-display font-bold text-sm">Notifications</h3>
                <p className="text-[11px] text-brand-dark-text-subtle">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'You\'re all caught up'}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Body */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 skeleton rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 skeleton w-3/4" />
                        <div className="h-2.5 skeleton w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl clay flex items-center justify-center mb-3">
                    <Inbox className="w-5 h-5 text-brand-dark-text-subtle" />
                  </div>
                  <p className="text-sm text-brand-dark-text-muted">No notifications yet</p>
                  <p className="text-xs text-brand-dark-text-subtle mt-1">Alerts from your fleet will appear here</p>
                </div>
              ) : (
                <ul className="divide-y divide-brand-dark-border/50">
                  {alerts.map((alert) => {
                    const s = stylesFor(alert.severity)
                    const Icon = s.icon
                    const isUnread = !alert.resolved_at && !readIds.has(alert.id)
                    return (
                      <li key={alert.id}>
                        <button
                          onClick={() => markRead(alert.id)}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-brand-dark-surface-hover/60 ${
                            isUnread ? 'bg-accent/[0.04]' : ''
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}
                          >
                            <Icon className={`w-4 h-4 ${s.text}`} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className={`text-xs font-semibold truncate ${s.text}`}>
                                {alert.alert_type}
                              </span>
                              {isUnread && (
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                              )}
                            </span>
                            <span className="block text-sm text-brand-dark-text truncate mt-0.5">
                              {alert.message}
                            </span>
                            <span className="flex items-center gap-1.5 mt-1 text-[11px] text-brand-dark-text-subtle">
                              <Monitor className="w-3 h-3 shrink-0" />
                              <span className="truncate">
                                {alert.computers?.[0]?.name ?? 'Unknown computer'}
                              </span>
                              <span className="shrink-0">·</span>
                              <span className="shrink-0">{formatDateTime(alert.created_at)}</span>
                            </span>
                          </span>
                          {!alert.resolved_at && (
                            <span className="shrink-0 mt-0.5 p-1.5 rounded-lg text-brand-dark-text-subtle hover:text-status-online hover:bg-status-online/10 transition-colors">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
