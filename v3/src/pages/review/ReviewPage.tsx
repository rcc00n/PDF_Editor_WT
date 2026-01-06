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
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:flex-nowrap">
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

      <div className="px-4 mt-4 sm:px-6 sm:mt-6">
        <Card>
          <CardBody>
            <div className="overflow-auto rf-scrollbar">
              <table className="w-full text-sm">
                <thead className="text-xs text-neutral-500 dark:text-neutral-400">
                  <tr className="text-left">
                    <th className="py-2">Ticket</th>
                    <th className="py-2 hidden sm:table-cell">Assigned</th>
                    <th className="py-2 hidden sm:table-cell">Status</th>
                    <th className="py-2 hidden sm:table-cell">Approval</th>
                    <th className="py-2 text-right">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="py-3">
                        <div className="font-medium">{t.id} · {t.title}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:block">{dateTimeShort(t.assignedAt)}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 sm:hidden">{t.assignedTo} · {dateTimeShort(t.assignedAt)}</div>
                        <div className="mt-2 flex flex-wrap gap-2 sm:hidden">
                          <Badge tone={t.status === 'synced' ? 'success' : t.status === 'error' ? 'danger' : t.status === 'queued' ? 'warning' : 'neutral'}>
                            {t.status}
                          </Badge>
                          <Badge tone={t.approvalState === 'approved' ? 'success' : 'warning'}>
                            {t.approvalState}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 hidden sm:table-cell">{t.assignedTo}</td>
                      <td className="py-3 hidden sm:table-cell">
                        <Badge tone={t.status === 'synced' ? 'success' : t.status === 'error' ? 'danger' : t.status === 'queued' ? 'warning' : 'neutral'}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="py-3 hidden sm:table-cell">
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
