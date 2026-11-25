import { describe, expect, it } from 'vitest'
import type { FormVersion, Ticket } from '@/entities/types'
import { buildTicketPdf } from './exporters'

// Exercise real document generation after jsPDF upgrades; only browser download
// is kept separate. No operational record, server or external document is used.
describe('ticket PDF export', () => {

  it('produces a PDF carrying the ticket identity, field value and signer', async () => {
    const version: FormVersion = {
      id: 'version-test', version: 'v1.0', status: 'active', fieldCount: 1,
      fields: [{ id: 'field-test', type: 'text', label: 'Site', key: 'site', required: true,
        validation: { kind: 'none' }, page: 1, x: 0, y: 0, w: 1, h: 1 }]
    }
    const ticket: Ticket = {
      id: 'synthetic-ticket', formId: 'form-test', versionId: version.id,
      title: 'Synthetic inspection', assignedTo: 'Demo reviewer',
      status: 'pending', approvalState: 'pending',
      assignedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      values: { site: 'Example site' }, attachments: [],
      signature: { signer: 'Synthetic signer' }
    }
    const doc = await buildTicketPdf(ticket, { id: 'form-test', name: 'Synthetic form', versions: [version] }, version)
    const output = doc.output()
    expect(doc.getNumberOfPages()).toBe(1)
    expect(output.startsWith('%PDF-')).toBe(true)
    expect(output).toContain('Example site')
    expect(output).toContain('Synthetic signer')
  })
})
