'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { MaintenanceTicket, TicketHistory, TicketStatus, UserProfile, UserRole } from '@/types'
import {
  getTicketStatusBadgeClass,
  getTicketStatusLabel,
  getTicketPriorityColor,
  getTicketPriorityLabel,
  getNextTicketStatus,
  formatDateTime,
} from '@/lib/utils'
import { X, ArrowRight, Clock } from 'lucide-react'
import { useDialog } from '@/hooks/useDialog'
import { useToast } from '@/components/ui/Toast'

interface TicketDetailDrawerProps {
  ticket: MaintenanceTicket
  computerName: string
  history: TicketHistory[]
  technicians: UserProfile[]
  currentProfile: UserProfile | null
  onClose: () => void
  onUpdated: () => void
}

const statusLabels: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Open',
  [TicketStatus.ASSIGNED]: 'Assigned',
  [TicketStatus.IN_PROGRESS]: 'In Progress',
  [TicketStatus.RESOLVED]: 'Resolved',
  [TicketStatus.CLOSED]: 'Closed',
}

export default function TicketDetailDrawer({
  ticket,
  computerName,
  history,
  technicians,
  currentProfile,
  onClose,
  onUpdated,
}: TicketDetailDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useDialog(true, onClose, closeRef)
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState(ticket.notes ?? '')
  const [assignTo, setAssignTo] = useState(ticket.assigned_technician_id ?? '')

  const canManage = currentProfile?.role === UserRole.ADMIN
  const isAssignedTechnician =
    currentProfile?.role === UserRole.TECHNICIAN &&
    ticket.assigned_technician_id === currentProfile.id
  const canUpdate = canManage || isAssignedTechnician
  const nextStatus = getNextTicketStatus(ticket.status)

  const recordHistory = async (
    ticketId: string,
    action: string,
    newValue: Record<string, unknown>
  ) => {
    await supabase.from('ticket_history').insert({
      ticket_id: ticketId,
      action,
      changed_by_id: currentProfile?.id ?? null,
      new_value: newValue,
    })
  }

  const advanceStatus = async () => {
    if (!nextStatus) return
    setSubmitting(true)
    try {
      const isResolved = nextStatus === TicketStatus.RESOLVED
      const { error } = await supabase
        .from('maintenance_tickets')
        .update({
          status: nextStatus,
          resolved_at: isResolved ? new Date().toISOString() : null,
        })
        .eq('id', ticket.id)

      if (error) throw error
      await recordHistory(ticket.id, `status: ${ticket.status} → ${nextStatus}`, {
        status: nextStatus,
      })
      onUpdated()
      toast(`Ticket moved to ${getTicketStatusLabel(nextStatus)}`, { variant: 'success' })
    } catch (err) {
      console.error('Failed to update status:', err)
      toast('Failed to update ticket status', { variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const assignTechnician = async () => {
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('maintenance_tickets')
        .update({ assigned_technician_id: assignTo || null })
        .eq('id', ticket.id)

      if (error) throw error
      await recordHistory(ticket.id, assignTo ? 'assigned' : 'unassigned', {
        assigned_technician_id: assignTo || null,
      })
      onUpdated()
      toast(assignTo ? 'Technician assigned' : 'Ticket unassigned', { variant: 'success' })
    } catch (err) {
      console.error('Failed to assign:', err)
      toast('Failed to assign technician', { variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const saveNotes = async () => {
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('maintenance_tickets')
        .update({ notes })
        .eq('id', ticket.id)

      if (error) throw error
      await recordHistory(ticket.id, 'notes updated', { notes })
      onUpdated()
      toast('Notes saved', { variant: 'success' })
    } catch (err) {
      console.error('Failed to save notes:', err)
      toast('Failed to save notes', { variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-md h-full bg-brand-dark-surface border-l border-brand-dark-border shadow-2xl animate-slide-in-right overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={`${ticket.title} ticket details`}
      >
        {/* Header */}
        <div className="sticky top-0 glass border-b border-brand-dark-border px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`status-badge ${getTicketStatusBadgeClass(ticket.status)} text-xs`}>
                  {getTicketStatusLabel(ticket.status)}
                </span>
                <span className={`text-xs font-bold ${getTicketPriorityColor(ticket.priority)}`}>
                  {getTicketPriorityLabel(ticket.priority)}
                </span>
              </div>
              <h3 className="font-display text-lg font-bold leading-snug">{ticket.title}</h3>
              <p className="text-xs text-brand-dark-text-muted mt-1">
                {computerName} · {ticket.category}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-brand-dark-surface-hover rounded-lg text-brand-dark-text-muted shrink-0"
              aria-label="Close"
              ref={closeRef}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          {ticket.description && (
            <div>
              <p className="text-sm font-semibold text-brand-dark-text-muted mb-2">Description</p>
              <p className="text-sm leading-relaxed">{ticket.description}</p>
            </div>
          )}

          {/* Workflow */}
          {canUpdate && nextStatus && (
            <div className="card border border-accent/20 bg-accent/5 !p-4">
              <p className="text-sm font-semibold text-brand-dark-text-muted mb-3">
                Workflow
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="status-badge status-badge-in_progress text-xs">
                  {getTicketStatusLabel(ticket.status)}
                </span>
                <ArrowRight className="w-4 h-4 text-brand-dark-text-muted" />
                <span className="status-badge status-badge-resolved text-xs">
                  {statusLabels[nextStatus]}
                </span>
              </div>
              <button
                onClick={advanceStatus}
                disabled={submitting}
                className="mt-3 w-full btn btn-primary text-sm"
              >
                {submitting
                  ? 'Updating...'
                  : nextStatus === TicketStatus.RESOLVED
                    ? 'Mark as Resolved'
                    : `Move to ${statusLabels[nextStatus]}`}
              </button>
            </div>
          )}

          {/* Assign technician */}
          {canManage && (
            <div>
              <p className="text-sm font-semibold text-brand-dark-text-muted mb-2">
                Assigned Technician
              </p>
              <div className="flex gap-2">
                <select
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                  className="input"
                >
                  <option value="">Unassigned</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name || t.email}
                    </option>
                  ))}
                </select>
                <button
                  onClick={assignTechnician}
                  disabled={submitting}
                  className="btn btn-secondary shrink-0"
                >
                  Assign
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          {canUpdate && (
            <div>
              <p className="text-sm font-semibold text-brand-dark-text-muted mb-2">Notes</p>
              <div className="flex gap-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="input resize-y"
                  placeholder="Add internal notes..."
                />
                <button
                  onClick={saveNotes}
                  disabled={submitting}
                  className="btn btn-secondary shrink-0"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Details */}
          <div>
            <p className="text-sm font-semibold text-brand-dark-text-muted mb-3">Details</p>
            <div className="space-y-2 text-sm">
              <Row label="Created" value={formatDateTime(ticket.created_at)} />
              <Row label="Updated" value={formatDateTime(ticket.updated_at)} />
              <Row
                label="Resolved"
                value={ticket.resolved_at ? formatDateTime(ticket.resolved_at) : '—'}
              />
              <Row label="Priority" value={getTicketPriorityLabel(ticket.priority)} />
            </div>
          </div>

          {/* History */}
          <div>
            <p className="text-sm font-semibold text-brand-dark-text-muted mb-3">History</p>
            {history.length === 0 ? (
              <p className="text-sm text-brand-dark-text-muted">No history recorded.</p>
            ) : (
              <div className="space-y-4">
                {history.map((h) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-accent mt-1.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{h.action}</p>
                      <p className="text-xs text-brand-dark-text-muted flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(h.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-brand-dark-text-muted">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}
