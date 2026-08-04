'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { PackageOpen, LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({
  title,
  description,
  icon: Icon = PackageOpen,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`card border border-accent/20 bg-accent/5 text-center py-12 ${className}`}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-accent" />
        </div>
        <p className="text-lg font-display font-bold">{title}</p>
        {description && <p className="text-sm text-brand-dark-text-muted max-w-sm">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </motion.div>
  )
}
