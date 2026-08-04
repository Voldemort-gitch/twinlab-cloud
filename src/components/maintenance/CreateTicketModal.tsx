'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Computer, TicketPriority } from '@/types'
import { X } from 'lucide-react'
import { useDialog } from '@/hooks/useDialog'
import { useToast } from '@/components/ui/Toast'

interface CreateTicketModalProps {
  computers: Pick<Computer, 'id' | 'name' | 'asset_id'>[]
  createdById: string
  onClose: () => void
  onCreated: () => void
}

export default function CreateTicketModal({
  computers,
  createdById,
  onClose,
  onCreated,
}: CreateTicketModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useDialog(true, onClose, closeRef)
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [computerId, setComputerId] = useState('')
  const [category, setCategory] = useState('Hardware')
  const [priority, setPriority] = useState<TicketPriority>(TicketPriority.MEDIUM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!computerId || !title.trim()) {
      setError('Please select a computer and enter a title.')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      const { data, error: insertError } = await supabase
        .from('maintenance_tickets')
        .insert({
          computer_id: computerId,
          title: title.trim(),
          description: description.trim() || null,
          status: 'open',
          priority,
          category,
          assigned_technician_id: null,
          created_by_id: createdById,
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (data) {
        await supabase.from('ticket_history').insert({
          ticket_id: data.id,
          action: 'created',
          changed_by_id: createdById,
          new_value: { title: data.title, priority: data.priority },
        })
      }

      onCreated()
      onClose()
      toast('Ticket created', { variant: 'success' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
      toast('Failed to create ticket', { variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-brand-dark-surface border border-brand-dark-border rounded-xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="New maintenance ticket"
      >
        <div className="sticky top-0 glass px-6 py-4 border-b border-brand-dark-border flex items-center justify-between">
          <h3 className="font-display font-bold">New Maintenance Ticket</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-brand-dark-surface-hover rounded-md text-brand-dark-text-muted"
            aria-label="Close"
            ref={closeRef}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-status-offline/20 border border-status-offline/30 rounded-lg p-3 text-status-offline text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="ticket-computer" className="label">Computer *</label>
            <select
              id="ticket-computer"
              value={computerId}
              onChange={(e) => setComputerId(e.target.value)}
              className="input"
              required
            >
              <option value="">Select a computer...</option>
              {computers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.asset_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ticket-title" className="label">Title *</label>
            <input
              id="ticket-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Replace faulty RAM module"
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="ticket-description" className="label">Description</label>
            <textarea
              id="ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              rows={3}
              className="input resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ticket-category" className="label">Category</label>
              <select
                id="ticket-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input"
              >
                <option>Hardware</option>
                <option>Software</option>
                <option>Network</option>
                <option>OS</option>
              </select>
            </div>
            <div>
              <label htmlFor="ticket-priority" className="label">Priority</label>
              <select
                id="ticket-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="input"
              >
                <option value={TicketPriority.LOW}>Low</option>
                <option value={TicketPriority.MEDIUM}>Medium</option>
                <option value={TicketPriority.HIGH}>High</option>
                <option value={TicketPriority.CRITICAL}>Critical</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
