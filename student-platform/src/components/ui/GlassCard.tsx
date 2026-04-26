import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function GlassCard({ children, className, hover = false, onClick }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.995 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      whileHover={hover ? { y: -4, scale: 1.005, boxShadow: '0 20px 45px rgba(79,70,229,0.22)' } : undefined}
      onClick={onClick}
      className={cn('card', className)}
    >
      {children}
    </motion.div>
  )
}
