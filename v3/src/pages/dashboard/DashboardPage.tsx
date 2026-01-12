import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardBody, CardHeader, CardSub, CardTitle } from '@/shared/ui/Card'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import Badge from '@/shared/ui/Badge'
import { useAppStore } from '@/shared/state/useAppStore'
import { dateTimeShort } from '@/shared/lib/format'
import { Plus, ArrowRight, ChevronDown } from 'lucide-react'
import { cn } from '@/shared/ui/cn'
import type { TicketStatus } from '@/entities/types'

export default function DashboardPage() {
  const nav = useNavigate()
  const forms = useAppStore(s => s.forms)
  const role = useAppStore(s => s.role)
  const createForm = useAppStore(s => s.createForm)
  const pushToast = useAppStore(s => s.pushToast)
  const tickets = useAppStore(s => s.tickets)
  const canEdit = role === 'admin'
  const [dailyOpen, setDailyOpen] = useState(false)
  const [formsOpen, setFormsOpen] = useState(false)

  const dailyTickets = useMemo(() => {
    const now = new Date()
    const sameDay = (iso: string) => {
      const d = new Date(iso)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    }
    return tickets
      .filter(t => sameDay(t.assignedAt))
      .slice()
      .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
  }, [tickets])

  const stats = useMemo(() => {
    let pending = 0
    let inProgress = 0
    let failed = 0
    let syncedToday = 0
    for (const t of dailyTickets) {
      if (t.status === 'pending' || t.status === 'queued' || t.status === 'in_progress') pending += 1
      if (t.status === 'in_progress') inProgress += 1
      if (t.status === 'error') failed += 1
      if (t.status === 'synced') syncedToday += 1
    }
    return { pending, inProgress, failed, syncedToday }
  }, [dailyTickets])

  const pendingTickets = dailyTickets.filter(t => t.status === 'pending' || t.status === 'queued' || t.status === 'in_progress')
  const syncedTickets = dailyTickets.filter(t => t.status === 'synced')
  const pendingVisible = dailyOpen ? pendingTickets : pendingTickets.slice(0, 2)
  const syncedVisible = dailyOpen ? syncedTickets : syncedTickets.slice(0, 2)
  const formsVisible = formsOpen ? forms : forms.slice(0, 15)

  return (
    <div className="pb-10">
      <SectionHeader
        title="Dashboard"
        subtitle="Immediate visibility into form templates and completed forms."
        right={
          <>
            <Button
              variant="secondary"
              disabled={!canEdit}
              title={canEdit ? 'Create new template' : 'Admins only'}
              onClick={async () => {
                if (!canEdit) return
                try {
                  const id = await createForm('New Template')
                  nav(`/builder/${id}`)
                } catch (err: any) {
                  pushToast({ title: 'Create failed', message: err?.message || 'Unable to create template', variant: 'danger' })
                }
              }}
            >
              <Plus size={16} /> Create New Template
            </Button>
            <Button variant="secondary" onClick={() => nav('/field')}>
              Open Completed Forms <ArrowRight size={16} />
            </Button>
          </>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Pending" value={stats.pending} tone={stats.pending ? 'warning' : 'neutral'} />
        <StatCard label="In progress" value={stats.inProgress} tone="neutral" />
        <StatCard label="Failed" value={stats.failed} tone={stats.failed ? 'danger' : 'neutral'} />
        <StatCard label="Synced today" value={stats.syncedToday} tone={stats.syncedToday ? 'success' : 'neutral'} />
      </div>

      <div className="px-4 mt-4 sm:px-6 sm:mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Daily Pending Tickets</CardTitle>
                <CardSub>{pendingTickets.length} pending today</CardSub>
              </div>
              <button
                className="rf-focus rounded-xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                onClick={() => setDailyOpen((v) => !v)}
                aria-expanded={dailyOpen}
                title={dailyOpen ? 'Collapse lists' : 'Expand lists'}
              >
                <ChevronDown size={18} className={cn('transition', dailyOpen && 'rotate-180')} />
              </button>
            </div>
          </CardHeader>
          <CardBody className="pt-1">
            {pendingTickets.length === 0 ? (
              <div className="text-sm text-neutral-500 dark:text-neutral-400">No pending tickets for today.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {pendingVisible.map((t) => (
                  <Link key={t.id} to={`/field/ticket/${t.id}`} className="rf-focus rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{t.id} — {t.title}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          Assigned: {t.assignedTo} · {dateTimeShort(t.assignedAt)}
                        </div>
                      </div>
                      <Badge tone={ticketTone(t.status)}>{t.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Synced Tickets</CardTitle>
                <CardSub>{syncedTickets.length} synced today</CardSub>
              </div>
            </div>
          </CardHeader>
          <CardBody className="pt-1">
            {syncedTickets.length === 0 ? (
              <div className="text-sm text-neutral-500 dark:text-neutral-400">No synced tickets yet today.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {syncedVisible.map((t) => (
                  <Link key={t.id} to={`/field/ticket/${t.id}`} className="rf-focus rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{t.id} — {t.title}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          Assigned: {t.assignedTo} · {dateTimeShort(t.assignedAt)}
                        </div>
                      </div>
                      <Badge tone="success">synced</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="px-4 mt-4 sm:px-6 sm:mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Form Templates Overview</CardTitle>
                <CardSub>Versioned templates with per-template state.</CardSub>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rf-focus rounded-xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  onClick={() => setFormsOpen((v) => !v)}
                  aria-expanded={formsOpen}
                  title={formsOpen ? 'Collapse list' : 'Expand list'}
                >
                  <ChevronDown size={18} className={cn('transition', formsOpen && 'rotate-180')} />
                </button>
                <Button variant="secondary" onClick={() => nav('/forms')}>Manage Templates</Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-auto rf-scrollbar">
              <table className="w-full text-sm">
                <thead className="text-xs text-neutral-500 dark:text-neutral-400">
                  <tr className="text-left">
                    <th className="py-2">Template</th>
                    <th className="py-2 hidden sm:table-cell">Version</th>
                    <th className="py-2 hidden sm:table-cell">Status</th>
                    <th className="py-2 hidden sm:table-cell">Fields</th>
                    <th className="py-2 text-right hidden sm:table-cell">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {formsVisible.map((f) => {
                    const v = f.versions.find(v => v.status === 'active') ?? f.versions[0]
                    return (
                      <tr key={f.id} className="border-t border-neutral-200 dark:border-neutral-800">
                        <td className="py-2">
                          <Link className="rf-focus font-medium hover:underline" to={`/builder/${f.id}`}>
                            {f.name}
                          </Link>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">{f.subtitle}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 sm:hidden">
                            <span>{v.version}</span>
                            <span>·</span>
                            <span>{v.fieldCount} fields</span>
                          </div>
                          <div className="mt-2 sm:hidden">
                            <Badge tone={v.status === 'active' ? 'success' : v.status === 'draft' ? 'warning' : 'neutral'}>
                              {v.status}
                            </Badge>
                          </div>
                          <div className="mt-2 sm:hidden">
                            {canEdit ? (
                              <Link className="rf-focus inline-flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900" to={`/builder/${f.id}`}>
                                Open <ArrowRight size={14} />
                              </Link>
                            ) : (
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">Admin only</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 hidden sm:table-cell">{v.version}</td>
                        <td className="py-2 hidden sm:table-cell">
                          <Badge tone={v.status === 'active' ? 'success' : v.status === 'draft' ? 'warning' : 'neutral'}>
                            {v.status}
                          </Badge>
                        </td>
                        <td className="py-2 hidden sm:table-cell">{v.fieldCount}</td>
                        <td className="py-2 text-right hidden sm:table-cell">
                          {canEdit ? (
                            <Link className="rf-focus inline-flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900" to={`/builder/${f.id}`}>
                              Open <ArrowRight size={14} />
                            </Link>
                          ) : (
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">Admin only</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'success' | 'warning' | 'danger' }) {
  return (
    <Card>
      <CardBody className="py-5">
        <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
        <div className="mt-1 flex items-end justify-between">
          <div className="text-3xl font-semibold">{value}</div>
          <Badge tone={tone}>{tone}</Badge>
        </div>
      </CardBody>
    </Card>
  )
}

function ticketTone(status: TicketStatus): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'synced') return 'success'
  if (status === 'error') return 'danger'
  if (status === 'queued' || status === 'pending') return 'warning'
  return 'neutral'
}
