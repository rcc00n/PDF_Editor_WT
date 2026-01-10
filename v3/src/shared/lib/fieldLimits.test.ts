import { describe, expect, it } from 'vitest'
import type { Field } from '@/entities/types'
import { resolveMaxLength, suggestedMaxLength, supportsFieldMaxLength } from './fieldLimits'

const baseField: Field = {
  id: 'fld-1',
  type: 'text',
  label: 'Name',
  key: 'name',
  required: false,
  validation: { kind: 'none' },
  page: 1,
  x: 0,
  y: 0,
  w: 0.34,
  h: 0.055
}

describe('suggestedMaxLength', () => {
  it('returns a calculated length for text fields', () => {
    expect(suggestedMaxLength(baseField)).toBe(32)
  })

  it('accounts for multi-line notes fields', () => {
    const notesField: Field = { ...baseField, key: 'notes', h: 0.11 }
    expect(suggestedMaxLength(notesField)).toBe(64)
  })

  it('returns undefined for unsupported field types', () => {
    const dateField: Field = { ...baseField, type: 'date' }
    expect(suggestedMaxLength(dateField)).toBeUndefined()
  })
})

describe('resolveMaxLength', () => {
  it('prefers explicit maxLength values', () => {
    const field: Field = { ...baseField, maxLength: 47.8 }
    expect(resolveMaxLength(field)).toBe(48)
  })

  it('falls back to suggested values when maxLength is missing', () => {
    const field: Field = { ...baseField, maxLength: undefined }
    expect(resolveMaxLength(field)).toBe(32)
  })
})

describe('supportsFieldMaxLength', () => {
  it('returns true for text and numeric fields', () => {
    const numericField: Field = { ...baseField, type: 'numeric' }
    expect(supportsFieldMaxLength(baseField)).toBe(true)
    expect(supportsFieldMaxLength(numericField)).toBe(true)
  })

  it('returns false for other field types', () => {
    const checkboxField: Field = { ...baseField, type: 'checkbox' }
    expect(supportsFieldMaxLength(checkboxField)).toBe(false)
  })
})
