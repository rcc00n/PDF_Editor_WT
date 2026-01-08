import { useEffect, useRef } from 'react'
import { useAppStore } from '@/shared/state/useAppStore'
import { API_ENABLED } from '@/shared/api/config'
import { apiJson } from '@/shared/api/client'

export function useQueueProcessor() {
  const online = useAppStore(s => s.online)
  const markQueueItem = useAppStore(s => s.markQueueItem)
  const recordSyncSuccess = useAppStore(s => s.recordSyncSuccess)
  const markSynced = useAppStore(s => s.markSynced)
  const updateTicket = useAppStore(s => s.updateTicket)

  const busy = useRef(false)

  useEffect(() => {
    if (!online) return

    const id = window.setInterval(async () => {
      if (busy.current) return
      const s = useAppStore.getState()
      const next = s.queue.find(q => q.status === 'pending') ?? s.queue.find(q => q.status === 'in_progress')
      if (!next) return

      busy.current = true
      try {
        markQueueItem(next.id, 'in_progress')
        updateTicket(next.ticketId, { status: 'in_progress', lastError: undefined })

        if (API_ENABLED) {
          const ticket = s.tickets.find((t) => t.id === next.ticketId)
          if (ticket) {
            await apiJson(`/tickets/${ticket.id}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ values: ticket.values, signature: ticket.signature })
            })
          }
          const updated = await apiJson(`/tickets/${next.ticketId}/submit/`, { method: 'POST' })
          updateTicket(next.ticketId, updated)
          markQueueItem(next.id, 'synced')
          markSynced(next.ticketId)
          recordSyncSuccess()
          return
        }

        await sleep(700 + Math.random() * 800)

        const fail = Math.random() < 0.17
        if (fail) {
          const err = Math.random() < 0.5 ? 'Network timeout' : 'Server rejected payload'
          markQueueItem(next.id, 'failed', err)
          updateTicket(next.ticketId, { status: 'error', lastError: err })
          return
        }

        markQueueItem(next.id, 'synced')
        markSynced(next.ticketId)
        recordSyncSuccess()
      } catch (err: any) {
        const message = err?.message || 'Sync failed'
        markQueueItem(next.id, 'failed', message)
        updateTicket(next.ticketId, { status: 'error', lastError: message })
      } finally {
        busy.current = false
      }
    }, 900)

    return () => window.clearInterval(id)
  }, [online, markQueueItem, recordSyncSuccess, markSynced, updateTicket])
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
