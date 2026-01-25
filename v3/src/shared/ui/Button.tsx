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
          'bg-[var(--rf-orange-600)] text-[var(--rf-accent-contrast)] hover:bg-[var(--rf-orange-500)]',
        variant === 'secondary' &&
          'border border-[var(--rf-border)] bg-[var(--rf-orange-50)] text-[var(--rf-text-accent-strong)] hover:bg-[var(--rf-orange-100)]',
        variant === 'ghost' &&
          'text-[var(--rf-text-accent)] hover:bg-[var(--rf-orange-100)]',
        variant === 'danger' &&
          'bg-[var(--rf-orange-800)] text-[var(--rf-accent-contrast)] hover:bg-[var(--rf-orange-700)]',
        className
      )}
    />
  )
}
