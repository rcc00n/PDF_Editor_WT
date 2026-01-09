import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/shared/ui/cn'

// pdfjs-dist is heavy; keep it isolated
type Props = {
  dataUrl?: string
  page: number
  className?: string
  onMeta?: (meta: { numPages: number }) => void
  refreshKey?: string | number
}

export default function PdfPageCanvas({ dataUrl, page, className, onMeta, refreshKey }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const onMetaRef = useRef<typeof onMeta>(onMeta)
  const [err, setErr] = useState<string | null>(null)
  const [wrapWidth, setWrapWidth] = useState(0)

  const isData = useMemo(() => !!dataUrl && dataUrl.startsWith('data:'), [dataUrl])
  const bytes = useMemo(() => (dataUrl && isData ? dataUrlToBytes(dataUrl) : undefined), [dataUrl, isData])

  useEffect(() => {
    onMetaRef.current = onMeta
  }, [onMeta])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const update = () => setWrapWidth(wrap.clientWidth)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => update())
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setErr(null)
      const canvas = canvasRef.current
      const wrap = wrapRef.current
      if (!canvas || !wrap || !dataUrl || !wrapWidth) return

      try {
        const pdfjs = await import('pdfjs-dist')
        // Worker setup for Vite
        // @ts-ignore
        const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
        // @ts-ignore
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

        const loadingTask = isData
          ? pdfjs.getDocument({ data: bytes })
          : pdfjs.getDocument({ url: dataUrl })
        const pdf = await loadingTask.promise
        if (cancelled) return
        onMetaRef.current?.({ numPages: pdf.numPages })

        const p = Math.min(Math.max(1, page), pdf.numPages)
        const pdfPage = await pdf.getPage(p)
        if (cancelled) return

        const desiredWidth = Math.max(320, wrapWidth - 2)
        const viewport1 = pdfPage.getViewport({ scale: 1 })
        const scale = desiredWidth / viewport1.width
        const viewport = pdfPage.getViewport({ scale })
        const dpr = window.devicePixelRatio || 1
        const renderViewport = pdfPage.getViewport({ scale: scale * dpr })

        const context = canvas.getContext('2d')
        if (!context) return

        canvas.width = Math.floor(renderViewport.width)
        canvas.height = Math.floor(renderViewport.height)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        await pdfPage.render({ canvasContext: context, viewport: renderViewport }).promise
      } catch (e: any) {
        setErr(e?.message || 'PDF render error')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [bytes, dataUrl, isData, page, wrapWidth, refreshKey])

  return (
    <div ref={wrapRef} className={cn('w-full', className)}>
      {err ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 text-sm text-neutral-500 dark:text-neutral-400">
          PDF preview unavailable: {err}
        </div>
      ) : (
        <canvas ref={canvasRef} className="block w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white" />
      )}
    </div>
  )
}

function dataUrlToBytes(dataUrl: string) {
  const idx = dataUrl.indexOf(',')
  const b64 = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl
  const bin = atob(b64)
  const len = bin.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
