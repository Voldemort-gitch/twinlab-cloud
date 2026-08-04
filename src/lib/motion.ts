import type { Transition, Variants } from 'framer-motion'

export const spring: Transition = { type: 'spring', stiffness: 260, damping: 24 }
export const springGentle: Transition = { type: 'spring', stiffness: 180, damping: 22 }

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: spring,
  },
}

export const whileHover = { scale: 1.015 }
export const whileTap = { scale: 0.98 }
