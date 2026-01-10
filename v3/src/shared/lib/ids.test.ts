import { describe, expect, it, vi } from 'vitest'
import type { Ticket } from '@/entities/types'
import { nowIso, nextTicketId, uid } from './ids'

const makeTicket = (id: string): Ticket => ({
  id,
  title: 'Test Ticket',
  formId: 'form-1',
  versionId: 'ver-1',
  assignedTo: 'Tech',
  assignedAt: '2024-01-01T00:00:00.000Z',
  status: 'pending',
  approvalState: 'pending',
  values: {},
  attachments: [],
  updatedAt: '2024-01-01T00:00:00.000Z'
})

describe('uid', () => {
  it('includes the prefix and timestamp segment', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.12345)
    vi.spyOn(Date, 'now').mockReturnValue(0x1a2b)

    const value = uid('ticket')

    expect(value.startsWith('ticket_')).toBe(true)
    expect(value.endsWith('_1a2b')).toBe(true)
    expect(value).toMatch(/^ticket_[0-9a-f]+_1a2b$/)

    vi.restoreAllMocks()
  })
})

describe('nowIso', () => {
  it('returns the current time in ISO format', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-02T03:04:05.000Z'))

    expect(nowIso()).toBe('2024-01-02T03:04:05.000Z')

    vi.useRealTimers()
  })
})

describe('nextTicketId', () => {
  it('returns the next id after the highest numeric suffix', () => {
    const tickets = [makeTicket('FT-2801'), makeTicket('FT-2810'), makeTicket('bad-id')]
    expect(nextTicketId(tickets)).toBe('FT-2811')
  })

  it('starts at 2801 when there are no numeric ids', () => {
    expect(nextTicketId([])).toBe('FT-2801')
  })
})
