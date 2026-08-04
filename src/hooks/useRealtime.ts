'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface RealtimeOptions {
  table: string
  onInsert?: (record: Record<string, unknown>) => void
  onUpdate?: (record: Record<string, unknown>) => void
  onDelete?: (record: Record<string, unknown>) => void
  filter?: { column: string; value: string }
}

let channelCounter = 0

export function useRealtime({ table, onInsert, onUpdate, onDelete, filter }: RealtimeOptions) {
  const handlersRef = useRef({ onInsert, onUpdate, onDelete, filter })
  const channelIdRef = useRef<number>(0)

  useEffect(() => {
    handlersRef.current = { onInsert, onUpdate, onDelete, filter }
  })

  useEffect(() => {
    if (channelIdRef.current === 0) {
      channelCounter += 1
      channelIdRef.current = channelCounter
    }
    const channel = supabase
      .channel(`realtime-${table}-${filter?.value ?? 'all'}-${channelIdRef.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        (payload) => {
          const { eventType, new: record, old } = payload as {
            eventType: 'INSERT' | 'UPDATE' | 'DELETE'
            new: Record<string, unknown> | null
            old: Record<string, unknown> | null
          }
          if (eventType === 'INSERT' && record && handlersRef.current.onInsert) {
            handlersRef.current.onInsert(record)
          } else if (eventType === 'UPDATE' && record && handlersRef.current.onUpdate) {
            handlersRef.current.onUpdate(record)
          } else if (eventType === 'DELETE' && old && handlersRef.current.onDelete) {
            handlersRef.current.onDelete(old)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter?.column, filter?.value])
}
