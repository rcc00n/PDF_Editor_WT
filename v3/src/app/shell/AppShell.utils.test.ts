import { describe, expect, it, vi } from 'vitest'
import { formatTime, titleForPath } from './AppShell'

describe('titleForPath', () => {
  it('maps known routes to titles', () => {
    expect(titleForPath('/dashboard')).toBe('Dashboard')
    expect(titleForPath('/review')).toBe('Admin Review & Export')
    expect(titleForPath('/employees/123')).toBe('Employees')
  })

  it('falls back to the default title', () => {
    expect(titleForPath('/unknown')).toBe('Wolsey Tech Tracking System')
  })
})

describe('formatTime', () => {
  it('returns an empty string when no value is provided', () => {
    expect(formatTime()).toBe('')
  })

  it('formats the time with hour and minute options', () => {
    const spy = vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('09:41')

    expect(formatTime('2024-01-01T09:41:00.000Z')).toBe('09:41')
    expect(spy).toHaveBeenCalledWith([], { hour: '2-digit', minute: '2-digit' })

    spy.mockRestore()
  })
})
