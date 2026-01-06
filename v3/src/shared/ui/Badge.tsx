import type { PropsWithChildren } from 'react'
import { cn } from './cn'

export default function Badge({ className, children, tone = 'neutral' } : PropsWithChildren<{ className?: string; tone?: 'neutral'|'success'|'warning'|'danger' }>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border',
        tone === 'neutral' && 'border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-200',
        tone === 'success' && 'border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-200',
        tone === 'warning' && 'border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-200',
        tone === 'danger' && 'border-red-200 text-red-700 dark:border-red-900 dark:text-red-200',
        className
      )}
    >
      {children}
    </span>
  )
}
