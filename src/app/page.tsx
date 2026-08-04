'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default function Page() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        router.push('/dashboard')
      } else {
        router.push('/auth/login')
      }
      setChecked(true)
    }

    checkSession()
  }, [router])

  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-dark-bg">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return null
}

