import type { PropsWithChildren } from 'react'
import { cn } from './cn'

export default function SectionHeader({ title, subtitle, right }: PropsWithChildren<{ title: string; subtitle?: string; right?: any }>) {
  return (
    <div className="px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-lg font-semibold">{title}</div>
          {subtitle && <div className="text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</div>}
        </div>
        {right && <div className={cn('w-full flex flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:items-center')}>{right}</div>}
      </div>
    </div>
  )
}
