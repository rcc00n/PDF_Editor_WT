import type { TextareaHTMLAttributes } from 'react'
import { cn } from './cn'

export default function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props
  return (
    <textarea
      {...rest}
      className={cn(
        'rf-focus min-h-[90px] w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm',
        'placeholder:text-neutral-400',
        'dark:border-neutral-800 dark:bg-neutral-950',
        className
      )}
    />
  )
}
