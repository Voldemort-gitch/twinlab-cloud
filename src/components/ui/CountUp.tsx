'use client'

import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

interface CountUpProps {
  value: number
  suffix?: string
  duration?: number
  className?: string
}

export default function CountUp({ value, suffix = '', duration = 1.2, className }: CountUpProps) {
  const [display, setDisplay] = useState(0)
  const prevValue = useRef(0)

  useEffect(() => {
    const controls = animate(prevValue.current, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(Math.round(latest)),
      onComplete: () => {
        prevValue.current = value
        setDisplay(value)
      },
    })
    return () => controls.stop()
  }, [value, duration])

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  )
}
