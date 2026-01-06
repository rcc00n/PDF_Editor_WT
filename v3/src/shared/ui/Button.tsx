import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

export default function Button(
  props: PropsWithChildren<
    ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
  >
) {
  const { className, variant = 'primary', size = 'md', ...rest } = props
  return (
    <button
      {...rest}
      className={cn(
        'rf-focus inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'h-9 px-3 text-sm' : 'h-10 px-4 text-sm',
        variant === 'primary' &&
          'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100',
        variant === 'secondary' &&
          'border border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900',
        variant === 'ghost' &&
          'hover:bg-neutral-100 dark:hover:bg-neutral-900',
        variant === 'danger' &&
          'bg-red-600 text-white hover:bg-red-500',
        className
      )}
    />
  )
}
