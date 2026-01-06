import { useEffect, useState } from 'react'

export function useElementSize<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ width: r.width, height: r.height })
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    setSize({ width: r.width, height: r.height })
    return () => ro.disconnect()
  }, [el])

  return { ref: setEl as any, size }
}
