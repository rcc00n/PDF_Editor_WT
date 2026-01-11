import { describe, expect, it } from 'vitest'
import { signatureRoleLabel, signatureRoles } from './signatureRoles'

describe('signatureRoles', () => {
  it('exposes all signature role options', () => {
    expect(signatureRoles.map((opt) => opt.value)).toEqual(['employee', 'client', 'admin', 'other'])
  })
})

describe('signatureRoleLabel', () => {
  it('returns the label for a known role', () => {
    expect(signatureRoleLabel('admin')).toBe('Admin')
  })

  it('falls back to a generic label for unknown roles', () => {
    expect(signatureRoleLabel('missing' as any)).toBe('Signature')
  })
})
