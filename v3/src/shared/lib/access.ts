import type { AccessGroup, Employee, FormTemplate } from '@/entities/types'
import type { UserRole } from '@/shared/state/useAppStore'

export function resolveEmployeeByEmail(employees: Employee[], email?: string) {
  if (!email) return undefined
  const target = email.trim().toLowerCase()
  if (!target) return undefined
  return employees.find((e) => (e.email ?? '').toLowerCase() === target)
}

export function resolveAvailableForms({
  forms,
  groups,
  employees,
  role,
  userEmail
}: {
  forms: FormTemplate[]
  groups: AccessGroup[]
  employees: Employee[]
  role: UserRole
  userEmail?: string
}) {
  if (role === 'admin') return forms
  if (!groups.length) return forms
  const employee = resolveEmployeeByEmail(employees, userEmail)
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
}
