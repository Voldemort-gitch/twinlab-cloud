'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard,
  Building2,
  Monitor,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { springGentle, staggerContainer } from '@/lib/motion'
import { isNavItemActive } from '@/lib/utils'
import NotificationCenter from '@/components/notifications/NotificationCenter'
import LiveConnection from '@/components/ui/LiveConnection'
import CommandPalette from '@/components/ui/CommandPalette'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, profile, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync drawer to navigation
    setMobileOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-mesh">
        <div className="text-center animate-pulse space-y-4">
          <div className="h-12 w-12 bg-brand-dark-surface rounded-xl mx-auto clay-2"></div>
          <div className="h-4 w-32 bg-brand-dark-surface rounded mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const isActive = (path: string) => isNavItemActive(pathname, path)

  const navigationItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Labs', href: '/dashboard/labs', icon: Building2 },
    { label: 'Digital Twin', href: '/dashboard/twin', icon: Monitor },
    { label: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
    { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  ]

  if (profile.role === 'admin') {
    navigationItems.push({ label: 'Admin', href: '/dashboard/admin', icon: Settings })
  }

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-brand-dark-border/60">
        <Link href="/dashboard" className="flex items-center gap-3 group" onClick={() => { setMobileOpen(false); setSidebarOpen(true) }}>
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            transition={springGentle}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold font-display relative overflow-hidden"
            style={{
              background: 'var(--accent-grad)',
              boxShadow: '0 4px 16px rgba(143,99,247,0.5), 0 0 32px rgba(143,99,247,0.25)',
            }}
          >
            T
            <span className="absolute inset-0 opacity-40 bg-grid" />
          </motion.div>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <span className="font-display font-bold text-lg text-gradient-accent">TwinLab</span>
              <p className="text-[10px] text-brand-dark-text-subtle tracking-wide uppercase">
                Digital Twin Platform
              </p>
            </motion.div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <motion.nav
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex-1 p-3 space-y-1 overflow-y-auto"
      >
        {navigationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <motion.div key={item.href} variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'text-white'
                    : 'text-brand-dark-text-muted hover:text-brand-dark-text hover:bg-brand-dark-surface-hover/70'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="active-nav"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(143,99,247,0.22), rgba(143,99,247,0.08))',
                      boxShadow: '0 0 16px rgba(143,99,247,0.18), inset 0 0 0 1px rgba(143,99,247,0.32)',
                    }}
                    transition={springGentle}
                  />
                )}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                    style={{ background: 'linear-gradient(180deg, #c4b5fd, #8f63f7)', boxShadow: '0 0 10px rgba(143,99,247,0.8)' }}
                  />
                )}
                <Icon className={`w-4.5 h-4.5 relative z-10 ${active ? 'text-accent' : ''}`} />
                {sidebarOpen && <span className="relative z-10">{item.label}</span>}
              </Link>
            </motion.div>
          )
        })}
      </motion.nav>

      {/* Footer: user + collapse */}
      <div className="p-3 border-t border-brand-dark-border/60 space-y-2">
        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl clay">
          <div
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{
              background: 'linear-gradient(135deg, #34d399, #8f63f7)',
              boxShadow: '0 0 14px rgba(52,211,153,0.4)',
            }}
          >
            {(profile.full_name || profile.email || 'U').charAt(0).toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-status-online border-2 border-brand-dark-bg" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{profile.full_name || profile.email}</p>
              <p className="text-xs text-brand-dark-text-subtle capitalize">{profile.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-status-offline/15 rounded-lg text-brand-dark-text-subtle hover:text-status-offline transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Collapse toggle - desktop only */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full hidden lg:flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-brand-dark-text-subtle hover:text-brand-dark-text hover:bg-brand-dark-surface-hover/70 transition-colors"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}`} />
          {sidebarOpen && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-mesh text-brand-dark-text relative">
      {/* Floating orbs */}
      <div className="orb w-72 h-72 top-[-8%] left-[-5%]" style={{ background: 'rgba(143,99,247,0.35)' }} />
      <div className="orb w-96 h-96 bottom-[-15%] right-[-8%]" style={{ background: 'rgba(167,139,250,0.22)' }} />

      {/* Desktop sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 256, opacity: 1 }}
            exit={{ width: 80 }}
            animate={{ width: 256 }}
            transition={springGentle}
            className={`hidden lg:block relative z-20 h-screen sticky top-0 bg-brand-dark-surface/70 backdrop-blur-glass border-r border-brand-dark-border/60`}
          >
            {SidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
      {!sidebarOpen && (
        <aside className="hidden lg:block relative z-20 w-20 h-screen sticky top-0 bg-brand-dark-surface/70 backdrop-blur-glass border-r border-brand-dark-border/60">
          {SidebarContent}
        </aside>
      )}

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={springGentle}
            className="fixed left-0 top-0 z-50 h-screen w-64 bg-brand-dark-surface lg:hidden"
          >
            {SidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 glass border-b border-brand-dark-border/60">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 hover:bg-brand-dark-surface-hover rounded-lg text-brand-dark-text-muted"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-display font-bold">{pageTitle(pathname)}</h1>
                <p className="text-xs text-brand-dark-text-subtle hidden sm:block">{pageSubtitle(pathname)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Live connection */}
              <LiveConnection />

              {/* Search / command palette */}
              <CommandPalette />

              {/* Notifications */}
              <NotificationCenter />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

function pageTitle(pathname: string): string {
  if (pathname?.startsWith('/dashboard/twin')) return 'Digital Twin'
  if (pathname?.startsWith('/dashboard/labs')) return 'Labs & Inventory'
  if (pathname?.startsWith('/dashboard/maintenance')) return 'Maintenance'
  if (pathname?.startsWith('/dashboard/analytics')) return 'Analytics'
  if (pathname?.startsWith('/dashboard/admin')) return 'Admin Panel'
  return 'Dashboard'
}

function pageSubtitle(pathname: string): string {
  if (pathname?.startsWith('/dashboard/twin')) return 'Spatial lab visualization & live monitoring'
  if (pathname?.startsWith('/dashboard/labs')) return 'Manage computer labs and monitor assets'
  if (pathname?.startsWith('/dashboard/maintenance')) return 'Ticket management and issue tracking'
  if (pathname?.startsWith('/dashboard/analytics')) return 'Fleet health, trends & performance'
  if (pathname?.startsWith('/dashboard/admin')) return 'System configuration & management'
  return 'Fleet health overview & real-time metrics'
}
