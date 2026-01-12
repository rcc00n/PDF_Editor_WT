import { Link, useNavigate, useParams } from 'react-router-dom'
import SectionHeader from '@/shared/ui/SectionHeader'
import { Card, CardBody } from '@/shared/ui/Card'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import { useAppStore } from '@/shared/state/useAppStore'
import { dateTimeShort } from '@/shared/lib/format'
import { Send } from 'lucide-react'
import type { TicketStatus } from '@/entities/types'

export default function FieldSubmittedPage() {
  const { ticketId = '' } = useParams()
  const nav = useNavigate()
  const ticket = useAppStore(s => s.tickets.find(t => t.id === ticketId))
  const forms = useAppStore(s => s.forms)
  const online = useAppStore(s => s.online)

  const form = ticket ? forms.find(f => f.id === ticket.formId) : undefined

  if (!ticket) {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">Ticket not found.</div>
        <div className="mt-3">
          <Link to="/field" className="underline">Back</Link>
        </div>
      </div>
    )
  }

  const statusLabel = ticket.status === 'in_progress' ? 'Syncing now' : ticket.status === 'queued' ? 'Queued for sync' : ticket.status
  const statusCopy = online
    ? 'Submission is in the sync queue. You can keep working on other forms.'
    : 'Submission is queued and will sync once you are back online.'

  return (
    <div className="pb-10">
      <SectionHeader
        title="Submission queued"
        subtitle={`${form?.name ?? 'Form'} · ${ticket.id}`}
        right={
          <>
            <Button variant="secondary" onClick={() => nav('/field')}>
              Back to Completed Forms
            </Button>
            <Button variant="secondary" onClick={() => nav(`/field/ticket/${ticket.id}`)}>
              View ticket
            </Button>
          </>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6">
        <Card>
          <CardBody>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                  <Send size={20} />
                </div>
                <div>
                  <div className="text-lg font-semibold">{online ? 'Submission in progress' : 'Submission queued'}</div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">{statusCopy}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Assigned to</div>
                  <div className="font-medium">{ticket.assignedTo}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Status</div>
                  <div className="mt-1">
                    <Badge tone={ticketStatusTone(ticket.status)}>{statusLabel}</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Submitted</div>
                  <div className="font-medium">{dateTimeShort(ticket.updatedAt)}</div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function ticketStatusTone(status: TicketStatus): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'synced') return 'success'
  if (status === 'error') return 'danger'
  if (status === 'queued' || status === 'pending' || status === 'in_progress') return 'warning'
  return 'neutral'
}
