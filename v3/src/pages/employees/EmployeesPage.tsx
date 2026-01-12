import { useMemo, useRef, useState } from 'react'
import SectionHeader from '@/shared/ui/SectionHeader'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import Badge from '@/shared/ui/Badge'
import Modal from '@/shared/ui/Modal'
import { Card, CardBody } from '@/shared/ui/Card'
import { useAppStore } from '@/shared/state/useAppStore'
import type { Employee } from '@/entities/types'
import { FileSpreadsheet, Plus, Upload, Pencil, Trash2 } from 'lucide-react'
import { read, utils, writeFile } from 'xlsx'

const PAGE_SIZE = 10

export default function EmployeesPage() {
  const employees = useAppStore(s => s.employees)
  const role = useAppStore(s => s.role)
  const createEmployee = useAppStore(s => s.createEmployee)
  const updateEmployee = useAppStore(s => s.updateEmployee)
  const deleteEmployee = useAppStore(s => s.deleteEmployee)
  const importEmployees = useAppStore(s => s.importEmployees)
  const pushToast = useAppStore(s => s.pushToast)

  const fileRef = useRef<HTMLInputElement | null>(null)

  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: '',
    phone: '',
    active: true
  })

  if (role !== 'admin') {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          Employee management is available to admins only.
        </div>
      </div>
    )
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = employees.slice().sort((a, b) => a.name.localeCompare(b.name))
    if (!q) return sorted
    return sorted.filter((e) => {
      const hay = `${e.name} ${e.email ?? ''} ${e.role ?? ''} ${e.phone ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [employees, query])

  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE)

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', email: '', role: '', phone: '', active: true })
    setOpen(true)
  }

  const openEdit = (employee: Employee) => {
    setEditing(employee)
    setForm({
      name: employee.name,
      email: employee.email ?? '',
      role: employee.role ?? '',
      phone: employee.phone ?? '',
      active: employee.active
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      pushToast({ title: 'Name required', message: 'Add an employee name before saving.', variant: 'warning' })
      return
    }
    try {
      if (editing) {
        await updateEmployee(editing.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role.trim(),
          phone: form.phone.trim(),
          active: form.active
        })
        pushToast({ title: 'Employee updated', message: form.name, variant: 'success' })
      } else {
        await createEmployee({
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role.trim(),
          phone: form.phone.trim(),
          active: form.active
        })
        pushToast({ title: 'Employee added', message: form.name, variant: 'success' })
      }
      setOpen(false)
    } catch (err: any) {
      pushToast({ title: 'Save failed', message: err?.message || 'Unable to save employee', variant: 'danger' })
    }
  }

  const exportXlsx = () => {
    const data = employees.map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email ?? '',
      role: e.role ?? '',
      phone: e.phone ?? '',
      active: e.active ? 'true' : 'false'
    }))
    const sheet = utils.json_to_sheet(data, { header: ['id', 'name', 'email', 'role', 'phone', 'active'] })
    const book = utils.book_new()
    utils.book_append_sheet(book, sheet, 'Employees')
    writeFile(book, 'employees.xlsx')
  }

  const handleImport = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer()
      const workbook = read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })
      const mapped = rows
        .map((row) => normalizeEmployee(row))
        .filter((e) => e.name)
      if (!mapped.length) {
        pushToast({ title: 'No rows imported', message: 'Check file headers and content.', variant: 'warning' })
        return
      }
      await importEmployees(mapped)
      pushToast({ title: 'Employees imported', message: `${mapped.length} row(s) added`, variant: 'success' })
    } catch (err: any) {
      pushToast({ title: 'Import failed', message: err?.message || 'Unable to import file', variant: 'danger' })
    }
  }

  return (
    <div className="pb-10">
      <SectionHeader
        title="Employees"
        subtitle="Manage the staff directory used by employee dropdown fields."
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportXlsx}>
              <FileSpreadsheet size={16} /> Export XLSX
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                void handleImport(file)
                e.currentTarget.value = ''
              }}
            />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Import
            </Button>
            <Button onClick={openCreate}>
              <Plus size={16} /> Add employee
            </Button>
          </div>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6">
        <Card>
          <CardBody>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-sm w-full">
                <Input
                  placeholder="Search by name, email, role, phone..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setShowAll(false)
                  }}
                />
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {filtered.length} employee(s)
              </div>
            </div>
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Import columns: id, name, email, role, phone, active.
            </div>

            <div className="mt-4 overflow-auto rf-scrollbar">
              <table className="w-full text-sm">
                <thead className="text-xs text-neutral-500 dark:text-neutral-400">
                  <tr className="text-left">
                    <th className="py-2">Employee</th>
                    <th className="py-2 hidden sm:table-cell">Role</th>
                    <th className="py-2 hidden md:table-cell">Email</th>
                    <th className="py-2 hidden md:table-cell">Phone</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-t border-neutral-200 dark:border-neutral-800 cursor-pointer transition-colors hover:bg-neutral-50/70 focus-within:bg-neutral-50/70 dark:hover:bg-neutral-900/70 dark:focus-within:bg-neutral-900/70"
                      role="button"
                      tabIndex={0}
                      onClick={() => openEdit(employee)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openEdit(employee)
                        }
                      }}
                    >
                      <td className="py-3">
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 sm:hidden">
                          {employee.role || '-'} - {employee.email || '-'}
                        </div>
                      </td>
                      <td className="py-3 hidden sm:table-cell">{employee.role || '-'}</td>
                      <td className="py-3 hidden md:table-cell">{employee.email || '-'}</td>
                      <td className="py-3 hidden md:table-cell">{employee.phone || '-'}</td>
                      <td className="py-3">
                        <Badge tone={employee.active ? 'success' : 'neutral'}>{employee.active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEdit(employee)
                            }}
                          >
                            <Pencil size={16} /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                await deleteEmployee(employee.id)
                                pushToast({ title: 'Employee removed', message: employee.name, variant: 'success' })
                              } catch (err: any) {
                                pushToast({ title: 'Delete failed', message: err?.message || 'Unable to delete employee', variant: 'danger' })
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visible.length === 0 && (
                    <tr>
                      <td className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400" colSpan={6}>
                        No employees found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > PAGE_SIZE && (
              <div className="mt-4 flex justify-center">
                <Button variant="secondary" onClick={() => setShowAll((s) => !s)}>
                  {showAll ? 'Show less' : 'Show more'}
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit employee' : 'Add employee'}>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Name</div>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Role</div>
            <Input value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))} />
          </div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Email</div>
            <Input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Phone</div>
            <Input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
          </div>
          <label className="flex items-center justify-between text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">Active</span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.active}
              onChange={(e) => setForm((s) => ({ ...s, active: e.target.checked }))}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function normalizeEmployee(row: Record<string, any>): Employee {
  const normalized: Record<string, any> = {}
  for (const key of Object.keys(row)) {
    normalized[key.trim().toLowerCase()] = row[key]
  }
  const activeRaw = normalized.active ?? normalized.status ?? ''
  const active = parseBoolean(activeRaw, true)
  return {
    id: String(normalized.id ?? normalized.employee_id ?? '').trim(),
    name: String(normalized.name ?? normalized.employee ?? normalized.full_name ?? '').trim(),
    email: String(normalized.email ?? '').trim(),
    role: String(normalized.role ?? normalized.title ?? '').trim(),
    phone: String(normalized.phone ?? normalized.mobile ?? '').trim(),
    active
  }
}

function parseBoolean(value: any, fallback: boolean) {
  if (typeof value === 'boolean') return value
  const v = String(value ?? '').trim().toLowerCase()
  if (!v) return fallback
  if (['true', 'yes', '1', 'active'].includes(v)) return true
  if (['false', 'no', '0', 'inactive'].includes(v)) return false
  return fallback
}
