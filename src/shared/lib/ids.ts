import type { Ticket } from '@/entities/types'

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export function nowIso() {
  return new Date().toISOString()
}

export function nextTicketId(tickets: Ticket[]) {
  const nums = tickets
    .map((t) => parseInt(String(t.id).replace(/[^0-9]/g, ''), 10))
    .filter((n) => Number.isFinite(n))
  const next = (nums.length ? Math.max(...nums) : 2800) + 1
  return `FT-${String(next).padStart(4, '0')}`
}
