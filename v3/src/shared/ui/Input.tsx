import type { InputHTMLAttributes } from 'react'
import { cn } from './cn'

export default function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props
  return (
    <input
      {...rest}
      className={cn(
        'rf-focus h-11 w-full rounded-2xl border border-orange-200 bg-white px-4 text-sm',
        'placeholder:text-neutral-400',
        className
      )}
    />
  )
}
