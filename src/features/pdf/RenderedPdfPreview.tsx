import { useMemo, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import type { Employee, Field, Ticket } from '@/entities/types'
import PdfPageCanvas from '@/features/pdf/PdfPageCanvas'
import Modal from '@/shared/ui/Modal'

const DEFAULT_FONT_SIZE = 12

type Props = {
  pdfUrl?: string
  fields: Field[]
  ticket: Ticket
  interactive?: boolean
  employees?: Employee[]
  onValueChange?: (key: string, value: any) => void
  onSignatureClick?: () => void
  onPhotoClick?: () => void
}

export default function RenderedPdfPreview({
  pdfUrl,
  fields,
  ticket,
  interactive = false,
  employees = [],
  onValueChange,
  onSignatureClick,
  onPhotoClick
}: Props) {
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState(1)
  const [fullOpen, setFullOpen] = useState(false)
  const canEdit = interactive && typeof onValueChange === 'function'
  const handleValueChange =
    onValueChange ?? ((_: string, __: any) => {})

  const pageFields = useMemo(
    () => fields.filter((f) => f.page === page),
    [fields, page]
  )

  if (!pdfUrl) {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 text-sm text-neutral-500 dark:text-neutral-400">
        No PDF uploaded for this version.
      </div>
    )
  }

  const preview = (fullscreen: boolean) => (
    <div className={fullscreen ? 'flex h-full min-h-0 flex-col gap-3' : 'space-y-3'}>
      <div className="flex items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
        <div>Page {page} / {numPages}</div>
        <div className="flex items-center gap-2">
          <button
            className="rf-focus rounded-xl px-2 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            type="button"
          >
            &lt;
          </button>
          <button
            className="rf-focus rounded-xl px-2 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            type="button"
          >
            &gt;
          </button>
          <button
            className="rf-focus rounded-xl p-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
            onClick={() => setFullOpen((s) => !s)}
            type="button"
            title={fullscreen ? 'Exit full screen' : 'Full screen'}
            aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div className={fullscreen ? 'flex-1 min-h-0 overflow-auto rf-scrollbar' : ''}>
        <div className="relative">
          <PdfPageCanvas
            dataUrl={pdfUrl}
            page={page}
            onMeta={(meta) => {
              setNumPages(meta.numPages)
              setPage((p) => Math.min(p, meta.numPages))
            }}
          />

          <div className="absolute inset-0 pointer-events-none">
            {pageFields.map((field) =>
              canEdit ? (
                <EditableField
                  key={field.id}
                  field={field}
                  ticket={ticket}
                  employees={employees}
                  onValueChange={handleValueChange}
                  onSignatureClick={onSignatureClick}
                  onPhotoClick={onPhotoClick}
                />
              ) : (
                <RenderedField key={field.id} field={field} ticket={ticket} />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {!fullOpen && preview(false)}
      <Modal
        open={fullOpen}
        onClose={() => setFullOpen(false)}
        title="Rendered PDF"
        className="max-w-none w-[96vw] h-[96vh] flex flex-col"
        bodyClassName="flex-1 min-h-0 overflow-hidden"
      >
        {preview(true)}
      </Modal>
    </>
  )
}

function RenderedField({ field, ticket }: { field: Field; ticket: Ticket }) {
  const fontSize = field.fontSize ?? DEFAULT_FONT_SIZE
  const value = ticket.values[field.key]
  const signatureSrc = ticket.signature?.dataUrl ?? ticket.signature?.url
  const signer = ticket.signature?.signer ?? ''

  const style = {
    left: `${field.x * 100}%`,
    top: `${field.y * 100}%`,
    width: `${field.w * 100}%`,
    height: `${field.h * 100}%`,
    fontSize: `${fontSize}px`,
    lineHeight: 1.2
  } as const

  if (field.type === 'signature') {
    return (
      <div className="absolute overflow-hidden" style={style}>
        {signatureSrc ? (
          <img src={signatureSrc} alt="signature" className="h-full w-full object-contain" />
        ) : (
          <div className="px-1 py-0.5 text-neutral-900 break-words">
            {signer}
          </div>
        )}
      </div>
    )
  }

  if (field.type === 'photo') {
    const label = ticket.attachments.length ? `${ticket.attachments.length} photo(s)` : ''
    if (!label) return null
    return (
      <div
        className="absolute px-1 py-0.5 text-neutral-900 overflow-hidden break-words"
        style={style}
      >
        {label}
      </div>
    )
  }

  if (field.type === 'checkbox') {
    const checked = Boolean(value)
    if (!checked) return null
    return (
      <div className="absolute flex items-center justify-center font-semibold text-neutral-900" style={style}>
        X
      </div>
    )
  }

  const text = value == null ? '' : String(value)
  if (!text) return null

  return (
    <div
      className="absolute px-1 py-0.5 text-neutral-900 overflow-hidden whitespace-pre-wrap break-words"
      style={style}
    >
      {text}
    </div>
  )
}

function EditableField({
  field,
  ticket,
  employees,
  onValueChange,
  onSignatureClick,
  onPhotoClick
}: {
  field: Field
  ticket: Ticket
  employees: Employee[]
  onValueChange: (key: string, value: any) => void
  onSignatureClick?: () => void
  onPhotoClick?: () => void
}) {
  const fontSize = field.fontSize ?? DEFAULT_FONT_SIZE
  const value = ticket.values[field.key]
  const signatureSrc = ticket.signature?.dataUrl ?? ticket.signature?.url
  const signer = ticket.signature?.signer ?? ''
  const readOnly = field.readOnly === true
  const options = (field.options ?? []).map((opt) => opt.trim()).filter(Boolean)

  const style = {
    left: `${field.x * 100}%`,
    top: `${field.y * 100}%`,
    width: `${field.w * 100}%`,
    height: `${field.h * 100}%`,
    fontSize: `${fontSize}px`,
    lineHeight: 1.15
  } as const

  const inputClass =
    'w-full h-full rounded-md border border-[var(--rf-border)] bg-white/85 px-1.5 py-0.5 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--rf-orange-200)]'

  if (field.type === 'checkbox') {
    return (
      <div
        className="absolute pointer-events-auto flex items-center justify-center"
        style={style}
      >
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onValueChange(field.key, e.target.checked)}
          disabled={readOnly}
          className="h-4 w-4 accent-[var(--rf-orange-600)]"
          aria-label={field.label}
        />
      </div>
    )
  }

  if (field.type === 'select' || field.type === 'radio') {
    return (
      <div className="absolute pointer-events-auto" style={style}>
        <select
          className={inputClass}
          value={value ?? ''}
          onChange={(e) => onValueChange(field.key, e.target.value)}
          disabled={readOnly || options.length === 0}
          aria-label={field.label}
        >
          <option value="">{options.length ? field.label : 'No options'}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (field.type === 'employee') {
    const activeEmployees = employees.filter((e) => e.active)
    return (
      <div className="absolute pointer-events-auto" style={style}>
        <select
          className={inputClass}
          value={value ?? ''}
          onChange={(e) => onValueChange(field.key, e.target.value)}
          disabled={readOnly || activeEmployees.length === 0}
          aria-label={field.label}
        >
          <option value="">
            {activeEmployees.length ? field.label : 'No employees'}
          </option>
          {activeEmployees.map((emp) => (
            <option key={emp.id} value={emp.name}>
              {emp.name}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (field.type === 'signature') {
    return (
      <button
        type="button"
        className="absolute pointer-events-auto flex items-center justify-center rounded-md border border-[var(--rf-border)] bg-white/85 text-[11px] text-neutral-700 hover:bg-[var(--rf-orange-50)]"
        style={style}
        onClick={onSignatureClick}
        title={field.label}
      >
        {signatureSrc ? (
          <img src={signatureSrc} alt="signature" className="h-full w-full object-contain" />
        ) : (
          <span>{signer || 'Tap to sign'}</span>
        )}
      </button>
    )
  }

  if (field.type === 'photo') {
    const label = ticket.attachments.length
      ? `${ticket.attachments.length} photo(s)`
      : 'Add photo'
    return (
      <button
        type="button"
        className="absolute pointer-events-auto flex items-center justify-center rounded-md border border-[var(--rf-border)] bg-white/85 text-[11px] text-neutral-700 hover:bg-[var(--rf-orange-50)]"
        style={style}
        onClick={onPhotoClick}
        title={field.label}
      >
        {label}
      </button>
    )
  }

  const inputType =
    field.type === 'numeric'
      ? 'number'
      : field.type === 'date'
      ? 'date'
      : 'text'

  return (
    <div className="absolute pointer-events-auto" style={style}>
      <input
        type={inputType}
        className={inputClass}
        value={value ?? ''}
        onChange={(e) => onValueChange(field.key, e.target.value)}
        disabled={readOnly}
        placeholder={field.label}
        aria-label={field.label}
      />
    </div>
  )
}
