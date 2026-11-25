import { useEffect, useRef } from 'react'
import { useAppStore } from '@/shared/state/useAppStore'
import { API_ENABLED, DEMO_MODE } from '@/shared/api/config'
import { apiJson } from '@/shared/api/client'

export function useQueueProcessor() {
  const online = useAppStore(s => s.online)
  const markQueueItem = useAppStore(s => s.markQueueItem)
  const recordSyncSuccess = useAppStore(s => s.recordSyncSuccess)
  const markSynced = useAppStore(s => s.markSynced)
  const updateTicket = useAppStore(s => s.updateTicket)

  const busy = useRef(false)

  useEffect(() => {
    if (!online || (!API_ENABLED && !DEMO_MODE)) return

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
          if (!ticket) {
            markQueueItem(next.id, 'failed', 'Ticket not found')
            updateTicket(next.ticketId, { status: 'error', lastError: 'Ticket not found' })
            return
          }

          let remoteId = ticket.serverId ?? ticket.id
          if (ticket.localOnly && !ticket.serverId) {
            const created = await apiJson('/tickets/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                formId: ticket.formId,
                versionId: ticket.versionId,
                title: ticket.title,
                assignedTo: ticket.assignedTo
              })
            })
            remoteId = created.id
            updateTicket(ticket.id, { serverId: created.id, localOnly: false })
          }

          await apiJson(`/tickets/${remoteId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: ticket.values, signature: ticket.signature })
          })
          const updated = await apiJson(`/tickets/${remoteId}/submit/`, { method: 'POST' })
          const { id: serverId, ...rest } = updated
          updateTicket(next.ticketId, { ...rest, serverId })
          markQueueItem(next.id, 'synced')
          markSynced(next.ticketId)
          recordSyncSuccess()
          return
        }

        // Explicit local demo only: deterministic progress, no server acceptance.
        await sleep(350)

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
