import type { PropsWithChildren } from 'react'
import { cn } from './cn'

export default function SectionHeader({ title, subtitle, right }: PropsWithChildren<{ title: string; subtitle?: string; right?: any }>) {
  return (
    <div className="px-6 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold">{title}</div>
          {subtitle && <div className="text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</div>}
        </div>
        {right && <div className={cn('shrink-0 flex items-center gap-2')}>{right}</div>}
      </div>
    </div>
  )
}
