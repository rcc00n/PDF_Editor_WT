import { useEffect } from 'react'
import { useAppStore } from '@/shared/state/useAppStore'
import { cn } from './cn'

export default function ToastHost() {
  const toasts = useAppStore(s => s.toasts)
  const dismiss = useAppStore(s => s.dismissToast)

  useEffect(() => {
    const timers = toasts.map((t) =>
      window.setTimeout(() => dismiss(t.id), 4200)
    )
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [toasts, dismiss])

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            'text-left w-[320px] rf-card border px-4 py-3 shadow-sm',
            'bg-white border-neutral-200 dark:bg-neutral-950/90 dark:border-neutral-800',
            t.variant === 'success' && 'border-emerald-200 dark:border-emerald-900',
            t.variant === 'warning' && 'border-amber-200 dark:border-amber-900',
            t.variant === 'danger' && 'border-red-200 dark:border-red-900'
          )}
        >
          <div className="text-sm font-semibold">{t.title}</div>
          {t.message && <div className="text-xs text-neutral-500 dark:text-neutral-400">{t.message}</div>}
        </button>
      ))}
    </div>
  )
}
