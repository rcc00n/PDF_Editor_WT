import type { SelectHTMLAttributes } from 'react'
import { cn } from './cn'

export default function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props
  return (
    <select
      {...rest}
      className={cn(
        'rf-focus h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm',
        'dark:border-neutral-800 dark:bg-neutral-950',
        className
      )}
    />
  )
}
