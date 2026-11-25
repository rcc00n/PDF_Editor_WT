import { describe, expect, it } from 'vitest'
import { clamp, round } from './math'

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('returns the min when below range', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
  })

  it('returns the max when above range', () => {
    expect(clamp(42, 0, 10)).toBe(10)
  })
})

describe('round', () => {
  it('rounds to the nearest integer by default', () => {
    expect(round(4.6)).toBe(5)
  })

  it('rounds to the specified precision', () => {
    expect(round(3.14159, 2)).toBe(3.14)
    expect(round(1.005, 2)).toBe(1.01)
    expect(round(2.675, 2)).toBe(2.68)
    expect(round(-1.005, 2)).toBe(-1)
    expect(round(1.25e-7, 8)).toBe(1.3e-7)
  })
})
