import type { PropsWithChildren } from 'react'
import { cn } from './cn'

export default function Kbd({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center rounded-lg border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-600',
        'dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300',
        className
      )}
    >
      {children}
    </kbd>
  )
}
