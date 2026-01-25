import type { FormTemplate, Ticket, TicketStatus } from '@/entities/types'

type TicketFilter = {
  from?: string
  to?: string
  rig?: string
  status?: TicketStatus | 'all'
  query?: string
}

export function extractRig(ticket: Ticket) {
  const values = ticket.values ?? {}
  const keys = Object.keys(values)
  for (const key of keys) {
    if (!key.toLowerCase().includes('rig')) continue
    const raw = values[key]
    if (raw == null || raw === '') continue
    return String(raw).trim()
  }
  return ''
}

export function filterTickets(tickets: Ticket[], filter: TicketFilter) {
  const from = filter.from?.trim() || ''
  const to = filter.to?.trim() || ''
  const rigQuery = filter.rig?.trim().toLowerCase() || ''
  const status = filter.status && filter.status !== 'all' ? filter.status : ''
  const query = filter.query?.trim().toLowerCase() || ''
  return tickets.filter((ticket) => {
    if (status && ticket.status !== status) return false
    const day = toLocalYmd(ticket.assignedAt)
    if (from && day && day < from) return false
    if (to && day && day > to) return false
    if (rigQuery) {
      const rig = extractRig(ticket)
      const hay = `${rig} ${ticket.title}`.toLowerCase()
      if (!hay.includes(rigQuery)) return false
    }
    if (query) {
      const rig = extractRig(ticket)
      const hay = `${ticket.id} ${ticket.title} ${ticket.assignedTo} ${rig}`.toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  })
}

export function groupTicketsByForm(tickets: Ticket[], forms: FormTemplate[]) {
  const formById = new Map(forms.map((f) => [f.id, f]))
  const groups = new Map<string, { id: string; name: string; tickets: Ticket[] }>()
  for (const ticket of tickets) {
    const form = formById.get(ticket.formId)
    const id = form?.id ?? 'unknown'
    const name = form?.name ?? 'Unknown Form'
    if (!groups.has(id)) {
      groups.set(id, { id, name, tickets: [] })
    }
    groups.get(id)!.tickets.push(ticket)
  }
  const sorted = Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name))
  for (const group of sorted) {
    group.tickets.sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
  }
  return sorted
}

function toLocalYmd(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mm = `${d.getMonth() + 1}`.padStart(2, '0')
  const dd = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}
