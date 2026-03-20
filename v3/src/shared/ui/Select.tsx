import type { SelectHTMLAttributes } from 'react'
import { cn } from './cn'

export default function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props
  return (
    <select
      {...rest}
      className={cn(
        'rf-focus h-11 w-full rounded-2xl border border-[var(--rf-border)] bg-[var(--rf-surface)] px-4 text-sm',
        className
      )}
    />
  )
}
