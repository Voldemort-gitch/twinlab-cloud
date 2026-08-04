'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { UserProfile, UserRole, Lab } from '@/types'
import { formatDateTime } from '@/lib/utils'
import { staggerContainer, staggerItem, whileHover } from '@/lib/motion'
import { useToast } from '@/components/ui/Toast'
import { useDialog } from '@/hooks/useDialog'
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Users,
  Building2,
  Shield,
  Save,
  Trash2,
  Plus,
  X,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const SIM_URL = process.env.NEXT_PUBLIC_SIMULATION_SERVICE_URL || 'http://localhost:3001'
const SIM_TOKEN = process.env.NEXT_PUBLIC_SIMULATION_SERVICE_TOKEN || ''

const simHeaders: Record<string, string> = SIM_TOKEN
  ? { Authorization: `Bearer ${SIM_TOKEN}` }
  : {}

interface SimStatus {
  state: 'stopped' | 'running' | 'paused'
  config?: Record<string, number>
  computerCount?: number
}

export default function AdminPage() {
  const router = useRouter()
  const { profile, loading } = useAuth()
  const { toast } = useToast()

  const [simStatus, setSimStatus] = useState<SimStatus | null>(null)
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState<string | null>(null)

  const [users, setUsers] = useState<UserProfile[]>([])
  const [labs, setLabs] = useState<Lab[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '', role: UserRole.VIEWER })
  const [addUserError, setAddUserError] = useState<string | null>(null)
  const [addUserLoading, setAddUserLoading] = useState(false)

  const [showAddLab, setShowAddLab] = useState(false)
  const [newLab, setNewLab] = useState({ name: '', location: '', rows: 4, columns: 6 })
  const [addLabError, setAddLabError] = useState<string | null>(null)
  const [addLabLoading, setAddLabLoading] = useState(false)

  useEffect(() => {
    if (!loading && profile?.role !== UserRole.ADMIN) {
      router.push('/dashboard')
    }
  }, [profile, loading, router])

  // Fetch simulation status + users + labs
  const loadAdminData = useCallback(async () => {
    try {
      const [statusRes, usersRes, labsRes] = await Promise.all([
        fetch(`${SIM_URL}/simulation/status`, { headers: simHeaders }).then((r) => r.json()).catch(() => null),
        supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('labs').select('*').order('name'),
      ])
      if (statusRes) setSimStatus(statusRes)
      if (!usersRes.error) setUsers(usersRes.data || [])
      if (!labsRes.error) setLabs(labsRes.data || [])
    } catch (err) {
      console.error('Error loading admin data:', err)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (profile?.role === UserRole.ADMIN) {
      const run = async () => {
        await loadAdminData()
      }
      void run()
    }
  }, [profile?.role, loadAdminData])

  const simControl = async (action: 'start' | 'pause' | 'resume' | 'stop') => {
    setSimLoading(true)
    setSimError(null)
    try {
      const res = await fetch(`${SIM_URL}/simulation/${action}`, { method: 'POST', headers: simHeaders })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Simulation request failed')
      setSimStatus(data.status)
      toast(`Simulation ${action === 'stop' ? 'stopped' : `${action}ed`}`, { variant: 'success' })
    } catch (err) {
      setSimError(err instanceof Error ? err.message : 'Failed to control simulation')
      toast('Simulation request failed', { variant: 'error' })
    } finally {
      setSimLoading(false)
    }
  }

  const updateRole = async (userId: string, role: UserRole) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', userId)
    if (error) {
      console.error('Failed to update role:', error)
      toast('Failed to update role', { variant: 'error' })
      return
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
    toast('Role updated', { variant: 'success' })
  }

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddUserLoading(true)
    setAddUserError(null)
    try {
      // Create auth user via server-side proxy (email confirmation disabled via admin SDK is not available)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: { data: { full_name: newUser.full_name } },
      })
      if (authError) throw authError
      const authId = authData.user?.id
      if (!authId) throw new Error('User creation returned no auth ID')

      const { error: profileError } = await supabase.from('user_profiles').insert({
        auth_id: authId,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
      })
      if (profileError) throw profileError

      setShowAddUser(false)
      setNewUser({ email: '', full_name: '', password: '', role: UserRole.VIEWER })
      loadAdminData()
      toast('User created', { variant: 'success' })
    } catch (err) {
      setAddUserError(err instanceof Error ? err.message : 'Failed to add user')
      toast('Failed to add user', { variant: 'error' })
    } finally {
      setAddUserLoading(false)
    }
  }

  const addLab = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddLabLoading(true)
    setAddLabError(null)
    try {
      const { error } = await supabase.from('labs').insert({
        name: newLab.name,
        location: newLab.location,
        layout_metadata: { rows: newLab.rows, columns: newLab.columns },
      })
      if (error) throw error
      setShowAddLab(false)
      setNewLab({ name: '', location: '', rows: 4, columns: 6 })
      loadAdminData()
      toast('Lab created', { variant: 'success' })
    } catch (err) {
      setAddLabError(err instanceof Error ? err.message : 'Failed to add lab')
      toast('Failed to add lab', { variant: 'error' })
    } finally {
      setAddLabLoading(false)
    }
  }

  const deleteLab = async (labId: string) => {
    if (!confirm('Delete this lab and all its computers? This cannot be undone.')) return
    const { error } = await supabase.from('labs').delete().eq('id', labId)
    if (error) {
      console.error('Failed to delete lab:', error)
      toast('Failed to delete lab', { variant: 'error' })
      return
    }
    loadAdminData()
    toast('Lab deleted', { variant: 'success' })
  }

  const roleColor: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'text-status-online',
    [UserRole.TECHNICIAN]: 'text-accent',
    [UserRole.VIEWER]: 'text-brand-dark-text-muted',
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card h-32">
          <div className="skeleton h-4 w-32 mb-4"></div>
          <div className="skeleton h-8 w-24"></div>
        </div>
        <div className="card h-40"></div>
        <div className="card h-40"></div>
      </div>
    )
  }

  if (profile?.role !== UserRole.ADMIN) {
    return null
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={staggerItem}>
        <h2 className="text-2xl font-display font-bold mb-1 flex items-center gap-3">
          Admin Panel <span className="chip">System</span>
        </h2>
        <p className="text-brand-dark-text-muted">System configuration and management</p>
      </motion.div>

      {simError && (
        <motion.div
          variants={staggerItem}
          className="bg-status-offline/15 border border-status-offline/30 rounded-xl p-3 text-status-offline text-sm"
        >
          {simError}
        </motion.div>
      )}

      {/* Simulation Control */}
      <motion.div variants={staggerItem}>
        <div
          className="card rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(143,99,247,0.12), rgba(19,23,34,0.4))',
            border: '1px solid rgba(143,99,247,0.22)',
            boxShadow: '0 0 32px rgba(143,99,247,0.14)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-display font-bold">Simulation Control</p>
              <p className="text-sm text-brand-dark-text-muted mt-1">Manage the metric generation service</p>
            </div>
            {simStatus && (
              <div className="flex items-center gap-2 glass rounded-full px-3 py-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    simStatus.state === 'running'
                      ? 'bg-status-online animate-pulse'
                      : simStatus.state === 'paused'
                        ? 'bg-status-maintenance'
                        : 'bg-status-offline'
                  }`}
                />
                <span className="text-sm font-semibold capitalize">{simStatus.state}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.button whileHover={whileHover} whileTap={{ scale: 0.97 }} onClick={() => simControl('start')} disabled={simLoading} className="btn btn-primary text-sm">
              <Play className="w-4 h-4" />
              Start
            </motion.button>
            <motion.button whileHover={whileHover} whileTap={{ scale: 0.97 }} onClick={() => simControl('pause')} disabled={simLoading} className="btn btn-secondary text-sm">
              <Pause className="w-4 h-4" />
              Pause
            </motion.button>
            <motion.button whileHover={whileHover} whileTap={{ scale: 0.97 }} onClick={() => simControl('resume')} disabled={simLoading} className="btn btn-secondary text-sm">
              <RefreshCw className="w-4 h-4" />
              Resume
            </motion.button>
            <motion.button whileHover={whileHover} whileTap={{ scale: 0.97 }} onClick={() => simControl('stop')} disabled={simLoading} className="btn btn-destructive text-sm">
              <Square className="w-4 h-4" />
              Stop
            </motion.button>
          </div>

          {simStatus?.config && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-brand-dark-text-muted">
              <Info label="Interval" value={`${simStatus.config.interval ?? '—'}ms`} />
              <Info label="Computers" value={String(simStatus.computerCount ?? '—')} />
              <Info label="CPU Drift" value={`±${simStatus.config.cpuDrift ?? '—'}%`} />
              <Info label="Status Rate" value={`${((simStatus.config.statusMutationRate ?? 0) * 100).toFixed(1)}%`} />
            </div>
          )}
        </div>
      </motion.div>

      {/* User Management */}
      <motion.div variants={staggerItem}>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent/15">
                <Users className="w-4 h-4 text-accent" />
              </span>
              <p className="text-lg font-display font-bold">User Management</p>
            </div>
            <button onClick={() => setShowAddUser(true)} className="btn btn-primary text-sm">
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>

          {loadingData ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-12 w-full rounded-lg"></div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-brand-dark-text-muted py-6 text-center">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-dark-border">
                    <th className="text-left py-2 px-3 font-semibold text-brand-dark-text-muted">Name</th>
                    <th className="text-left py-2 px-3 font-semibold text-brand-dark-text-muted">Email</th>
                    <th className="text-left py-2 px-3 font-semibold text-brand-dark-text-muted">Role</th>
                    <th className="text-left py-2 px-3 font-semibold text-brand-dark-text-muted">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-brand-dark-border hover:bg-brand-dark-surface-hover/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Shield className={`w-4 h-4 ${roleColor[user.role]}`} />
                          <span className="font-medium">{user.full_name || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-brand-dark-text-muted">{user.email}</td>
                      <td className="py-3 px-3">
                        <select
                          value={user.role}
                          onChange={(e) => updateRole(user.id, e.target.value as UserRole)}
                          className="input !py-1 !px-2 !w-auto text-xs"
                        >
                          {Object.values(UserRole).map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3 text-xs text-brand-dark-text-muted">
                        {formatDateTime(user.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* Lab Management */}
      <motion.div variants={staggerItem}>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent/15">
                <Building2 className="w-4 h-4 text-accent" />
              </span>
              <p className="text-lg font-display font-bold">Lab Management</p>
            </div>
            <button onClick={() => setShowAddLab(true)} className="btn btn-primary text-sm">
              <Plus className="w-4 h-4" />
              Add Lab
            </button>
          </div>

          {loadingData ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="skeleton h-14 w-full rounded-lg"></div>
              ))}
            </div>
          ) : labs.length === 0 ? (
            <p className="text-sm text-brand-dark-text-muted py-6 text-center">No labs configured</p>
          ) : (
            <div className="space-y-3">
              {labs.map((lab) => (
                <div
                  key={lab.id}
                  className="flex items-center justify-between gap-4 clay rounded-xl p-4"
                >
                  <div>
                    <p className="font-medium">{lab.name}</p>
                    <p className="text-xs text-brand-dark-text-muted mt-0.5">
                      {lab.location || 'No location'} · {JSON.stringify(lab.layout_metadata) || 'No layout'}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => deleteLab(lab.id)}
                    className="p-2 hover:bg-status-offline/20 rounded-lg text-brand-dark-text-muted hover:text-status-offline transition-colors"
                    title="Delete lab"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Add User Modal */}
      <AnimatePresence>
      {showAddUser && (
        <Modal title="Add User" onClose={() => setShowAddUser(false)}>
          <form onSubmit={addUser} className="space-y-4">
            {addUserError && (
              <div className="bg-status-offline/20 border border-status-offline/30 rounded-lg p-3 text-status-offline text-sm">
                {addUserError}
              </div>
            )}
            <div>
              <label htmlFor="new-user-name" className="label">Full Name</label>
              <input
                id="new-user-name"
                type="text"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                className="input"
                placeholder="Jane Doe"
                required
              />
            </div>
            <div>
              <label htmlFor="new-user-email" className="label">Email</label>
              <input
                id="new-user-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="input"
                placeholder="jane@twinlab.local"
                required
              />
            </div>
            <div>
              <label htmlFor="new-user-password" className="label">Password</label>
              <input
                id="new-user-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="input"
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>
            <div>
              <label htmlFor="new-user-role" className="label">Role</label>
              <select
                id="new-user-role"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                className="input"
              >
                {Object.values(UserRole).map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowAddUser(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={addUserLoading} className="btn btn-primary">
                <Save className="w-4 h-4" />
                {addUserLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      </AnimatePresence>

      {/* Add Lab Modal */}
      <AnimatePresence>
      {showAddLab && (
        <Modal title="Add Lab" onClose={() => setShowAddLab(false)}>
          <form onSubmit={addLab} className="space-y-4">
            {addLabError && (
              <div className="bg-status-offline/20 border border-status-offline/30 rounded-lg p-3 text-status-offline text-sm">
                {addLabError}
              </div>
            )}
            <div>
              <label htmlFor="new-lab-name" className="label">Lab Name</label>
              <input
                id="new-lab-name"
                type="text"
                value={newLab.name}
                onChange={(e) => setNewLab({ ...newLab, name: e.target.value })}
                className="input"
                placeholder="e.g. Robotics Lab"
                required
              />
            </div>
            <div>
              <label htmlFor="new-lab-location" className="label">Location</label>
              <input
                id="new-lab-location"
                type="text"
                value={newLab.location}
                onChange={(e) => setNewLab({ ...newLab, location: e.target.value })}
                className="input"
                placeholder="Building C, Room 305"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="new-lab-rows" className="label">Rows</label>
                <input
                  id="new-lab-rows"
                  type="number"
                  min={1}
                  max={12}
                  value={newLab.rows}
                  onChange={(e) => setNewLab({ ...newLab, rows: +e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label htmlFor="new-lab-columns" className="label">Columns</label>
                <input
                  id="new-lab-columns"
                  type="number"
                  min={1}
                  max={12}
                  value={newLab.columns}
                  onChange={(e) => setNewLab({ ...newLab, columns: +e.target.value })}
                  className="input"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowAddLab(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={addLabLoading} className="btn btn-primary">
                <Save className="w-4 h-4" />
                {addLabLoading ? 'Creating...' : 'Create Lab'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      </AnimatePresence>
    </motion.div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-brand-dark-text-muted mb-1">{label}</p>
      <p className="font-semibold text-brand-dark-text">{value}</p>
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useDialog(true, onClose, closeRef)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative w-full max-w-md bg-brand-dark-glass-strong backdrop-blur-glass border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sticky top-0 glass-strong px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-display font-bold">{title}</h3>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-1.5 clay rounded-lg text-brand-dark-text-muted"
            aria-label="Close"
            ref={closeRef}
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  )
}
