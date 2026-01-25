import { forwardRef } from 'react'
import type { PropsWithChildren } from 'react'
import { cn } from './cn'

export function Card({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        'rf-card border border-[var(--rf-border-soft)] bg-[var(--rf-surface)]',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('px-5 pt-5 sm:px-6 sm:pt-6', className)}>{children}</div>
}

export const CardBody = forwardRef<HTMLDivElement, PropsWithChildren<{ className?: string }>>(
  ({ className, children }, ref) => {
    return (
      <div ref={ref} className={cn('px-5 pb-5 sm:px-6 sm:pb-6', className)}>
        {children}
      </div>
    )
  }
)

CardBody.displayName = 'CardBody'

export function CardTitle({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('font-semibold', className)}>{children}</div>
}

export function CardSub({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn('text-sm text-neutral-500', className)}>{children}</div>
}
