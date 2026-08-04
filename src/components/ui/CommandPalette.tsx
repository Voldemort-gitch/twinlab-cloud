'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Search, CornerDownLeft, Monitor, LayoutDashboard, Building2, Wrench, BarChart3, Settings, Inbox } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { matchesAnyQuery } from '@/lib/search'
import { useAuth } from '@/hooks/useAuth'

interface ComputerRef {
  id: string
  name: string
  asset_id?: string
  status: string
  labs?: { name: string }[] | null
}

interface NavItem {
  label: string
  href: string
  icon: typeof Monitor
  keywords: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: 'dashboard home overview' },
  { label: 'Labs & Inventory', href: '/dashboard/labs', icon: Building2, keywords: 'labs inventory computers' },
  { label: 'Digital Twin', href: '/dashboard/twin', icon: Monitor, keywords: 'twin spatial grid view' },
  { label: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench, keywords: 'tickets maintenance issues' },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, keywords: 'analytics charts health trends' },
  { label: 'Admin', href: '/dashboard/admin', icon: Settings, keywords: 'admin users labs settings' },
]

type CommandItem = { kind: 'nav' } & NavItem | { kind: 'computer'; id: string; name: string; status: string; lab: string }

export default function CommandPalette() {
  const router = useRouter()
  const { role } = useAuth()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [computers, setComputers] = useState<ComputerRef[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset palette on open
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const load = async () => {
      const { data } = await supabase
        .from('computers')
        .select('id, name, asset_id, status, labs(name)')
        .order('name')
        .limit(40)
      if (data) setComputers(data as ComputerRef[])
    }
    load()
  }, [open])

  const results = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase()
    const availableNav = role === 'admin' ? navItems : navItems.filter((i) => i.href !== '/dashboard/admin')
    const navResults: CommandItem[] = availableNav
      .filter((i) => !q || i.label.toLowerCase().includes(q) || i.keywords.includes(q))
      .map((i) => ({ kind: 'nav' as const, ...i }))
    const compResults: CommandItem[] = q
      ? computers
          .filter((c) => matchesAnyQuery([c.name, c.asset_id, c.labs?.[0]?.name], q))
          .map((c) => ({
            kind: 'computer' as const,
            id: c.id,
            name: c.name,
            status: c.status,
            lab: c.labs?.[0]?.name ?? 'Unknown lab',
          }))
      : []
    return [...navResults, ...compResults]
  }, [query, computers, role])

  const onSelect = (item: CommandItem) => {
    setOpen(false)
    if (item.kind === 'nav') {
      router.push(item.href)
    } else {
      router.push('/dashboard/twin')
    }
  }

  const statusColor = (status: string) =>
    status === 'online' ? 'bg-status-online' : status === 'maintenance' ? 'bg-status-maintenance' : 'bg-status-offline'

  return (
    <>
      {/* Trigger button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2.5 md:px-3 py-2 rounded-xl border border-brand-dark-border bg-brand-dark-surface/70 text-xs text-brand-dark-text-muted hover:text-brand-dark-text hover:border-brand-dark-border-bright transition-colors"
        title="Search (Cmd/Ctrl+K)"
        aria-label="Open search"
      >
        <Search className="w-4 h-4 md:w-3.5 md:h-3.5" />
        <span className="hidden md:inline">Search…</span>
        <kbd className="hidden md:block px-1.5 py-0.5 rounded-md bg-brand-dark-surface-hover border border-brand-dark-border text-[10px] font-mono">
          ⌘K
        </kbd>
      </motion.button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg glass-strong rounded-2xl overflow-hidden shadow-2xl"
              style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(143,99,247,0.1)' }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-brand-dark-border/60">
                <Search className="w-4 h-4 text-brand-dark-text-subtle shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setActiveIdx(0)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setActiveIdx((i) => (results.length === 0 ? 0 : Math.min(i + 1, results.length - 1)))
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setActiveIdx((i) => Math.max(i - 1, 0))
                    } else if (e.key === 'Enter' && results[activeIdx]) {
                      onSelect(results[activeIdx])
                    }
                  }}
                  placeholder="Search pages, computers…"
                  className="flex-1 bg-transparent outline-none text-sm text-brand-dark-text placeholder-brand-dark-text-subtle"
                />
                <kbd className="px-1.5 py-0.5 rounded-md bg-brand-dark-surface-hover border border-brand-dark-border text-[10px] font-mono text-brand-dark-text-subtle">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto p-2">
                {results.length === 0 ? (
                  <p className="text-sm text-brand-dark-text-subtle text-center py-8">No results for “{query}”</p>
                ) : (
                  <ul className="space-y-0.5">
                    {results.map((item, idx) => {
                      const active = idx === activeIdx
                      return (
                        <li key={item.kind === 'nav' ? item.href : item.id}>
                          <button
                            onClick={() => onSelect(item)}
                            onMouseEnter={() => setActiveIdx(idx)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                              active ? 'bg-accent/10 border border-accent/30' : 'border border-transparent'
                            }`}
                          >
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              active ? 'bg-accent/20 text-accent' : 'bg-brand-dark-surface-hover text-brand-dark-text-muted'
                            }`}>
                              {item.kind === 'nav' ? (
                                <item.icon className="w-4 h-4" />
                              ) : (
                                <Monitor className="w-4 h-4" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium truncate">
                                {item.kind === 'nav' ? item.label : item.name}
                              </span>
                              {item.kind === 'computer' && (
                                <span className="flex items-center gap-2 text-xs text-brand-dark-text-subtle">
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusColor(item.status)}`} />
                                  <span className="capitalize">{item.status}</span>
                                  <span>·</span>
                                  <span>{item.lab}</span>
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-brand-dark-text-subtle">
                              {item.kind === 'computer' ? (
                                <Inbox className="w-3.5 h-3.5" />
                              ) : (
                                <CornerDownLeft className="w-3.5 h-3.5" />
                              )}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
