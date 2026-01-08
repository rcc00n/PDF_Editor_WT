import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/shared/ui/cn'

// pdfjs-dist is heavy; keep it isolated
type Props = {
  dataUrl?: string
  page: number
  className?: string
  onMeta?: (meta: { numPages: number }) => void
}

export default function PdfPageCanvas({ dataUrl, page, className, onMeta }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const isData = useMemo(() => !!dataUrl && dataUrl.startsWith('data:'), [dataUrl])
  const bytes = useMemo(() => (dataUrl && isData ? dataUrlToBytes(dataUrl) : null), [dataUrl, isData])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setErr(null)
      const canvas = canvasRef.current
      const wrap = wrapRef.current
      if (!canvas || !wrap || !dataUrl) return

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
        onMeta?.({ numPages: pdf.numPages })

        const p = Math.min(Math.max(1, page), pdf.numPages)
        const pdfPage = await pdf.getPage(p)
        if (cancelled) return

        const desiredWidth = Math.max(320, wrap.clientWidth - 2)
        const viewport1 = pdfPage.getViewport({ scale: 1 })
        const scale = desiredWidth / viewport1.width
        const viewport = pdfPage.getViewport({ scale })

        const context = canvas.getContext('2d')
        if (!context) return

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)

        await pdfPage.render({ canvasContext: context, viewport }).promise
      } catch (e: any) {
        setErr(e?.message || 'PDF render error')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [bytes, page, onMeta])

  return (
    <div ref={wrapRef} className={cn('w-full', className)}>
      {err ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 text-sm text-neutral-500 dark:text-neutral-400">
          PDF preview unavailable: {err}
        </div>
      ) : (
        <canvas ref={canvasRef} className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white" />
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
