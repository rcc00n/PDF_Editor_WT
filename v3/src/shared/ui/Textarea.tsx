import type { TextareaHTMLAttributes } from 'react'
import { cn } from './cn'

export default function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props
  return (
    <textarea
      {...rest}
      className={cn(
        'rf-focus min-h-[110px] w-full rounded-2xl border border-[var(--rf-border)] bg-[var(--rf-surface)] px-4 py-3 text-sm',
        'placeholder:text-neutral-400',
        className
      )}
    />
  )
}
