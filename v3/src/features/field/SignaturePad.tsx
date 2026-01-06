import { useEffect, useRef, useState } from 'react'
import Button from '@/shared/ui/Button'

export default function SignaturePad({ value, onChange }: { value?: string; onChange: (dataUrl?: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [drawing, setDrawing] = useState(false)

  useEffect(() => {
    if (!value) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.src = value
  }, [value])

  const start = (x: number, y: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0a0a0a'
    ctx.beginPath()
    ctx.moveTo(x, y)
    setDrawing(true)
  }

  const move = (x: number, y: number) => {
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const end = () => {
    if (!drawing) return
    setDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChange(undefined)
  }

  const pos = (e: PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const r = canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  return (
    <div>
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-2">
        <canvas
          ref={canvasRef}
          width={520}
          height={160}
          className="w-full h-[160px] touch-none"
          onPointerDown={(e) => {
            ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
            const p = pos(e.nativeEvent)
            start(p.x, p.y)
          }}
          onPointerMove={(e) => {
            const p = pos(e.nativeEvent)
            move(p.x, p.y)
          }}
          onPointerUp={() => end()}
          onPointerCancel={() => end()}
          onPointerLeave={() => end()}
        />
      </div>
      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="secondary" onClick={clear}>Clear</Button>
      </div>
    </div>
  )
}
