import type { LucideIcon } from 'lucide-react'
import { GlassCard } from './GlassCard'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: React.ReactNode
  change?: string
  positive?: boolean
  icon: LucideIcon
  iconColor: string
  iconBg: string
}

export function StatCard({ title, value, change, positive, icon: Icon, iconColor, iconBg }: StatCardProps) {
  return (
    <GlassCard hover className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-light-ink-muted dark:text-dark-ink-muted">{title}</p>
          <p className="text-2xl font-bold text-light-ink-primary dark:text-dark-ink-primary mt-1.5">{value}</p>
          {change && (
            <p className={cn('text-xs mt-1.5 font-medium flex items-center gap-1', positive ? 'text-emerald-400' : 'text-red-400')}>
              {positive ? '↑' : '↓'} {change}
            </p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-xl', iconBg)}>
          <Icon size={20} className={iconColor} />
        </div>
      </div>
    </GlassCard>
  )
}
