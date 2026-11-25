import { describe, expect, it } from 'vitest'
import { resolveMode } from './mode'

describe('explicit application mode', () => {
  it('never turns missing API configuration into a simulated success', () => {
    expect(resolveMode()).toBe('unconfigured')
    expect(resolveMode('  ', 'false')).toBe('unconfigured')
  })
  it('requires an explicit demo opt-in and isolates it from a configured API', () => {
    expect(resolveMode('', 'true')).toBe('demo')
    expect(resolveMode('/api', 'true')).toBe('unconfigured')
  })
  it('supports a relative or absolute API without simulation', () => {
    expect(resolveMode('/api')).toBe('api')
    expect(resolveMode(' https://example.invalid/api ', 'false')).toBe('api')
  })
  it('rejects ambiguous mode flags', () => {
    expect(resolveMode('', 'yes')).toBe('unconfigured')
    expect(resolveMode('/api', 'yes')).toBe('unconfigured')
  })
})
