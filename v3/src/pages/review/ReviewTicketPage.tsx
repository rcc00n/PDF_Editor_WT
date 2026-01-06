import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import { Card, CardBody, CardHeader, CardSub, CardTitle } from '@/shared/ui/Card'
import Badge from '@/shared/ui/Badge'
import { useAppStore } from '@/shared/state/useAppStore'
import { dateTimeShort } from '@/shared/lib/format'
import { exportTicketCsv, exportTicketPdf } from '@/features/export/exporters'
import { ArrowLeft, FileDown, FileSpreadsheet, CheckCircle2 } from 'lucide-react'

export default function ReviewTicketPage() {
  const { ticketId = '' } = useParams()
  const nav = useNavigate()

  const ticket = useAppStore(s => s.tickets.find(t => t.id === ticketId))
  const forms = useAppStore(s => s.forms)
  const approveTicket = useAppStore(s => s.approveTicket)

  const ctx = useMemo(() => {
    if (!ticket) return null
    const form = forms.find(f => f.id === ticket.formId)
    const version = form?.versions.find(v => v.id === ticket.versionId) ?? form?.versions[0]
    return { form, version }
  }, [ticket, forms])

  if (!ticket || !ctx?.form || !ctx.version) {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">Ticket not found.</div>
        <div className="mt-3">
          <Link to="/review" className="underline">Back</Link>
        </div>
      </div>
    )
  }

  const { form, version } = ctx

  return (
    <div className="pb-10">
      <SectionHeader
        title="Review"
        subtitle={`${form.name} · ${ticket.id} · ${ticket.title}`}
        right={
          <>
            <Button variant="secondary" onClick={() => nav('/review')}>
              <ArrowLeft size={16} /> Back
            </Button>
            <Button variant="secondary" onClick={() => exportTicketPdf(ticket, form, version)}>
              <FileDown size={16} /> Export PDF
            </Button>
            <Button variant="secondary" onClick={() => exportTicketCsv(ticket, form, version)}>
              <FileSpreadsheet size={16} /> Export CSV
            </Button>
            <Button
              onClick={() => approveTicket(ticket.id)}
              disabled={ticket.approvalState === 'approved'}
            >
              <CheckCircle2 size={16} /> Approve & Archive
            </Button>
          </>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 items-start">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Completed Preview</CardTitle>
                <CardSub>Generated on sync (demo)</CardSub>
              </div>
              <Badge tone={ticket.status === 'synced' ? 'success' : ticket.status === 'error' ? 'danger' : ticket.status === 'queued' ? 'warning' : 'neutral'}>
                {ticket.status}
              </Badge>
            </div>
          </CardHeader>
          <CardBody>
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
              <div className="text-lg font-semibold">{form.name}</div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">{ticket.id} · {ticket.title}</div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {version.fields.map((f) => (
                  <div key={f.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{f.label}</div>
                    <div className="mt-1 font-medium break-words">
                      {ticket.values[f.key] == null || ticket.values[f.key] === '' ? '—' : String(ticket.values[f.key])}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Signature</div>
                <div className="mt-1 font-medium">{ticket.signature?.signer ?? '—'}</div>
                {ticket.signature?.dataUrl && (
                  <img src={ticket.signature.dataUrl} alt="signature" className="mt-2 h-[80px] w-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white" />
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Metadata</CardTitle>
              <CardSub>Submission info</CardSub>
            </CardHeader>
            <CardBody>
              <div className="text-sm">
                <div className="flex items-center justify-between py-1">
                  <span className="text-neutral-500 dark:text-neutral-400">Technician</span>
                  <span className="font-medium">{ticket.assignedTo}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-neutral-500 dark:text-neutral-400">Submitted</span>
                  <span className="font-medium">{dateTimeShort(ticket.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-neutral-500 dark:text-neutral-400">Form Version</span>
                  <span className="font-medium">{form.name} {version.version}</span>
                </div>
              </div>
              {ticket.lastError && <div className="mt-3 text-sm text-red-600 dark:text-red-300">{ticket.lastError}</div>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
              <CardSub>{ticket.attachments.length} file(s)</CardSub>
            </CardHeader>
            <CardBody>
              {ticket.attachments.length === 0 ? (
                <div className="text-sm text-neutral-500 dark:text-neutral-400">No attachments</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ticket.attachments.map((a) => (
                    <a key={a.id} href={a.dataUrl} download={a.name} className="rf-focus rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <img src={a.dataUrl} alt={a.name} className="w-full h-[110px] object-cover" />
                      <div className="p-2">
                        <div className="text-xs font-medium truncate">{a.name}</div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{a.mime}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval State</CardTitle>
              <CardSub>Auto-archive after approval</CardSub>
            </CardHeader>
            <CardBody>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">State</span>
                <Badge tone={ticket.approvalState === 'approved' ? 'success' : 'warning'}>
                  {ticket.approvalState}
                </Badge>
              </div>
              <div className="mt-3">
                <Button onClick={() => approveTicket(ticket.id)} disabled={ticket.approvalState === 'approved'}>
                  <CheckCircle2 size={16} /> Approve & Archive
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
