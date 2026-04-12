import { useState, useRef, useEffect } from 'react'
import { Bell, CheckCheck, Info, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/store/useUIStore'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

const typeIcon = (type: Notification['type']) => {
  if (type === 'success') return <CheckCircle2 size={13} className="text-emerald-400" />
  if (type === 'warning') return <AlertTriangle size={13} className="text-amber-400" />
  return <Info size={13} className="text-indigo-400" />
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const { notifications, notificationsLoading, fetchNotifications, markAllRead, markRead, deleteNotification } = useUIStore()
  const unread = notifications.filter((n) => !n.read).length
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!open) return
    void fetchNotifications()
  }, [fetchNotifications, open])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-xl hover:bg-light-hover dark:hover:bg-dark-hover transition-colors relative">
        <Bell size={17} className="text-light-ink-secondary dark:text-dark-ink-secondary" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-accent rounded-full text-white text-[9px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }} transition={{ duration: 0.15 }}
            className="fixed left-3 right-3 top-16 z-50 overflow-hidden rounded-xl shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80">
            <div className="card max-h-[min(70vh,32rem)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-light-border dark:border-dark-border">
              <p className="text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">Notifications</p>
              {unread > 0 && (
                <button onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {!notificationsLoading && notifications.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm font-medium text-light-ink-primary dark:text-dark-ink-primary">No notifications yet</p>
                  <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted mt-1">
                    Your updates will appear here for this account.
                  </p>
                </div>
              )}
              {notificationsLoading && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted">Loading notifications...</p>
                </div>
              )}
              {notifications.map((n) => (
                <div key={n.id}
                  className={cn(
                    'w-full flex items-start gap-3 px-4 py-3 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors text-left border-b border-light-border dark:border-dark-border last:border-0',
                    !n.read && 'bg-indigo-500/5'
                  )}>
                  <button
                    onClick={() => markRead(n.id)}
                    className="flex items-start gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-light-card2 dark:bg-dark-card2">{typeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm text-light-ink-primary dark:text-dark-ink-primary', !n.read && 'font-semibold')}>{n.title}</p>
                      <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted mt-0.5 truncate">{n.message}</p>
                      <p className="text-xs text-light-ink-muted/60 dark:text-dark-ink-muted/60 mt-1">{n.time}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />}
                  </button>
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="p-1 rounded-md text-light-ink-muted dark:text-dark-ink-muted hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    title="Delete notification"
                    aria-label="Delete notification"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
