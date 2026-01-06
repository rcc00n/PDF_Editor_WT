import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionHeader from '@/shared/ui/SectionHeader'
import { Card, CardBody } from '@/shared/ui/Card'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import { useAppStore } from '@/shared/state/useAppStore'
import { dateTimeShort } from '@/shared/lib/format'
import { Filter } from 'lucide-react'

type FilterKey = 'all' | 'pending' | 'approved' | 'needs_attention'

export default function ReviewPage() {
  const tickets = useAppStore(s => s.tickets)
  const [filter, setFilter] = useState<FilterKey>('all')

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      if (filter === 'all') return true
      if (filter === 'pending') return t.status === 'synced' && t.approvalState !== 'approved'
      if (filter === 'approved') return t.approvalState === 'approved'
      if (filter === 'needs_attention') return t.status === 'error' || t.status === 'queued' || t.status === 'pending'
      return true
    })
  }, [tickets, filter])

  return (
    <div className="pb-10">
      <SectionHeader
        title="Admin Review & Export"
        subtitle="Completed preview with metadata, attachments, and export actions."
        right={
          <div className="flex items-center gap-2">
            <Button size="sm" variant={filter === 'all' ? 'primary' : 'secondary'} onClick={() => setFilter('all')}>
              <Filter size={16} /> All
            </Button>
            <Button size="sm" variant={filter === 'pending' ? 'primary' : 'secondary'} onClick={() => setFilter('pending')}>
              Pending
            </Button>
            <Button size="sm" variant={filter === 'approved' ? 'primary' : 'secondary'} onClick={() => setFilter('approved')}>
              Approved
            </Button>
            <Button size="sm" variant={filter === 'needs_attention' ? 'primary' : 'secondary'} onClick={() => setFilter('needs_attention')}>
              Needs attention
            </Button>
          </div>
        }
      />

      <div className="px-6 mt-6">
        <Card>
          <CardBody>
            <div className="overflow-auto rf-scrollbar">
              <table className="w-full text-sm">
                <thead className="text-xs text-neutral-500 dark:text-neutral-400">
                  <tr className="text-left">
                    <th className="py-2">Ticket</th>
                    <th className="py-2">Assigned</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Approval</th>
                    <th className="py-2 text-right">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="py-3">
                        <div className="font-medium">{t.id} · {t.title}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{dateTimeShort(t.assignedAt)}</div>
                      </td>
                      <td className="py-3">{t.assignedTo}</td>
                      <td className="py-3">
                        <Badge tone={t.status === 'synced' ? 'success' : t.status === 'error' ? 'danger' : t.status === 'queued' ? 'warning' : 'neutral'}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge tone={t.approvalState === 'approved' ? 'success' : 'warning'}>
                          {t.approvalState}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Link className="rf-focus rounded-xl px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900" to={`/review/${t.id}`}>
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400" colSpan={5}>
                        Nothing here
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
