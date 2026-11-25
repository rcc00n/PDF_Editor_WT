export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function round(n: number, digits = 0) {
  if (!Number.isFinite(n)) return n
  // Decimal exponent shifting avoids 1.005 * 100 becoming 100.49999999999999.
  const shift = (value: number, places: number) => {
    const [coefficient, exponent = '0'] = value.toString().split('e')
    return Number(`${coefficient}e${Number(exponent) + places}`)
  }
  return shift(Math.round(shift(n, digits)), -digits)
}
