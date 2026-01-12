import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import { Card, CardBody, CardHeader, CardSub, CardTitle } from '@/shared/ui/Card'
import Badge from '@/shared/ui/Badge'
import Modal from '@/shared/ui/Modal'
import { useAppStore } from '@/shared/state/useAppStore'
import { dateTimeShort } from '@/shared/lib/format'
import { exportRenderedFormPdf, exportTicketPdf } from '@/features/export/exporters'
import RenderedPdfPreview from '@/features/pdf/RenderedPdfPreview'
import { ArrowLeft, FileDown, CheckCircle2, Eye } from 'lucide-react'

export default function ReviewTicketPage() {
  const { ticketId = '' } = useParams()
  const nav = useNavigate()

  const ticket = useAppStore(s => s.tickets.find(t => t.id === ticketId))
  const forms = useAppStore(s => s.forms)
  const approveTicket = useAppStore(s => s.approveTicket)
  const pushToast = useAppStore(s => s.pushToast)
  const [renderOpen, setRenderOpen] = useState(false)

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
          <Link to="/dashboard" className="underline">Back</Link>
        </div>
      </div>
    )
  }

  const { form, version } = ctx
  const renderPdfUrl = version.pdf?.dataUrl ?? version.pdf?.url

  return (
    <div className="pb-10">
      <SectionHeader
        title="Review"
        subtitle={`${form.name} · ${ticket.id} · ${ticket.title}`}
        right={
          <>
            <Button variant="secondary" onClick={() => nav('/dashboard')}>
              <ArrowLeft size={16} /> Back
            </Button>
            <Button variant="secondary" onClick={() => exportTicketPdf(ticket, form, version)}>
              <FileDown size={16} /> Export PDF
            </Button>
            <Button
              variant="secondary"
              disabled={!renderPdfUrl}
              onClick={() => setRenderOpen(true)}
              title={renderPdfUrl ? 'View rendered PDF' : 'No PDF uploaded yet'}
            >
              <Eye size={16} /> View Rendered PDF
            </Button>
            <Button
              onClick={() => void approveTicket(ticket.id)}
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
                {version.fields.map((f) => {
                  if (f.type === 'signature') {
                    const sig = signatureFromValue(ticket.values[f.key]) ?? ticket.signature ?? null
                    const src = signatureSrc(sig)
                    return (
                      <div key={f.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{f.label}</div>
                        <div className="mt-1 font-medium">{sig?.signer || '—'}</div>
                        {src && (
                          <img src={src} alt="signature" className="mt-2 h-[80px] w-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white" />
                        )}
                      </div>
                    )
                  }

                  if (f.type === 'photo') {
                    return (
                      <div key={f.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{f.label}</div>
                        <div className="mt-1 font-medium">{ticket.attachments.length ? `${ticket.attachments.length} file(s)` : '—'}</div>
                      </div>
                    )
                  }

                  const raw = ticket.values[f.key]
                  return (
                    <div key={f.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">{f.label}</div>
                      <div className="mt-1 font-medium break-words">
                        {raw == null || raw === '' ? '—' : String(raw)}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Signatures</div>
                <div className="mt-3 space-y-3">
                  {version.fields.filter((f) => f.type === 'signature').length === 0 && (
                    <div className="font-medium">—</div>
                  )}
                  {version.fields.filter((f) => f.type === 'signature').map((f) => {
                    const sig = signatureFromValue(ticket.values[f.key]) ?? ticket.signature ?? null
                    const src = signatureSrc(sig)
                    return (
                      <div key={f.id}>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{f.label}</div>
                        <div className="mt-1 font-medium">{sig?.signer || '—'}</div>
                        {src && (
                          <img src={src} alt="signature" className="mt-2 h-[80px] w-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white" />
                        )}
                      </div>
                    )
                  })}
                </div>
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
                  {ticket.attachments.map((a) => {
                    const src = attachmentSrc(a)
                    if (!src) return null
                    return (
                      <a key={a.id} href={src} download={a.name} className="rf-focus rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:bg-neutral-50 dark:hover:bg-neutral-900">
                        <img src={src} alt={a.name} className="w-full h-[110px] object-cover" />
                        <div className="p-2">
                          <div className="text-xs font-medium truncate">{a.name}</div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{a.mime}</div>
                        </div>
                      </a>
                    )
                  })}
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
                <Button onClick={() => void approveTicket(ticket.id)} disabled={ticket.approvalState === 'approved'}>
                  <CheckCircle2 size={16} /> Approve & Archive
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        open={renderOpen}
        onClose={() => setRenderOpen(false)}
        title="Rendered PDF"
        className="max-w-5xl"
      >
        {!renderPdfUrl ? (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            No PDF uploaded for this version yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {ticket.id} · {ticket.assignedTo} · {version.version}
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  void exportRenderedFormPdf(ticket, version).catch((err: any) => {
                    pushToast({ title: 'Export failed', message: err?.message || 'Unable to export rendered PDF', variant: 'danger' })
                  })
                }}
              >
                <FileDown size={16} /> Download Rendered PDF
              </Button>
            </div>
            <RenderedPdfPreview
              pdfUrl={renderPdfUrl}
              fields={version.fields}
              ticket={ticket}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

function attachmentSrc(attachment: { url?: string; dataUrl?: string }) {
  return attachment.url || attachment.dataUrl || ''
}

type SignatureValue = { signer?: string; dataUrl?: string; url?: string }

function signatureFromValue(value: any): SignatureValue | null {
  if (!value || typeof value !== 'object') return null
  if (!('signer' in value) && !('dataUrl' in value) && !('url' in value)) return null
  return value as SignatureValue
}

function signatureSrc(signature?: SignatureValue | null) {
  if (!signature) return ''
  return signature.dataUrl || signature.url || ''
}
