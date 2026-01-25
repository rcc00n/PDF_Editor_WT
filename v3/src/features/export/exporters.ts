import type { Ticket, FormTemplate, FormVersion } from '@/entities/types'
import { jsPDF } from 'jspdf'
import { signatureRoleLabel } from '@/shared/lib/signatureRoles'

const DEFAULT_FONT_SIZE = 12

export async function exportTicketPdf(ticket: Ticket, form: FormTemplate, version: FormVersion) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  let y = 56

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(form.name, 40, y)
  y += 18

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`${ticket.id} · ${ticket.title}`, 40, y)
  y += 16
  doc.text(`Assigned: ${ticket.assignedTo}`, 40, y)
  y += 16
  doc.text(`Version: ${version.version}`, 40, y)
  y += 22

  doc.setFont('helvetica', 'bold')
  doc.text('Values', 40, y)
  y += 14
  doc.setFont('helvetica', 'normal')

  for (const f of version.fields) {
    const v = ticket.values[f.key]
    const line = `${f.label}: ${v == null ? '' : String(v)}`
    y = writeWrap(doc, line, 40, y, 520)
    y += 6
    if (y > 760) {
      doc.addPage()
      y = 56
    }
  }

  y += 10
  doc.setFont('helvetica', 'bold')
  doc.text('Attachments', 40, y)
  y += 14
  doc.setFont('helvetica', 'normal')
  if (ticket.attachments.length === 0) {
    doc.text('—', 40, y)
    y += 14
  } else {
    for (const a of ticket.attachments) {
      y = writeWrap(doc, `${a.name} (${a.mime})`, 40, y, 520)
      y += 6
      if (y > 760) {
        doc.addPage()
        y = 56
      }
    }
  }

  y += 10
  doc.setFont('helvetica', 'bold')
  doc.text(`Signature (${signatureRoleLabel(ticket.signatureRole ?? 'employee')})`, 40, y)
  y += 14
  doc.setFont('helvetica', 'normal')
  doc.text(ticket.signature?.signer ?? '—', 40, y)
  y += 10

  const signatureDataUrl = ticket.signature?.dataUrl || (ticket.signature?.url ? await fetchDataUrl(ticket.signature.url) : null)
  if (signatureDataUrl) {
    try {
      const format = signatureDataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'
      doc.addImage(signatureDataUrl, format, 40, y, 240, 80)
    } catch {
      // ignore
    }
  }

  doc.save(`${ticket.id}.pdf`)
}

export async function exportRenderedFormPdf(ticket: Ticket, version: FormVersion) {
  const source = version.pdf?.dataUrl ?? version.pdf?.url
  if (!source) {
    throw new Error('No PDF available for this version')
  }

  const pdfjs = await import('pdfjs-dist')
  // @ts-ignore
  const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  // @ts-ignore
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

  const isData = source.startsWith('data:')
  const loadingTask = isData
    ? pdfjs.getDocument({ data: dataUrlToBytes(source) })
    : pdfjs.getDocument({ url: source })
  const pdf = await loadingTask.promise

  const firstPage = await pdf.getPage(1)
  const firstViewport = firstPage.getViewport({ scale: 1 })
  const doc = new jsPDF({ unit: 'pt', format: [firstViewport.width, firstViewport.height] })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(20, 20, 20)

  const signatureDataUrl = ticket.signature?.dataUrl || (ticket.signature?.url ? await fetchDataUrl(ticket.signature.url) : null)
  const signatureFormat = signatureDataUrl?.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = pageIndex === 1 ? firstPage : await pdf.getPage(pageIndex)
    const viewport = page.getViewport({ scale: 1 })

    if (pageIndex > 1) {
      doc.addPage([viewport.width, viewport.height], viewport.width > viewport.height ? 'landscape' : 'portrait')
    }

    // Render the PDF page to an image so we can overlay text.
    const renderViewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) continue
    canvas.width = Math.floor(renderViewport.width)
    canvas.height = Math.floor(renderViewport.height)
    await page.render({ canvasContext: context, viewport: renderViewport }).promise
    const imgData = canvas.toDataURL('image/png')
    doc.addImage(imgData, 'PNG', 0, 0, viewport.width, viewport.height)

    const pageFields = version.fields.filter((f) => f.page === pageIndex)
    for (const field of pageFields) {
      const x = field.x * viewport.width
      const y = field.y * viewport.height
      const w = field.w * viewport.width
      const h = field.h * viewport.height
      const fontSize = field.fontSize ?? DEFAULT_FONT_SIZE
      const padding = Math.min(6, fontSize * 0.4)

      if (field.type === 'signature') {
        if (signatureDataUrl) {
          doc.addImage(signatureDataUrl, signatureFormat, x, y, w, h)
        } else if (ticket.signature?.signer) {
          doc.setFontSize(fontSize)
          doc.text(ticket.signature.signer, x + padding, y + padding + fontSize, { maxWidth: Math.max(0, w - padding * 2) })
        }
        continue
      }

      if (field.type === 'photo') {
        const label = ticket.attachments.length ? `${ticket.attachments.length} photo(s)` : ''
        if (!label) continue
        doc.setFontSize(fontSize)
        doc.text(label, x + padding, y + padding + fontSize, { maxWidth: Math.max(0, w - padding * 2) })
        continue
      }

      if (field.type === 'checkbox') {
        if (!ticket.values[field.key]) continue
        doc.setFontSize(fontSize)
        doc.text('X', x + padding, y + padding + fontSize)
        continue
      }

      const raw = ticket.values[field.key]
      if (raw == null || raw === '') continue
      const text = String(raw)
      const maxWidth = Math.max(0, w - padding * 2)
      doc.setFontSize(fontSize)
      const lines = maxWidth ? doc.splitTextToSize(text, maxWidth) : [text]
      const lineHeight = fontSize * 1.15
      const maxLines = Math.max(1, Math.floor((h - padding * 2) / lineHeight))
      const clipped = lines.slice(0, maxLines)
      doc.text(clipped, x + padding, y + padding + fontSize, { lineHeightFactor: 1.15 })
    }
  }

  doc.save(`${ticket.id}-rendered.pdf`)
}

function writeWrap(doc: jsPDF, text: string, x: number, y: number, width: number) {
  const lines = doc.splitTextToSize(text, width)
  doc.text(lines, x, y)
  return y + lines.length * 12
}

function dataUrlToBytes(dataUrl: string) {
  const idx = dataUrl.indexOf(',')
  const b64 = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl
  const bin = atob(b64)
  const len = bin.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i += 1) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function fetchDataUrl(url: string) {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    return await blobToDataUrl(blob)
  } catch {
    return null
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(blob)
  })
}
