import type { Ticket, FormTemplate, FormVersion } from '@/entities/types'
import { downloadText } from '@/shared/lib/download'
import { jsPDF } from 'jspdf'

export function exportTicketCsv(ticket: Ticket, form: FormTemplate, version: FormVersion) {
  const keys = version.fields.map(f => f.key)
  const header = ['ticket_id', ...keys]
  const row = [ticket.id, ...keys.map(k => safeCsv(ticket.values[k]))]
  const csv = [header.join(','), row.join(',')].join('\n')
  downloadText(`${ticket.id}.csv`, csv, 'text/csv')
}

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
  doc.text('Signature', 40, y)
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

function safeCsv(v: any) {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return `"${s.replaceAll('"', '""')}"`
  }
  return s
}

function writeWrap(doc: jsPDF, text: string, x: number, y: number, width: number) {
  const lines = doc.splitTextToSize(text, width)
  doc.text(lines, x, y)
  return y + lines.length * 12
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
