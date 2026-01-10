import { describe, expect, it } from 'vitest'
import type { Ticket } from '@/entities/types'
import { extractRig, filterTickets, groupTicketsByForm } from './ticketFilters'

const baseTicket: Ticket = {
  id: 'FT-0001',
  title: 'Test',
  formId: 'form-1',
  versionId: 'ver-1',
  assignedTo: 'Tech',
  assignedAt: '2024-01-01T00:00:00.000Z',
  status: 'pending',
  approvalState: 'pending',
  values: {},
  attachments: [],
  updatedAt: '2024-01-01T00:00:00.000Z'
}

const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  ...baseTicket,
  ...overrides,
  values: overrides.values ?? baseTicket.values,
  attachments: overrides.attachments ?? baseTicket.attachments
})

describe('extractRig', () => {
  it('returns the first rig-like value', () => {
    const ticket = makeTicket({
      values: {
        location: 'North',
        rig_id: '  Rig-42  ',
        rigNotes: 'Backup'
      }
    })

    expect(extractRig(ticket)).toBe('Rig-42')
  })

  it('returns an empty string when no rig values are present', () => {
    const ticket = makeTicket({
      values: {
        site: 'Delta',
        notes: ''
      }
    })

    expect(extractRig(ticket)).toBe('')
  })
})

describe('filterTickets', () => {
  const tickets = [
    makeTicket({
      id: 'FT-0001',
      title: 'Alpha Pump',
      status: 'pending',
      assignedAt: '2024-01-10T10:00:00.000Z',
      values: { rig: 'Rig-1' }
    }),
    makeTicket({
      id: 'FT-0002',
      title: 'Bravo Pump',
      status: 'queued',
      assignedAt: '2024-01-11T10:00:00.000Z',
      values: { rig_name: 'Rig-2' }
    }),
    makeTicket({
      id: 'FT-0003',
      title: 'Charlie Pump',
      status: 'synced',
      assignedAt: '2024-01-12T10:00:00.000Z',
      values: { site: 'Delta' }
    })
  ]

  it('filters by status', () => {
    expect(filterTickets(tickets, { status: 'queued' })).toEqual([tickets[1]])
  })

  it('filters by rig and query text', () => {
    expect(filterTickets(tickets, { rig: 'rig-2' })).toEqual([tickets[1]])
    expect(filterTickets(tickets, { query: 'charlie' })).toEqual([tickets[2]])
  })

  it('filters by assigned date range', () => {
    expect(filterTickets(tickets, { from: '2024-01-11', to: '2024-01-11' })).toEqual([tickets[1]])
  })
})

describe('groupTicketsByForm', () => {
  it('groups by form and sorts by name then date', () => {
    const forms = [
      { id: 'f-2', name: 'Beta', versions: [] },
      { id: 'f-1', name: 'Alpha', versions: [] }
    ]

    const grouped = groupTicketsByForm(
      [
        makeTicket({ id: 'FT-1', formId: 'f-1', assignedAt: '2024-01-10T10:00:00.000Z' }),
        makeTicket({ id: 'FT-2', formId: 'f-1', assignedAt: '2024-01-11T10:00:00.000Z' }),
        makeTicket({ id: 'FT-3', formId: 'f-2', assignedAt: '2024-01-09T10:00:00.000Z' }),
        makeTicket({ id: 'FT-4', formId: 'missing', assignedAt: '2024-01-12T10:00:00.000Z' })
      ],
      forms
    )

    expect(grouped.map((group) => group.name)).toEqual(['Alpha', 'Beta', 'Unknown Form'])
    expect(grouped[0].tickets.map((ticket) => ticket.id)).toEqual(['FT-2', 'FT-1'])
  })
})
