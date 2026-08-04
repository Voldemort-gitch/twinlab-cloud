'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useRealtime } from '@/hooks/useRealtime'
import {
  MaintenanceTicket,
  TicketHistory,
  TicketStatus,
  TicketPriority,
  Computer,
  UserProfile,
  UserRole,
} from '@/types'
import {
  getTicketStatusBadgeClass,
  getTicketStatusLabel,
  getTicketPriorityColor,
  getTicketPriorityLabel,
  formatDateTime,
} from '@/lib/utils'
import CreateTicketModal from '@/components/maintenance/CreateTicketModal'
import TicketDetailDrawer from '@/components/maintenance/TicketDetailDrawer'
import { staggerContainer, staggerItem, whileHover } from '@/lib/motion'
import { matchesAnyQuery } from '@/lib/search'
import { Plus, Filter, Wrench, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import EmptyState from '@/components/ui/EmptyState'
import SearchInput from '@/components/ui/SearchInput'

export const dynamic = 'force-dynamic'

export default function MaintenancePage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [computers, setComputers] = useState<Pick<Computer, 'id' | 'name' | 'asset_id'>[]>([])
  const [computerNames, setComputerNames] = useState<Record<string, string>>({})
  const [technicians, setTechnicians] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null)
  const [selectedHistory, setSelectedHistory] = useState<TicketHistory[]>([])

  const loadTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setTickets(data || [])
    } catch (err) {
      console.error('Error loading tickets:', err)
      toast('Failed to load tickets', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    const run = async () => {
      await loadTickets()
    }
    void run()
  }, [loadTickets])

  // Load reference data (computers + profiles)
  useEffect(() => {
    const loadReference = async () => {
      const [compsResult, profilesResult] = await Promise.all([
        supabase.from('computers').select('id, name, asset_id'),
        supabase.from('user_profiles').select('*'),
      ])

      if (compsResult.data) {
        setComputers(compsResult.data)
        const map: Record<string, string> = {}
        compsResult.data.forEach((c) => (map[c.id] = c.name))
        setComputerNames(map)
      }

      if (profilesResult.data) {
        const techs = profilesResult.data.filter(
          (p) => p.role === UserRole.TECHNICIAN || p.role === UserRole.ADMIN
        )
        setTechnicians(techs)
      }
    }
    loadReference()
  }, [])

  // Realtime refresh
  const realtimeRefresh = useCallback(() => {
    loadTickets()
  }, [loadTickets])

  useRealtime({ table: 'maintenance_tickets', onInsert: realtimeRefresh })
  useRealtime({ table: 'maintenance_tickets', onUpdate: realtimeRefresh })

  // Load history when a ticket is selected
  const openTicket = useCallback(async (ticket: MaintenanceTicket) => {
    setSelectedTicket(ticket)
    const { data } = await supabase
      .from('ticket_history')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: false })
    setSelectedHistory(data || [])
  }, [])

  // Keep the open drawer in sync with realtime ticket updates
  useEffect(() => {
    if (!selectedTicket) return
    const fresh = tickets.find((t) => t.id === selectedTicket.id)
    if (fresh && fresh !== selectedTicket) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync drawer to live data
      setSelectedTicket(fresh)
    }
  }, [tickets, selectedTicket])

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesSearch = matchesAnyQuery(
        [t.title, computerNames[t.computer_id], t.description, t.category],
        searchQuery
      )
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus
      const matchesPriority = filterPriority === 'all' || t.priority === filterPriority
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [tickets, searchQuery, filterStatus, filterPriority, computerNames])

  const stats = useMemo(() => {
    return {
      open: tickets.filter((t) => t.status === TicketStatus.OPEN).length,
      inProgress: tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length,
      resolved: tickets.filter((t) => t.status === TicketStatus.RESOLVED).length,
      critical: tickets.filter((t) => t.priority === TicketPriority.CRITICAL).length,
    }
  }, [tickets])

  const isAdmin = profile?.role === UserRole.ADMIN

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={staggerItem} className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold mb-1 flex items-center gap-3">
            Maintenance <span className="chip">Tickets</span>
          </h2>
          <p className="text-brand-dark-text-muted">Ticket management and issue tracking</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Wrench className="w-5 h-5 text-accent" />}
          label="Open"
          value={stats.open}
          accent="text-accent"
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-status-maintenance" />}
          label="In Progress"
          value={stats.inProgress}
          accent="text-status-maintenance"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-status-online" />}
          label="Resolved"
          value={stats.resolved}
          accent="text-status-online"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-status-offline" />}
          label="Critical"
          value={stats.critical}
          accent="text-status-offline"
        />
      </div>

      {/* Filters */}
      <motion.div variants={staggerItem} className="flex gap-4 flex-wrap">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by title, computer, or description..."
          className="flex-1 min-w-[240px]"
        />

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-dark-text-muted" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input !w-auto"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            {Object.values(TicketStatus).map((s) => (
              <option key={s} value={s}>
                {getTicketStatusLabel(s)}
              </option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="input !w-auto"
            aria-label="Filter by priority"
          >
            <option value="all">All Priorities</option>
            {Object.values(TicketPriority).map((p) => (
              <option key={p} value={p}>
                {getTicketPriorityLabel(p)}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Ticket List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-36">
              <div className="skeleton h-4 w-24 mb-3"></div>
              <div className="skeleton h-5 w-2/3 mb-3"></div>
              <div className="skeleton h-3 w-full"></div>
            </div>
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <motion.div variants={staggerItem}>
          <EmptyState
            title="No tickets found"
            description={
              isAdmin
                ? 'Create your first maintenance ticket to get started'
                : 'There are no tickets matching your filters'
            }
            icon={Wrench}
          />
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map((ticket) => (
            <motion.div key={ticket.id} variants={staggerItem} whileHover={whileHover}>
              <button
                onClick={() => openTicket(ticket)}
                className="card text-left w-full hover:border-accent/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className={`status-badge ${getTicketStatusBadgeClass(ticket.status)} text-xs`}>
                    {getTicketStatusLabel(ticket.status)}
                  </span>
                  <span className={`text-xs font-bold ${getTicketPriorityColor(ticket.priority)}`}>
                    {getTicketPriorityLabel(ticket.priority)}
                  </span>
                </div>
                <h3 className="font-display font-bold mb-1 leading-snug">{ticket.title}</h3>
                <p className="text-xs text-brand-dark-text-muted mb-3">
                  {computerNames[ticket.computer_id] ?? 'Unknown computer'} · {ticket.category}
                </p>
                <div className="flex items-center justify-between text-xs text-brand-dark-text-muted">
                  <span>{formatDateTime(ticket.updated_at)}</span>
                  <span className="font-mono">{ticket.id.slice(0, 8)}</span>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateTicketModal
          computers={computers}
          createdById={profile?.id ?? ''}
          onClose={() => setShowCreate(false)}
          onCreated={loadTickets}
        />
      )}

      {/* Detail drawer */}
      {selectedTicket && (
        <TicketDetailDrawer
          ticket={selectedTicket}
          computerName={computerNames[selectedTicket.computer_id] ?? 'Unknown computer'}
          history={selectedHistory}
          technicians={technicians}
          currentProfile={profile}
          onClose={() => setSelectedTicket(null)}
          onUpdated={() => {
            loadTickets()
            if (selectedTicket) openTicket(selectedTicket)
          }}
        />
      )}
    </motion.div>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent: string
}) {
  return (
    <motion.div variants={staggerItem} whileHover={whileHover}>
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-sm text-brand-dark-text-muted">{label}</span>
        </div>
        <p className={`text-3xl font-display font-bold ${accent}`}>{value}</p>
      </div>
    </motion.div>
  )
}
