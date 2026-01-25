import type { PropsWithChildren } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from './cn'

export default function Modal({
  open,
  title,
  onClose,
  children,
  className,
  bodyClassName
}: PropsWithChildren<{
  open: boolean
  title?: string
  onClose: () => void
  className?: string
  bodyClassName?: string
}>) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-5 sm:p-6">
        <div className={cn('w-full max-w-lg rf-card border border-orange-200 bg-white', className)}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-orange-100">
            <div className="font-semibold">{title}</div>
            <button className="rf-focus rounded-xl p-2 hover:bg-orange-50" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className={cn('p-5 sm:p-6', bodyClassName)}>{children}</div>
        </div>
      </div>
    </div>,
    document.body
  )
}
