import { useMemo, useState } from 'react'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import Badge from '@/shared/ui/Badge'
import Modal from '@/shared/ui/Modal'
import { Card, CardBody } from '@/shared/ui/Card'
import { useAppStore } from '@/shared/state/useAppStore'
import type { AccessGroup, Id } from '@/entities/types'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const PAGE_SIZE = 12

export default function GroupsPage() {
  const groups = useAppStore(s => s.groups)
  const employees = useAppStore(s => s.employees)
  const forms = useAppStore(s => s.forms)
  const role = useAppStore(s => s.role)
  const createGroup = useAppStore(s => s.createGroup)
  const updateGroup = useAppStore(s => s.updateGroup)
  const deleteGroup = useAppStore(s => s.deleteGroup)
  const pushToast = useAppStore(s => s.pushToast)

  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AccessGroup | null>(null)
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [formQuery, setFormQuery] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    employeeIds: [] as Id[],
    formIds: [] as Id[]
  })

  if (role !== 'admin') {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          Group management is available to admins only.
        </div>
      </div>
    )
  }

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = groups.slice().sort((a, b) => a.name.localeCompare(b.name))
    if (!q) return sorted
    return sorted.filter((g) => {
      const hay = `${g.name} ${g.description ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [groups, query])

  const visibleGroups = showAll ? filteredGroups : filteredGroups.slice(0, PAGE_SIZE)

  const assignedEmployeeIds = useMemo(() => {
    const ids = new Set<Id>()
    for (const g of groups) {
      for (const id of g.employeeIds) ids.add(id)
    }
    return ids
  }, [groups])

  const assignedFormIds = useMemo(() => {
    const ids = new Set<Id>()
    for (const g of groups) {
      for (const id of g.formIds) ids.add(id)
    }
    return ids
  }, [groups])

  const unassignedEmployees = employees.filter((e) => !assignedEmployeeIds.has(e.id))
  const unassignedForms = forms.filter((f) => !assignedFormIds.has(f.id))

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', employeeIds: [], formIds: [] })
    setEmployeeQuery('')
    setFormQuery('')
    setOpen(true)
  }

  const openEdit = (group: AccessGroup) => {
    setEditing(group)
    setForm({
      name: group.name,
      description: group.description ?? '',
      employeeIds: group.employeeIds.slice(),
      formIds: group.formIds.slice()
    })
    setEmployeeQuery('')
    setFormQuery('')
    setOpen(true)
  }

  const toggleEmployee = (id: Id) => {
    setForm((s) => ({
      ...s,
      employeeIds: s.employeeIds.includes(id)
        ? s.employeeIds.filter((x) => x !== id)
        : [...s.employeeIds, id]
    }))
  }

  const toggleForm = (id: Id) => {
    setForm((s) => ({
      ...s,
      formIds: s.formIds.includes(id)
        ? s.formIds.filter((x) => x !== id)
        : [...s.formIds, id]
    }))
  }

  const filteredEmployees = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => {
      const hay = `${e.name} ${e.email ?? ''} ${e.role ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [employees, employeeQuery])

  const filteredForms = useMemo(() => {
    const q = formQuery.trim().toLowerCase()
    if (!q) return forms
    return forms.filter((f) => {
      const hay = `${f.name} ${f.subtitle ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [forms, formQuery])

  const handleSave = async () => {
    if (!form.name.trim()) {
      pushToast({ title: 'Name required', message: 'Group name is required.', variant: 'warning' })
      return
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      employeeIds: form.employeeIds,
      formIds: form.formIds
    }
    try {
      if (editing) {
        await updateGroup(editing.id, payload)
        pushToast({ title: 'Group updated', message: payload.name, variant: 'success' })
      } else {
        await createGroup(payload)
        pushToast({ title: 'Group created', message: payload.name, variant: 'success' })
      }
      setOpen(false)
    } catch (err: any) {
      pushToast({ title: 'Save failed', message: err?.message || 'Unable to save group', variant: 'danger' })
    }
  }

  return (
    <div className="pb-10">
      <SectionHeader
        title="Groups"
        subtitle="Assign employees and forms to access groups."
        right={
          <div className="flex flex-wrap gap-2">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search groups"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowAll(false)
                }}
              />
            </div>
            <Button onClick={openCreate}>
              <Plus size={16} /> Add group
            </Button>
          </div>
        }
      />

      {(unassignedEmployees.length > 0 || unassignedForms.length > 0) && (
        <div className="px-4 mt-4 sm:px-6 sm:mt-6">
          <Card>
            <CardBody>
              <div className="text-sm font-semibold">Needs assignment</div>
              <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {unassignedEmployees.length > 0 && (
                  <div>{unassignedEmployees.length} employee(s) are not in any group.</div>
                )}
                {unassignedForms.length > 0 && (
                  <div>{unassignedForms.length} form(s) are not assigned to a group.</div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      <div className="px-4 mt-4 sm:px-6 sm:mt-6">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {filteredGroups.length} group(s)
              </div>
              {filteredGroups.length > PAGE_SIZE && (
                <Button size="sm" variant="secondary" onClick={() => setShowAll((s) => !s)}>
                  {showAll ? 'Show less' : 'Show more'}
                </Button>
              )}
            </div>

            <div className="mt-4 overflow-auto rf-scrollbar">
              <table className="w-full text-sm">
                <thead className="text-xs text-neutral-500 dark:text-neutral-400">
                  <tr className="text-left">
                    <th className="py-2">Group</th>
                    <th className="py-2 hidden sm:table-cell">Members</th>
                    <th className="py-2 hidden sm:table-cell">Forms</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGroups.map((g) => {
                    const memberNames = lookupNames(g.employeeIds, employees.map((e) => ({ id: e.id, label: e.name })))
                    const formNames = lookupNames(g.formIds, forms.map((f) => ({ id: f.id, label: f.name })))
                    return (
                      <tr key={g.id} className="border-t border-neutral-200 dark:border-neutral-800">
                        <td className="py-3">
                          <div className="font-medium">{g.name}</div>
                          {g.description && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">{g.description}</div>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 sm:hidden">
                            <Badge tone="neutral">{g.employeeIds.length} members</Badge>
                            <Badge tone="neutral">{g.formIds.length} forms</Badge>
                          </div>
                        </td>
                        <td className="py-3 hidden sm:table-cell">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={g.employeeIds.length ? 'success' : 'warning'}>
                              {g.employeeIds.length}
                            </Badge>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {memberNames || 'No members'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 hidden sm:table-cell">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={g.formIds.length ? 'success' : 'warning'}>
                              {g.formIds.length}
                            </Badge>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {formNames || 'No forms'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="secondary" onClick={() => openEdit(g)}>
                              <Pencil size={16} /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (!window.confirm(`Delete group "${g.name}"?`)) return
                                try {
                                  await deleteGroup(g.id)
                                  pushToast({ title: 'Group removed', message: g.name, variant: 'success' })
                                } catch (err: any) {
                                  pushToast({ title: 'Delete failed', message: err?.message || 'Unable to delete group', variant: 'danger' })
                                }
                              }}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {visibleGroups.length === 0 && (
                    <tr>
                      <td className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400" colSpan={4}>
                        {query.trim() ? 'No groups match that search' : 'No groups yet'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit group' : 'Add group'} className="max-w-5xl">
        <div className="space-y-4">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Name</div>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Description</div>
            <Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Employees</div>
                <Badge tone={form.employeeIds.length ? 'success' : 'warning'}>{form.employeeIds.length} selected</Badge>
              </div>
              <Input
                placeholder="Search employees"
                value={employeeQuery}
                onChange={(e) => setEmployeeQuery(e.target.value)}
              />
              <div className="max-h-56 overflow-auto rf-scrollbar rounded-2xl border border-neutral-200 dark:border-neutral-800 p-2 space-y-2">
                {filteredEmployees.map((e) => (
                  <label key={e.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{e.name}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {e.role || 'Role'} · {e.email || 'No email'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={form.employeeIds.includes(e.id)}
                      onChange={() => toggleEmployee(e.id)}
                    />
                  </label>
                ))}
                {filteredEmployees.length === 0 && (
                  <div className="py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    No matching employees
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Forms</div>
                <Badge tone={form.formIds.length ? 'success' : 'warning'}>{form.formIds.length} selected</Badge>
              </div>
              <Input
                placeholder="Search forms"
                value={formQuery}
                onChange={(e) => setFormQuery(e.target.value)}
              />
              <div className="max-h-56 overflow-auto rf-scrollbar rounded-2xl border border-neutral-200 dark:border-neutral-800 p-2 space-y-2">
                {filteredForms.map((f) => (
                  <label key={f.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{f.name}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{f.subtitle || 'No subtitle'}</div>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={form.formIds.includes(f.id)}
                      onChange={() => toggleForm(f.id)}
                    />
                  </label>
                ))}
                {filteredForms.length === 0 && (
                  <div className="py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    No matching forms
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function lookupNames(ids: Id[], options: Array<{ id: Id; label: string }>, limit = 2) {
  const byId = new Map(options.map((o) => [o.id, o.label]))
  const names = ids.map((id) => byId.get(id)).filter(Boolean) as string[]
  if (names.length === 0) return ''
  const visible = names.slice(0, limit)
  const rest = names.length - visible.length
  return rest > 0 ? `${visible.join(', ')} +${rest}` : visible.join(', ')
}
