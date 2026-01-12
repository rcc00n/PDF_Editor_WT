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
        'rf-focus inline-flex items-center justify-center gap-2 rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-5 text-sm',
        variant === 'primary' &&
          'bg-[var(--rf-accent)] text-[var(--rf-accent-contrast)] hover:bg-[var(--rf-accent-hover)]',
        variant === 'secondary' &&
          'border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-50',
        variant === 'ghost' &&
          'hover:bg-neutral-100 dark:hover:bg-neutral-900',
        variant === 'danger' &&
          'bg-red-600 text-white hover:bg-red-500',
        className
      )}
    />
  )
}
