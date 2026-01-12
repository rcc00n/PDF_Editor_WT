import { Link, useNavigate, useParams } from 'react-router-dom'
import SectionHeader from '@/shared/ui/SectionHeader'
import { Card, CardBody } from '@/shared/ui/Card'
import Badge from '@/shared/ui/Badge'
import Button from '@/shared/ui/Button'
import { useAppStore } from '@/shared/state/useAppStore'
import { dateTimeShort } from '@/shared/lib/format'
import { CheckCircle2 } from 'lucide-react'

export default function ReviewApprovedPage() {
  const { ticketId = '' } = useParams()
  const nav = useNavigate()
  const ticket = useAppStore(s => s.tickets.find(t => t.id === ticketId))
  const forms = useAppStore(s => s.forms)

  const form = ticket ? forms.find(f => f.id === ticket.formId) : undefined

  if (!ticket) {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">Ticket not found.</div>
        <div className="mt-3">
          <Link to="/review" className="underline">Back</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-10">
      <SectionHeader
        title="Approval complete"
        subtitle={`${form?.name ?? 'Form'} · ${ticket.id}`}
        right={
          <>
            <Button variant="secondary" onClick={() => nav('/review')}>
              Back to Review
            </Button>
            <Button variant="secondary" onClick={() => nav(`/review/${ticket.id}`)}>
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
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div className="text-lg font-semibold">Approved and archived</div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    This ticket is ready for export and record keeping.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Assigned to</div>
                  <div className="font-medium">{ticket.assignedTo}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Approval status</div>
                  <div className="mt-1">
                    <Badge tone={ticket.approvalState === 'approved' ? 'success' : 'warning'}>
                      {ticket.approvalState}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Approved</div>
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
