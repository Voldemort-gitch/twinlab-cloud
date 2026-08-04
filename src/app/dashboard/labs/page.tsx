'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Computer, Lab } from '@/types'
import { getStatusBadgeClass, getStatusLabel } from '@/lib/utils'
import { matchesAnyQuery } from '@/lib/search'
import { Filter, Plus, ChevronDown, Building2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import EmptyState from '@/components/ui/EmptyState'
import SearchInput from '@/components/ui/SearchInput'

export const dynamic = 'force-dynamic'

export default function LabsPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [labs, setLabs] = useState<Lab[]>([])
  const [expandedLab, setExpandedLab] = useState<string | null>(null)
  const [computersByLab, setComputersByLab] = useState<Record<string, Computer[]>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const loadLabsAndComputers = async () => {
    try {
      // Load labs
      const { data: labsData, error: labsError } = await supabase
        .from('labs')
        .select('*')
        .order('name')

      if (labsError) throw labsError

      setLabs(labsData || [])

      // Load computers grouped by lab
      const { data: computersData, error: computersError } = await supabase
        .from('computers')
        .select('*')
        .order('name')

      if (computersError) throw computersError

      const grouped: Record<string, Computer[]> = {}
      computersData?.forEach((computer) => {
        if (!grouped[computer.lab_id]) {
          grouped[computer.lab_id] = []
        }
        grouped[computer.lab_id].push(computer)
      })

      setComputersByLab(grouped)
    } catch (error) {
      console.error('Error loading labs:', error)
      toast('Failed to load labs', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    loadLabsAndComputers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getFilteredComputers = (computers: Computer[]) => {
    return computers.filter((computer) => {
      const matchesSearch = matchesAnyQuery(
        [computer.name, computer.asset_id, computer.ip_address, computer.os, computer.cpu],
        searchQuery
      )

      const matchesStatus = filterStatus === 'all' || computer.status === filterStatus

      return matchesSearch && matchesStatus
    })
  }

  useEffect(() => {
    if (!searchQuery.trim()) return
    const hasMatch = (lab: Lab) => {
      const computers = computersByLab[lab.id] || []
      return computers.some((computer) => {
        const matchesSearch = matchesAnyQuery(
          [computer.name, computer.asset_id, computer.ip_address, computer.os, computer.cpu],
          searchQuery
        )
        const matchesStatus = filterStatus === 'all' || computer.status === filterStatus
        return matchesSearch && matchesStatus
      })
    }
    const firstMatch = labs.find(hasMatch)
    if (firstMatch && expandedLab !== firstMatch.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal matches when searching
      setExpandedLab(firstMatch.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, labs, computersByLab, filterStatus])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-brand-dark-surface rounded w-32 animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-40 animate-pulse">
              <div className="h-6 bg-brand-dark-surface-hover rounded mb-3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-brand-dark-surface-hover rounded w-3/4"></div>
                <div className="h-4 bg-brand-dark-surface-hover rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-bold mb-2">Labs & Inventory</h2>
        <p className="text-brand-dark-text-muted">Manage computer labs and monitor assets</p>
      </div>

      {/* Controls */}
      <div className="flex gap-4 flex-wrap">
        {/* Search */}
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, asset ID, IP, or OS..."
          className="flex-1 min-w-[250px]"
        />

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-dark-text-muted" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input" aria-label="Filter by status">
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        {/* Add Lab Button */}
        {profile?.role === 'admin' && (
          <button className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Lab
          </button>
        )}
      </div>

      {/* Labs List */}
      <div className="space-y-4">
        {labs.length === 0 ? (
          <EmptyState
            title="No labs found"
            description="Get started by adding your first lab"
            icon={Building2}
          />
        ) : (
          labs.map((lab) => {
            const computers = computersByLab[lab.id] || []
            const filteredComputers = getFilteredComputers(computers)
            const isExpanded = expandedLab === lab.id

            return (
              <div key={lab.id} className="card">
                {/* Lab Header */}
                <button
                  onClick={() => setExpandedLab(isExpanded ? null : lab.id)}
                  className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-4 flex-1 text-left">
                    <ChevronDown
                      className={`w-5 h-5 text-brand-dark-text-muted transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                    <div>
                      <h3 className="text-lg font-display font-bold">{lab.name}</h3>
                      <p className="text-xs text-brand-dark-text-muted">{lab.location || 'No location'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold">{computers.length} computers</p>
                      <p className="text-xs text-brand-dark-text-muted">
                        {computers.filter((c) => c.status === 'online').length} online
                      </p>
                    </div>
                  </div>
                </button>

                {/* Expanded Computer List */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-brand-dark-border">
                    {filteredComputers.length === 0 ? (
                      <p className="text-sm text-brand-dark-text-muted py-4">No computers match your filters</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-brand-dark-border">
                              <th className="text-left py-2 px-3 font-semibold text-brand-dark-text-muted">Asset ID</th>
                              <th className="text-left py-2 px-3 font-semibold text-brand-dark-text-muted">Name</th>
                              <th className="text-left py-2 px-3 font-semibold text-brand-dark-text-muted">CPU</th>
                              <th className="text-left py-2 px-3 font-semibold text-brand-dark-text-muted">RAM</th>
                              <th className="text-left py-2 px-3 font-semibold text-brand-dark-text-muted">Storage</th>
                              <th className="text-left py-2 px-3 font-semibold text-brand-dark-text-muted">IP Address</th>
                              <th className="text-left py-2 px-3 font-semibold text-brand-dark-text-muted">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredComputers.map((computer) => (
                              <tr key={computer.id} className="border-b border-brand-dark-border hover:bg-brand-dark-surface-hover transition-colors">
                                <td className="py-3 px-3">
                                  <code className="text-mono bg-brand-dark-surface px-2 py-1 rounded text-xs">
                                    {computer.asset_id}
                                  </code>
                                </td>
                                <td className="py-3 px-3">{computer.name}</td>
                                <td className="py-3 px-3 text-xs text-brand-dark-text-muted">{computer.cpu || '—'}</td>
                                <td className="py-3 px-3 text-xs">{computer.ram_gb}GB</td>
                                <td className="py-3 px-3 text-xs">{computer.storage_gb}GB</td>
                                <td className="py-3 px-3 text-mono text-xs bg-brand-dark-surface px-2 py-1 rounded">
                                  {computer.ip_address}
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`status-badge ${getStatusBadgeClass(computer.status)} text-xs`}>
                                    {getStatusLabel(computer.status)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border border-accent/20 bg-accent/5">
          <p className="text-sm text-brand-dark-text-muted mb-2">Total Computers</p>
          <p className="text-3xl font-display font-bold">
            {Object.values(computersByLab).flat().length}
          </p>
        </div>

        <div className="card border border-accent/20 bg-accent/5">
          <p className="text-sm text-brand-dark-text-muted mb-2">Online</p>
          <p className="text-3xl font-display font-bold text-status-online">
            {Object.values(computersByLab)
              .flat()
              .filter((c) => c.status === 'online').length}
          </p>
        </div>

        <div className="card border border-accent/20 bg-accent/5">
          <p className="text-sm text-brand-dark-text-muted mb-2">Under Maintenance</p>
          <p className="text-3xl font-display font-bold text-status-maintenance">
            {Object.values(computersByLab)
              .flat()
              .filter((c) => c.status === 'maintenance').length}
          </p>
        </div>
      </div>
    </div>
  )
}
