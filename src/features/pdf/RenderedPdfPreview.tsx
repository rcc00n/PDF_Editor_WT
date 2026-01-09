import { useMemo, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import type { Field, Ticket } from '@/entities/types'
import PdfPageCanvas from '@/features/pdf/PdfPageCanvas'
import Modal from '@/shared/ui/Modal'

const DEFAULT_FONT_SIZE = 12

type Props = {
  pdfUrl?: string
  fields: Field[]
  ticket: Ticket
}

export default function RenderedPdfPreview({ pdfUrl, fields, ticket }: Props) {
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState(1)
  const [fullOpen, setFullOpen] = useState(false)

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
            {pageFields.map((field) => (
              <RenderedField key={field.id} field={field} ticket={ticket} />
            ))}
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
