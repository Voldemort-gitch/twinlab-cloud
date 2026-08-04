'use client'

import React, { createContext, useCallback, useContext, useState } from 'react'
import * as Toast from '@radix-ui/react-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, AlertCircle, CheckCircle2, X } from 'lucide-react'

type ToastVariant = 'default' | 'success' | 'error' | 'warning'

interface ToastData {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextType {
  toast: (title: string, options?: { description?: string; variant?: ToastVariant }) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

let toastId = 0

const variantStyles: Record<ToastVariant, { icon: typeof AlertCircle; color: string; bg: string }> = {
  default: { icon: AlertCircle, color: 'text-accent', bg: 'bg-accent/15' },
  success: { icon: CheckCircle2, color: 'text-status-online', bg: 'bg-status-online/15' },
  error: { icon: AlertCircle, color: 'text-status-offline', bg: 'bg-status-offline/15' },
  warning: { icon: AlertTriangle, color: 'text-status-maintenance', bg: 'bg-status-maintenance/15' },
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const toast = useCallback<ToastContextType['toast']>((title, options) => {
    const id = ++toastId
    setToasts((prev) => [
      ...prev,
      { id, title, description: options?.description, variant: options?.variant ?? 'default' },
    ])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      <Toast.Provider duration={5000} swipeDirection="right">
        {children}
        <AnimatePresence>
          {toasts.map((t) => {
            const s = variantStyles[t.variant]
            const Icon = s.icon
            return (
              <Toast.Root
                key={t.id}
                asChild
                onOpenChange={(open) => {
                  if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id))
                }}
              >
                <motion.div
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 60 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  className="glass-strong rounded-xl border border-brand-dark-border-bright overflow-hidden"
                  style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
                >
                  <div className="flex items-start gap-3 p-4">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                      <Icon className={`w-4 h-4 ${s.color}`} />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <Toast.Title className="text-sm font-semibold text-brand-dark-text">{t.title}</Toast.Title>
                      {t.description && (
                        <Toast.Description className="text-xs text-brand-dark-text-muted mt-0.5">
                          {t.description}
                        </Toast.Description>
                      )}
                    </div>
                    <Toast.Close asChild>
                      <button aria-label="Dismiss notification" className="p-1 rounded-lg text-brand-dark-text-subtle hover:text-brand-dark-text hover:bg-brand-dark-surface-hover transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </Toast.Close>
                  </div>
                </motion.div>
              </Toast.Root>
            )
          })}
        </AnimatePresence>
        <Toast.Viewport className="fixed bottom-0 right-0 z-[200] flex flex-col gap-2 p-4 w-full max-w-sm outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToasterProvider')
  }
  return context
}
