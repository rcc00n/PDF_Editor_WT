import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import { Card, CardBody, CardHeader, CardSub, CardTitle } from '@/shared/ui/Card'
import Badge from '@/shared/ui/Badge'
import { useAppStore } from '@/shared/state/useAppStore'
import { dateShort, dateTimeShort, timeHHMM } from '@/shared/lib/format'
import { RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react'

export default function QueuePage() {
  const queue = useAppStore(s => s.queue)
  const tickets = useAppStore(s => s.tickets)
  const lastSuccess = useAppStore(s => s.lastSyncSuccess)
  const retryFailed = useAppStore(s => s.retryFailed)

  const stats = useMemo(() => ({
    pending: queue.filter(q => q.status === 'pending').length,
    inProgress: queue.filter(q => q.status === 'in_progress').length,
    failed: queue.filter(q => q.status === 'failed').length
  }), [queue])

  const grouped = useMemo(() => {
    const by: Record<string, typeof tickets> = {}
    for (const t of tickets.slice().sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))) {
      const k = dateShort(t.assignedAt)
      by[k] = by[k] || []
      by[k].push(t)
    }
    return Object.entries(by)
  }, [tickets])

  return (
    <div className="pb-10">
      <SectionHeader
        title="Sync Queue"
        subtitle="Queued mutations with explicit retry and status visibility."
        right={
          <>
            <Button variant="secondary" onClick={() => retryFailed()}>
              <RotateCcw size={16} /> Retry Failed
            </Button>
            <Button variant="secondary" onClick={() => useAppStore.getState().pushToast({ title: 'Auto-sync', message: 'Enabled (demo)', variant: 'success' })}>
              <RefreshCw size={16} /> Review Latest Sync
            </Button>
          </>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6 grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Daily Field Tickets</CardTitle>
            <CardSub>Grouped by date</CardSub>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {grouped.map(([day, items]) => (
                <div key={day}>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">{day}</div>
                  <div className="flex flex-col gap-2">
                    {items.map((t) => (
                      <Link key={t.id} to={`/review/${t.id}`} className="rf-focus rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{t.id} · {t.title}</div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              {t.assignedTo} · {dateTimeShort(t.assignedAt)}
                            </div>
                          </div>
                          <Badge tone={t.status === 'synced' ? 'success' : t.status === 'error' ? 'danger' : t.status === 'queued' ? 'warning' : 'neutral'}>
                            {t.status}
                          </Badge>
                        </div>
                        {t.lastError && (
                          <div className="mt-2 text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
                            <ShieldAlert size={14} /> {t.lastError}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardBody>
              <div className="text-sm font-semibold">Queue Overview</div>
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                <Badge tone={stats.pending ? 'warning' : 'neutral'}>{stats.pending} Pending</Badge>
                <Badge tone="neutral">{stats.inProgress} In progress</Badge>
                <Badge tone={stats.failed ? 'danger' : 'neutral'}>{stats.failed} Failed</Badge>
              </div>
              <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                Last success: {lastSuccess ? timeHHMM(lastSuccess) : '—'}
              </div>
              <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                Auto-sync enabled (demo).
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Queued mutations</CardTitle>
              <CardSub>Inspect each queue item</CardSub>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col gap-2">
                {queue.length === 0 && <div className="text-sm text-neutral-500 dark:text-neutral-400">Queue is empty</div>}
                {queue.map((q) => (
                  <div key={q.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{q.type}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {q.ticketId} · {dateTimeShort(q.createdAt)} · attempts {q.attempts}
                        </div>
                      </div>
                      <Badge tone={q.status === 'synced' ? 'success' : q.status === 'failed' ? 'danger' : q.status === 'pending' ? 'warning' : 'neutral'}>
                        {q.status}
                      </Badge>
                    </div>
                    {q.lastError && <div className="mt-2 text-xs text-red-600 dark:text-red-300">{q.lastError}</div>}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
