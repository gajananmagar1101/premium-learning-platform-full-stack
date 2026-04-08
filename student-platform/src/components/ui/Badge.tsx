import { cn } from '@/lib/utils'

interface BadgeProps {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'info'
}

const variants = {
  success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  danger:  'bg-red-500/20 text-red-300 border border-red-500/30',
  info:    'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
}

export function Badge({ label, variant }: BadgeProps) {
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize', variants[variant])}>
      {label}
    </span>
  )
}
