'use client'

import { motion } from 'framer-motion'
import { staggerItem } from '@/lib/motion'

interface CardProps {
  variant?: 'default' | 'glass' | 'clay'
  interactive?: boolean
  animate?: boolean
  className?: string
  onClick?: () => void
  style?: React.CSSProperties
  children: React.ReactNode
}

export default function Card({
  variant = 'default',
  interactive = false,
  animate = false,
  className = '',
  onClick,
  style,
  children,
}: CardProps) {
  const base = variant === 'glass' ? 'card-glass' : variant === 'clay' ? 'card-clay' : 'card'
  const interactiveClass = interactive ? 'cursor-pointer hover:shadow-glow-sm' : ''
  const classes = `${base} ${interactiveClass} ${className}`

  if (animate) {
    return (
      <motion.div variants={staggerItem} initial="hidden" animate="show" className={classes} onClick={onClick} style={style}>
        {children}
      </motion.div>
    )
  }

  return (
    <div className={classes} onClick={onClick} style={style}>
      {children}
    </div>
  )
}
