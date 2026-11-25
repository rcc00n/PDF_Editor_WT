import { describe, expect, it } from 'vitest'
import { resolveMode, stateStorageKey, pdfStorageKey } from './mode'

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

describe('browser storage boundary', () => {
  it('keeps demo, API and unconfigured state apart from the historical mixed queue', () => {
    const modes = ['api', 'demo', 'unconfigured'] as const
    const stores = modes.map(stateStorageKey)
    const caches = modes.map(pdfStorageKey)
    expect(new Set(stores).size).toBe(3)
    expect(new Set(caches).size).toBe(3)
    expect(stores).not.toContain('rf_store_v1')
    expect(caches).not.toContain('rf_offline_cache')
  })
})
