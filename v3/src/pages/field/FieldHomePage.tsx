import { Link, useNavigate } from 'react-router-dom'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import { Card, CardBody, CardHeader, CardSub, CardTitle } from '@/shared/ui/Card'
import Badge from '@/shared/ui/Badge'
import { useAppStore } from '@/shared/state/useAppStore'
import { dateTimeShort } from '@/shared/lib/format'
import { Plus } from 'lucide-react'
import Modal from '@/shared/ui/Modal'
import Input from '@/shared/ui/Input'
import Select from '@/shared/ui/Select'
import { useEffect, useMemo, useState } from 'react'
import { extractRig, filterTickets, groupTicketsByForm } from '@/shared/lib/ticketFilters'

export default function FieldHomePage() {
  const nav = useNavigate()
  const tickets = useAppStore(s => s.tickets)
  const forms = useAppStore(s => s.forms)
  const groups = useAppStore(s => s.groups)
  const employees = useAppStore(s => s.employees)
  const user = useAppStore(s => s.user)
  const role = useAppStore(s => s.role)
  const createTicket = useAppStore(s => s.createTicket)
  const pushToast = useAppStore(s => s.pushToast)

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('Pending Forms')
  const [assignedTo, setAssignedTo] = useState('Technician')
  const [formId, setFormId] = useState(forms[0]?.id ?? '')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rigQuery, setRigQuery] = useState('')
  const [formQuery, setFormQuery] = useState('')

  const availableForms = useMemo(() => {
    if (role === 'admin') return forms
    if (!groups.length) return forms
    const email = user?.email?.trim().toLowerCase()
    if (!email) return forms
    const employee = employees.find((e) => (e.email ?? '').toLowerCase() === email)
    if (!employee) return forms
    const allowed = new Set<string>()
    for (const g of groups) {
      const excludedEmployees = g.excludedEmployeeIds ?? []
      const includesEmployee = g.includeAllEmployees
        ? !excludedEmployees.includes(employee.id)
        : g.employeeIds.includes(employee.id)
      if (!includesEmployee) continue
      if (g.includeAllForms) {
        const excludedForms = new Set(g.excludedFormIds ?? [])
        for (const f of forms) {
          if (!excludedForms.has(f.id)) allowed.add(f.id)
        }
        continue
      }
      for (const id of g.formIds) allowed.add(id)
    }
    if (!allowed.size) return []
    return forms.filter((f) => allowed.has(f.id))
  }, [employees, forms, groups, role, user?.email])

  useEffect(() => {
    if (!availableForms.length) {
      if (formId) setFormId('')
      return
    }
    if (!formId || !availableForms.some((f) => f.id === formId)) {
      setFormId(availableForms[0].id)
    }
  }, [availableForms, formId])

  const activeVersions = useMemo(() => {
    const f = availableForms.find(x => x.id === formId)
    const v = f?.versions.find(v => v.status === 'active') ?? f?.versions[0]
    return { f, v }
  }, [availableForms, formId])
  const canCreate = Boolean(activeVersions.v)

  const filteredTickets = useMemo(
    () => filterTickets(tickets, { from: fromDate, to: toDate, rig: rigQuery }),
    [tickets, fromDate, toDate, rigQuery]
  )

  const groupedTickets = useMemo(() => {
    const grouped = groupTicketsByForm(filteredTickets, forms)
    const q = formQuery.trim().toLowerCase()
    if (!q) return grouped
    return grouped.filter((group) => group.name.toLowerCase().includes(q))
  }, [filteredTickets, forms, formQuery])

  return (
    <div className="pb-10">
      <SectionHeader
        title="Completed Forms"
        subtitle="Offline mode, drafts, and submissions."
        right={
          <>
            <Button variant="secondary" onClick={() => { setOpen(true) }}>
              <Plus size={16} /> Pending Forms
            </Button>
          </>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Completed Forms</CardTitle>
              <CardSub>Tap a form to open it</CardSub>
            </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">From</div>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">To</div>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Rig</div>
                <Input placeholder="Search rig" value={rigQuery} onChange={(e) => setRigQuery(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Form</div>
                <Input placeholder="Search form name" value={formQuery} onChange={(e) => setFormQuery(e.target.value)} />
              </div>
            </div>

            <div className="mt-4 space-y-6">
              {groupedTickets.map((group) => (
                <div key={group.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{group.name}</div>
                    <Badge tone={group.tickets.length ? 'success' : 'warning'}>{group.tickets.length}</Badge>
                  </div>
                  <div className="mt-2 flex flex-col gap-2">
                    {group.tickets.map((t) => (
                      <Link key={t.id} to={`/field/ticket/${t.id}`} className="rf-focus rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{t.id} · {t.title}</div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              {t.assignedTo} · {dateTimeShort(t.assignedAt)}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              Rig: {extractRig(t) || '—'}
                            </div>
                          </div>
                          <Badge tone={t.status === 'synced' ? 'success' : t.status === 'error' ? 'danger' : t.status === 'queued' ? 'warning' : 'neutral'}>
                            {t.status}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              {groupedTickets.length === 0 && (
                <div className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  Nothing here
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Device</CardTitle>
              <CardSub>Touch-friendly UI</CardSub>
            </CardHeader>
            <CardBody>
              <div className="text-sm">Tablet / Rugged device</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Drafts and attachments are stored locally (demo).
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create ticket">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Form Template</div>
            {availableForms.length === 0 ? (
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                No form templates assigned to your group yet.
              </div>
            ) : (
              <Select value={formId} onChange={(e) => setFormId(e.target.value)}>
                {availableForms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </Select>
            )}
          </div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Title</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Assigned to</div>
            <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!canCreate} onClick={() => {
              const run = async () => {
                const { v } = activeVersions
                if (!v) return
                try {
                  const id = await createTicket(formId, v.id, (title || 'Pending Forms').trim(), (assignedTo || 'Technician').trim())
                  setOpen(false)
                  nav(`/field/ticket/${id}`)
                } catch (err: any) {
                  pushToast({ title: 'Ticket failed', message: err?.message || 'Unable to create ticket', variant: 'danger' })
                }
              }
              void run()
            }}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
