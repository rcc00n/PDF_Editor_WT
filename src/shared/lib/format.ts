export function timeHHMM(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function dateShort(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' })
}

export function dateTimeShort(iso: string) {
  return `${dateShort(iso)} ${timeHHMM(iso)}`
}
