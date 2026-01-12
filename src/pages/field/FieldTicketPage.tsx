import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import { Card, CardBody } from '@/shared/ui/Card'
import Badge from '@/shared/ui/Badge'
import Input from '@/shared/ui/Input'
import Modal from '@/shared/ui/Modal'
import { useAppStore } from '@/shared/state/useAppStore'
import type { Employee, Field } from '@/entities/types'
import { dateTimeShort } from '@/shared/lib/format'
import { downloadDataUrl } from '@/shared/lib/download'
import { exportRenderedFormPdf } from '@/features/export/exporters'
import RenderedPdfPreview from '@/features/pdf/RenderedPdfPreview'
import PdfPageCanvas from '@/features/pdf/PdfPageCanvas'
import SignaturePad from '@/features/field/SignaturePad'
import { resolveMaxLength } from '@/shared/lib/fieldLimits'
import { ArrowLeft, Save, Send, ImagePlus, FileDown, Eye } from 'lucide-react'

const DEFAULT_FONT_SIZE = 12

export default function FieldTicketPage() {
  const { ticketId = '' } = useParams()
  const nav = useNavigate()

  const ticket = useAppStore(s => s.tickets.find(t => t.id === ticketId))
  const forms = useAppStore(s => s.forms)
  const updateTicket = useAppStore(s => s.updateTicket)
  const employees = useAppStore(s => s.employees)
  const saveDraft = useAppStore(s => s.saveDraft)
  const submitTicket = useAppStore(s => s.submitTicket)
  const apiEnabled = useAppStore(s => s.apiEnabled)
  const uploadAttachment = useAppStore(s => s.uploadAttachment)
  const pushToast = useAppStore(s => s.pushToast)
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const [renderOpen, setRenderOpen] = useState(false)
  const [numPages, setNumPages] = useState(1)
  const [signatureField, setSignatureField] = useState<Field | null>(null)
  const [signatureDraft, setSignatureDraft] = useState<string | undefined>(undefined)
  const [signatureSigner, setSignatureSigner] = useState('')
  const [signatureApplyAll, setSignatureApplyAll] = useState(true)

  const ctx = useMemo(() => {
    if (!ticket) return null
    const form = forms.find(f => f.id === ticket.formId)
    const version = form?.versions.find(v => v.id === ticket.versionId) ?? form?.versions[0]
    const fields = (version?.fields ?? []).slice().sort((a, b) => (a.page - b.page) || (a.y - b.y) || (a.x - b.x))
    return { form, version, fields }
  }, [ticket, forms])

  if (!ticket || !ctx?.form || !ctx?.version) {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">Ticket not found.</div>
        <div className="mt-3">
          <Link to="/field" className="underline">Back</Link>
        </div>
      </div>
    )
  }

  const { form, version, fields } = ctx
  const renderPdfUrl = version.pdf?.dataUrl ?? version.pdf?.url
  const canvas = version.canvas ?? { width: 210, height: 297 }
  const signatureFields = useMemo(() => fields.filter((f) => f.type === 'signature'), [fields])
  const pageList = renderPdfUrl ? Array.from({ length: Math.max(1, numPages) }, (_, i) => i + 1) : [1]

  const openSignatureModal = (field: Field) => {
    const existing = signatureFromValue(ticket.values[field.key]) ?? ticket.signature ?? null
    setSignatureField(field)
    setSignatureSigner((existing?.signer || ticket.assignedTo || '').trim())
    setSignatureDraft(existing?.dataUrl || existing?.url)
    setSignatureApplyAll(true)
  }

  const closeSignatureModal = () => {
    setSignatureField(null)
    setSignatureDraft(undefined)
    setSignatureSigner('')
    setSignatureApplyAll(true)
  }

  const saveSignature = () => {
    if (!signatureField) return
    const signer = (signatureSigner || ticket.assignedTo || '').trim()
    const signatureValue = buildSignatureValue(signatureDraft, signer)
    const nextValues = { ...ticket.values }
    if (signatureApplyAll) {
      for (const f of signatureFields) {
        nextValues[f.key] = signatureValue
      }
    } else {
      nextValues[signatureField.key] = signatureValue
    }
    const patch = signatureApplyAll ? { values: nextValues, signature: signatureValue } : { values: nextValues }
    updateTicket(ticket.id, patch)
    closeSignatureModal()
  }

  return (
    <div className="pb-10">
      <SectionHeader
        title={`${form.name}`}
        subtitle={`${ticket.id} · ${ticket.title} · ${ticket.assignedTo} · ${dateTimeShort(ticket.assignedAt)} · ${version.version}`}
        right={
          <>
            <Button variant="secondary" onClick={() => nav('/field')}>
              <ArrowLeft size={16} /> Back
            </Button>
            <Button variant="secondary" onClick={() => void saveDraft(ticket.id)}>
              <Save size={16} /> Save Draft
            </Button>
            <Button
              variant="secondary"
              disabled={!renderPdfUrl}
              onClick={() => setRenderOpen(true)}
              title={renderPdfUrl ? 'View rendered PDF' : 'No PDF uploaded yet'}
            >
              <Eye size={16} /> View Rendered PDF
            </Button>
            <Button onClick={() => void submitTicket(ticket.id)}>
              <Send size={16} /> Submit (Queued)
            </Button>
          </>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 items-start">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Fill on PDF</div>
              <Badge tone={ticket.status === 'synced' ? 'success' : ticket.status === 'error' ? 'danger' : ticket.status === 'queued' ? 'warning' : 'neutral'}>
                {ticket.status}
              </Badge>
            </div>

            <div className="mt-3 space-y-6">
              {fields.length === 0 && (
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  This version has no mapped fields yet. Open the Builder and add fields.
                </div>
              )}

              {pageList.map((pageIndex) => {
                const pageFields = fields.filter((f) => f.page === pageIndex)
                return (
                  <div key={pageIndex} className="space-y-2">
                    {pageList.length > 1 && (
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">Page {pageIndex}</div>
                    )}
                    <div className="relative">
                      {renderPdfUrl ? (
                        <PdfPageCanvas
                          dataUrl={renderPdfUrl}
                          page={pageIndex}
                          onMeta={pageIndex === 1 ? (meta) => setNumPages(meta.numPages) : undefined}
                        />
                      ) : (
                        <div
                          className="w-full rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white/70 dark:bg-neutral-950/40 flex items-center justify-center p-6 text-center"
                          style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
                        >
                          <div className="pointer-events-none">
                            <div className="text-sm font-medium">Upload a PDF to lock the layout</div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                              You can still place fields on this blank page.
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0">
                        {pageFields.map((f) => (
                          <OverlayField
                            key={f.id}
                            field={f}
                            value={ticket.values[f.key]}
                            employees={employees}
                            creatorName={ticket.assignedTo}
                            signature={signatureFromValue(ticket.values[f.key]) ?? ticket.signature ?? null}
                            onChange={(val) => {
                              updateTicket(ticket.id, { values: { ...ticket.values, [f.key]: val } })
                            }}
                            onOpenSignature={() => openSignatureModal(f)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 flex justify-between gap-3">
              <div>{renderPdfUrl ? 'Tap fields to edit' : 'PDF not uploaded yet'}</div>
              <div>{renderPdfUrl ? version.pdf?.name ?? 'PDF' : 'No PDF'}</div>
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardBody>
              <div className="text-sm font-semibold">Photo Attachments</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {apiEnabled ? 'Stored on server' : 'Stored locally (demo)'}
              </div>

              <input
                ref={attachmentInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (apiEnabled) {
                    void uploadAttachment(ticket.id, file)
                      .then(() => pushToast({ title: 'Attachment added', message: file.name, variant: 'success' }))
                      .catch((err) => pushToast({ title: 'Upload failed', message: err?.message || 'Unable to upload attachment', variant: 'danger' }))
                  } else {
                    const reader = new FileReader()
                    reader.onload = () => {
                      const dataUrl = String(reader.result)
                      const next = [
                        ...ticket.attachments,
                        { id: `${Date.now()}_${Math.random()}`, name: file.name, mime: file.type, dataUrl }
                      ]
                      updateTicket(ticket.id, { attachments: next })
                      useAppStore.getState().pushToast({ title: 'Attachment added', message: file.name, variant: 'success' })
                    }
                    reader.readAsDataURL(file)
                  }
                  e.currentTarget.value = ''
                }}
              />
              <Button
                variant="secondary"
                type="button"
                onClick={() => attachmentInputRef.current?.click()}
              >
                <ImagePlus size={16} /> Add photo
              </Button>

              <div className="mt-3 flex flex-col gap-2">
                {ticket.attachments.length === 0 && (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">No photos</div>
                )}
                {ticket.attachments.map((a) => {
                  const src = attachmentSrc(a)
                  return (
                    <div key={a.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{a.name}</div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{a.mime}</div>
                        </div>
                        <button
                          className="rf-focus rounded-xl px-2 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
                          onClick={() => {
                            if (a.dataUrl) return downloadDataUrl(a.name, a.dataUrl)
                            if (a.url) window.open(a.url, '_blank', 'noopener,noreferrer')
                          }}
                        >
                          <FileDown size={16} />
                        </button>
                      </div>
                      {src && (
                        <img src={src} alt={a.name} className="mt-2 w-full rounded-xl border border-neutral-200 dark:border-neutral-800" />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>

          {ticket.lastError && (
            <Card>
              <CardBody>
                <div className="text-sm font-semibold">Error</div>
                <div className="mt-2 text-sm text-red-600 dark:text-red-300">{ticket.lastError}</div>
              </CardBody>
            </Card>
          )}
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

      <Modal
        open={Boolean(signatureField)}
        onClose={closeSignatureModal}
        title={signatureField ? `Signature · ${signatureField.label}` : 'Signature'}
        className="max-w-3xl"
      >
        <div className="space-y-4">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Signer</div>
            <Input value={signatureSigner} onChange={(e) => setSignatureSigner(e.target.value)} />
          </div>
          {signatureFields.length > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <input
                id="signature-apply-all"
                type="checkbox"
                checked={signatureApplyAll}
                onChange={(e) => setSignatureApplyAll(e.target.checked)}
              />
              <label htmlFor="signature-apply-all">Apply this signature to all signature fields</label>
            </div>
          )}
          <SignaturePad value={signatureDraft} onChange={setSignatureDraft} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeSignatureModal}>Cancel</Button>
            <Button onClick={saveSignature}>Save signature</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function attachmentSrc(attachment: { url?: string; dataUrl?: string }) {
  return attachment.url || attachment.dataUrl || ''
}

type SignatureValue = { signer: string; dataUrl?: string; url?: string }

function OverlayField({
  field,
  value,
  employees,
  creatorName,
  signature,
  onChange,
  onOpenSignature
}: {
  field: Field
  value: any
  employees: Employee[]
  creatorName: string
  signature: SignatureValue | null
  onChange: (v: any) => void
  onOpenSignature: () => void
}) {
  const fontSize = field.fontSize ?? DEFAULT_FONT_SIZE
  const readOnly = field.readOnly === true
  const maxLength = resolveMaxLength(field)
  const options = (field.options ?? []).map((opt) => opt.trim()).filter(Boolean)

  useEffect(() => {
    if (!field.autoValue) return
    if (value !== undefined && value !== null && value !== '') return
    if (field.autoValue === 'today' && field.type === 'date') {
      const today = localIsoDate()
      if (today !== value) onChange(today)
      return
    }
    if (field.autoValue === 'creator' && field.type === 'text' && creatorName) {
      if (creatorName !== value) onChange(creatorName)
    }
  }, [creatorName, field.autoValue, field.type, onChange, value])

  const wrapperStyle = {
    left: `${field.x * 100}%`,
    top: `${field.y * 100}%`,
    width: `${field.w * 100}%`,
    height: `${field.h * 100}%`,
    minWidth: '24px',
    minHeight: '24px'
  } as const

  const inputClass =
    'rf-focus h-full w-full rounded-md border border-neutral-300 bg-white/90 px-1 text-[12px] leading-tight placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-950/80'

  if (field.type === 'signature') {
    const src = signature?.dataUrl || signature?.url || ''
    return (
      <div className="absolute" style={wrapperStyle}>
        <button
          type="button"
          className="rf-focus relative h-full w-full rounded-md border border-dashed border-neutral-400/70 bg-white/80 text-[10px] text-neutral-600 dark:border-neutral-600/60 dark:bg-neutral-950/70 dark:text-neutral-300"
          onClick={onOpenSignature}
          disabled={readOnly}
          title={field.label}
        >
          <span className="absolute left-1 top-1 rounded-md bg-white/80 px-1 py-0.5 text-[9px] text-neutral-700 dark:bg-neutral-950/70 dark:text-neutral-300">
            {field.label}
          </span>
          {src ? (
            <img src={src} alt="signature" className="h-full w-full object-contain" />
          ) : (
            <span className="px-1">Tap to sign</span>
          )}
        </button>
      </div>
    )
  }

  if (field.type === 'photo') {
    return (
      <div className="absolute" style={wrapperStyle}>
        <div
          className="h-full w-full rounded-md border border-dashed border-neutral-300/80 bg-white/70 px-1 text-[10px] text-neutral-500 flex items-center justify-center dark:border-neutral-700/70 dark:bg-neutral-950/60 dark:text-neutral-400"
          title={field.label}
        >
          {field.label}
        </div>
      </div>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <div className="absolute flex items-center justify-center" style={wrapperStyle} title={field.label}>
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={readOnly}
        />
      </div>
    )
  }

  if (field.type === 'select' || field.type === 'radio') {
    return (
      <div className="absolute" style={wrapperStyle} title={field.label}>
        <select
          className={inputClass}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly || options.length === 0}
          style={{ fontSize }}
        >
          <option value="">{options.length ? 'Select' : 'No options'}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    )
  }

  if (field.type === 'employee') {
    const activeEmployees = employees.filter((e) => e.active)
    return (
      <div className="absolute" style={wrapperStyle} title={field.label}>
        <select
          className={inputClass}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          style={{ fontSize }}
        >
          <option value="">Select</option>
          {activeEmployees.map((e) => (
            <option key={e.id} value={e.name}>
              {e.name}{e.role ? ` · ${e.role}` : ''}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (field.key === 'notes') {
    return (
      <div className="absolute" style={wrapperStyle} title={field.label}>
        <textarea
          className={`${inputClass} resize-none`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          maxLength={maxLength}
          style={{ fontSize }}
        />
      </div>
    )
  }

  if (field.type === 'date') {
    return (
      <div className="absolute" style={wrapperStyle} title={field.label}>
        <input
          type="date"
          className={inputClass}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          style={{ fontSize }}
        />
      </div>
    )
  }

  if (field.type === 'numeric') {
    return (
      <div className="absolute" style={wrapperStyle} title={field.label}>
        <input
          type="number"
          className={inputClass}
          value={value ?? ''}
          onChange={(e) => {
            const raw = e.target.value
            const trimmed = maxLength ? raw.slice(0, maxLength) : raw
            onChange(trimmed === '' ? '' : Number(trimmed))
          }}
          readOnly={readOnly}
          style={{ fontSize }}
        />
      </div>
    )
  }

  return (
    <div className="absolute" style={wrapperStyle} title={field.label}>
      <input
        className={inputClass}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        maxLength={maxLength}
        style={{ fontSize }}
      />
    </div>
  )
}

function signatureFromValue(value: any): SignatureValue | null {
  if (!value || typeof value !== 'object') return null
  const signer = typeof value.signer === 'string' ? value.signer : ''
  const dataUrl = typeof value.dataUrl === 'string' ? value.dataUrl : undefined
  const url = typeof value.url === 'string' ? value.url : undefined
  if (!signer && !dataUrl && !url) return null
  return { signer, dataUrl, url }
}

function buildSignatureValue(src: string | undefined, signer: string): SignatureValue {
  const next: SignatureValue = { signer }
  if (!src) return next
  if (src.startsWith('data:')) {
    next.dataUrl = src
  } else {
    next.url = src
  }
  return next
}

function localIsoDate() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}
