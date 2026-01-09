import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins strings and ignores falsy values', () => {
    expect(cn('base', false && 'hidden', undefined, 'active')).toBe('base active')
  })

  it('supports object and array inputs', () => {
    expect(cn('base', { active: true, muted: false }, ['extra', null])).toBe('base active extra')
  })
})
