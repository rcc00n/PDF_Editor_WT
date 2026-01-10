import { describe, expect, it } from 'vitest'
import type { AccessGroup, Employee, FormTemplate } from '@/entities/types'
import { resolveAvailableForms, resolveEmployeeByEmail } from './access'

const forms: FormTemplate[] = [
  { id: 'f-1', name: 'Alpha', versions: [] },
  { id: 'f-2', name: 'Beta', versions: [] },
  { id: 'f-3', name: 'Gamma', versions: [] }
]

const employees: Employee[] = [
  { id: 'e-1', name: 'Alex', email: 'alex@example.com', active: true },
  { id: 'e-2', name: 'Jamie', email: 'jamie@example.com', active: true }
]

describe('resolveEmployeeByEmail', () => {
  it('matches case-insensitive emails', () => {
    expect(resolveEmployeeByEmail(employees, '  ALEX@EXAMPLE.COM ')).toEqual(employees[0])
  })

  it('returns undefined when no email is provided', () => {
    expect(resolveEmployeeByEmail(employees)).toBeUndefined()
  })
})

describe('resolveAvailableForms', () => {
  it('returns all forms for admins', () => {
    const groups: AccessGroup[] = []
    expect(
      resolveAvailableForms({
        forms,
        groups,
        employees,
        role: 'admin',
        userEmail: 'alex@example.com'
      })
    ).toEqual(forms)
  })

  it('returns all forms when there are no groups', () => {
    expect(
      resolveAvailableForms({
        forms,
        groups: [],
        employees,
        role: 'worker',
        userEmail: 'alex@example.com'
      })
    ).toEqual(forms)
  })

  it('returns all forms when the employee is not found', () => {
    const groups: AccessGroup[] = [
      {
        id: 'g-1',
        name: 'Restricted',
        employeeIds: ['e-2'],
        formIds: ['f-1'],
        includeAllEmployees: false,
        includeAllForms: false,
        excludedEmployeeIds: [],
        excludedFormIds: []
      }
    ]

    expect(
      resolveAvailableForms({
        forms,
        groups,
        employees,
        role: 'worker',
        userEmail: 'missing@example.com'
      })
    ).toEqual(forms)
  })

  it('honors include-all-forms with exclusions', () => {
    const groups: AccessGroup[] = [
      {
        id: 'g-2',
        name: 'All Forms',
        employeeIds: ['e-1'],
        formIds: [],
        includeAllEmployees: false,
        includeAllForms: true,
        excludedEmployeeIds: [],
        excludedFormIds: ['f-2']
      }
    ]

    expect(
      resolveAvailableForms({
        forms,
        groups,
        employees,
        role: 'worker',
        userEmail: 'alex@example.com'
      })
    ).toEqual([forms[0], forms[2]])
  })

  it('returns only explicitly allowed forms', () => {
    const groups: AccessGroup[] = [
      {
        id: 'g-3',
        name: 'Subset',
        employeeIds: ['e-1'],
        formIds: ['f-2', 'f-3'],
        includeAllEmployees: false,
        includeAllForms: false,
        excludedEmployeeIds: [],
        excludedFormIds: []
      }
    ]

    expect(
      resolveAvailableForms({
        forms,
        groups,
        employees,
        role: 'worker',
        userEmail: 'alex@example.com'
      })
    ).toEqual([forms[1], forms[2]])
  })
})
