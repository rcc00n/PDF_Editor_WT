import type { SignatureRole } from '@/entities/types'

export const signatureRoles: Array<{ value: SignatureRole; label: string; helper: string }> = [
  { value: 'employee', label: 'Employee', helper: 'Assigned employee or technician.' },
  { value: 'client', label: 'Client', helper: 'Customer or site contact.' },
  { value: 'admin', label: 'Admin', helper: 'Office or admin approval.' },
  { value: 'other', label: 'Other', helper: 'Custom signer.' }
]

export function signatureRoleLabel(role: SignatureRole) {
  return signatureRoles.find((opt) => opt.value === role)?.label ?? 'Signature'
}
