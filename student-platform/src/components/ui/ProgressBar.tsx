import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  label?: string
  showValue?: boolean
  color?: string
}

export function ProgressBar({ value, label, showValue = true, color = 'bg-indigo-500' }: ProgressBarProps) {
  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between mb-1.5">
          {label && <span className="text-sm text-light-ink-secondary dark:text-dark-ink-secondary">{label}</span>}
          {showValue && <span className="text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">{value}%</span>}
        </div>
      )}
      <div className="w-full bg-light-base dark:bg-dark-base rounded-full h-2 border border-light-border dark:border-dark-border">
        <div
          className={cn('h-2 rounded-full transition-all duration-700', color)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}
