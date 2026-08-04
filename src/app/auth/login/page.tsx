'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, LogIn, MonitorSmartphone, ShieldCheck } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/motion'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please check your credentials.')
        return
      }

      await supabase.auth.setSession(data.session)
      router.push('/dashboard')
    } catch (err) {
      setError('Authentication failed. Please check your credentials.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={staggerItem} className="text-center space-y-3">
        <div
          className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-white"
          style={{
            background: 'var(--accent-grad)',
            boxShadow: '0 8px 32px rgba(143,99,247,0.5), 0 0 48px rgba(143,99,247,0.3)',
          }}
        >
          <MonitorSmartphone className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-display text-gradient-accent">TwinLab</h1>
          <p className="text-brand-dark-text-muted">Digital Twin Platform</p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.form variants={staggerItem} onSubmit={handleLogin} className="space-y-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-status-offline/15 border border-status-offline/30 rounded-xl p-3 text-status-offline text-sm"
          >
            {error}
          </motion.div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="label">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark-text-subtle" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="input pl-11"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark-text-subtle" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input pl-11"
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={loading ? {} : { scale: 1.015 }}
          whileTap={loading ? {} : { scale: 0.985 }}
          className="btn btn-primary w-full"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Sign In
            </>
          )}
        </motion.button>
      </motion.form>

      {/* Footer */}
      <motion.div variants={staggerItem} className="text-center text-sm space-y-3">
        <div className="divider-glass" />
        <p className="text-xs text-brand-dark-text-subtle uppercase tracking-widest">Demo Account</p>
        <div className="chip mx-auto justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-status-online" />
          <span className="font-mono">admin@twinlab.local</span>
        </div>
        <p className="text-[11px] text-brand-dark-text-subtle">(Password is set during database seeding)</p>
      </motion.div>
    </motion.div>
  )
}
