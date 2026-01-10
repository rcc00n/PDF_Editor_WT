import { describe, expect, it } from 'vitest'
import type { Ticket } from '@/entities/types'
import { extractRig } from './ticketFilters'

const makeTicket = (values: Record<string, any>): Ticket => ({
  id: 'FT-0001',
  title: 'Test',
  formId: 'form-1',
  versionId: 'ver-1',
  assignedTo: 'Tech',
  assignedAt: '2024-01-01T00:00:00.000Z',
  status: 'pending',
  approvalState: 'pending',
  values,
  attachments: [],
  updatedAt: '2024-01-01T00:00:00.000Z'
})

describe('extractRig', () => {
  it('returns the first rig-like value', () => {
    const ticket = makeTicket({
      location: 'North',
      rig_id: '  Rig-42  ',
      rigNotes: 'Backup'
    })

    expect(extractRig(ticket)).toBe('Rig-42')
  })

  it('returns an empty string when no rig values are present', () => {
    const ticket = makeTicket({
      site: 'Delta',
      notes: ''
    })

    expect(extractRig(ticket)).toBe('')
  })
})
