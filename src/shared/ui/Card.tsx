import type { PropsWithChildren } from 'react'
import { cn } from './cn'

export function Card({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        'rf-card border border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/60',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('px-4 pt-4', className)}>{children}</div>
}

export function CardBody({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('px-4 pb-4', className)}>{children}</div>
}

export function CardTitle({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('font-semibold', className)}>{children}</div>
}

export function CardSub({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)}>{children}</div>
}
