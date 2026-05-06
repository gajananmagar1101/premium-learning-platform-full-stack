import { useState, useRef, useEffect } from 'react'
import { AlertTriangle, Bell, BookOpenCheck, CheckCheck, CheckCircle2, ChevronDown, CircleUserRound, ClipboardCheck, FileCheck2, FileText, Info, Send, ShieldAlert } from 'lucide-react'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/store/useUIStore'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

const categoryIcon = (notification: Notification) => {
  if (notification.category === 'assignment') return <FileText size={18} className="text-current" />
  if (notification.category === 'quiz') return <ClipboardCheck size={18} className="text-current" />
  if (notification.category === 'submission') return <Send size={18} className="text-current" />
  if (notification.category === 'quiz-submission') return <BookOpenCheck size={18} className="text-current" />
  if (notification.category === 'marks') return <FileCheck2 size={18} className="text-current" />
  if (notification.category === 'profile') return <CircleUserRound size={18} className="text-current" />
  if (notification.category === 'access') return <ShieldAlert size={18} className="text-current" />
  if (notification.type === 'success') return <CheckCircle2 size={18} className="text-current" />
  if (notification.type === 'warning') return <AlertTriangle size={18} className="text-current" />
  return <Info size={18} className="text-current" />
}

const typeIconShell = (notification: Notification) => {
  if (notification.category === 'assignment') {
    return 'bg-gradient-to-br from-indigo-200 via-blue-100 to-indigo-50 text-indigo-600 border border-white/70 shadow-[0_10px_24px_rgba(59,130,246,0.14)]'
  }
  if (notification.category === 'quiz') {
    return 'bg-gradient-to-br from-cyan-200 via-sky-100 to-cyan-50 text-cyan-600 border border-white/70 shadow-[0_10px_24px_rgba(6,182,212,0.14)]'
  }
  if (notification.category === 'submission' || notification.category === 'quiz-submission') {
    return 'bg-gradient-to-br from-fuchsia-200 via-rose-100 to-pink-50 text-fuchsia-600 border border-white/70 shadow-[0_10px_24px_rgba(217,70,239,0.14)]'
  }
  if (notification.category === 'marks') {
    return 'bg-gradient-to-br from-emerald-200 via-emerald-100 to-emerald-50 text-emerald-600 border border-white/70 shadow-[0_10px_24px_rgba(16,185,129,0.14)]'
  }
  if (notification.category === 'profile') {
    return 'bg-gradient-to-br from-violet-200 via-purple-100 to-violet-50 text-violet-600 border border-white/70 shadow-[0_10px_24px_rgba(139,92,246,0.14)]'
  }
  if (notification.category === 'access' || notification.type === 'warning') {
    return 'bg-gradient-to-br from-amber-200 via-orange-100 to-amber-50 text-amber-600 border border-white/70 shadow-[0_10px_24px_rgba(245,158,11,0.14)]'
  }
  if (notification.type === 'success') {
    return 'bg-gradient-to-br from-emerald-200 via-emerald-100 to-emerald-50 text-emerald-600 border border-white/70 shadow-[0_10px_24px_rgba(16,185,129,0.14)]'
  }
  return 'bg-gradient-to-br from-slate-200 via-slate-100 to-white text-slate-600 border border-white/70 shadow-[0_10px_24px_rgba(100,116,139,0.14)]'
}

const NOTIFICATION_DELETE_THRESHOLD = 78
const INTERACTIVE_TARGET_SELECTOR = 'a, input, select, textarea, [data-notification-interactive="true"]'

interface NotificationCardProps {
  notification: Notification
  expanded: boolean
  dismissing: boolean
  onToggleExpand: () => void
  onOpen: () => void
  onDelete: (direction: number) => void
}

function NotificationCard({
  notification,
  expanded,
  dismissing,
  onToggleExpand,
  onOpen,
  onDelete,
}: NotificationCardProps) {
  const dragXRef = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const pointerDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const gestureModeRef = useRef<'horizontal' | 'vertical' | null>(null)
  const pointerActiveRef = useRef(false)
  const x = useMotionValue(0)

  const updateDragX = (value: number) => {
    dragXRef.current = value
    x.set(value)
  }

  useEffect(() => {
    // Intentionally empty. We do not reset updateDragX(0) here because it causes a jump 
    // when the parent starts animating the dismiss offset. Leaving x at its current dragged
    // position allows the parent's translate animation to continue seamlessly.
  }, [dismissing])

  const handlePointerStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (target?.closest(INTERACTIVE_TARGET_SELECTOR)) {
      return
    }
    x.stop()
    pointerActiveRef.current = true
    cardRef.current?.setPointerCapture(event.pointerId)
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
    pointerDeltaRef.current = { x: 0, y: 0 }
    gestureModeRef.current = null
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerActiveRef.current || !pointerStartRef.current) return

    const deltaX = event.clientX - pointerStartRef.current.x
    const deltaY = event.clientY - pointerStartRef.current.y
    pointerDeltaRef.current = { x: deltaX, y: deltaY }

    if (!gestureModeRef.current) {
      gestureModeRef.current = Math.abs(deltaX) >= Math.abs(deltaY) ? 'horizontal' : 'vertical'
    }

    if (gestureModeRef.current === 'horizontal') {
      updateDragX(deltaX)
    }
  }

  const handlePointerEnd = (event?: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerActiveRef.current) return
    pointerActiveRef.current = false
    if (event && cardRef.current?.hasPointerCapture(event.pointerId)) {
      cardRef.current.releasePointerCapture(event.pointerId)
    }

    if (gestureModeRef.current === 'horizontal') {
      if (Math.abs(dragXRef.current) >= NOTIFICATION_DELETE_THRESHOLD) {
        onDelete(dragXRef.current)
      } else {
        dragXRef.current = 0
        animate(x, 0, { type: 'spring', stiffness: 520, damping: 36, mass: 0.7 })
      }
    }

    pointerDeltaRef.current = { x: 0, y: 0 }
    pointerStartRef.current = null
    gestureModeRef.current = null
  }

  const handleOpen = () => {
    if (Math.abs(dragXRef.current) > 8) {
      dragXRef.current = 0
      animate(x, 0, { type: 'spring', stiffness: 520, damping: 36, mass: 0.7 })
      return
    }
    onOpen()
  }

  return (
    <div className="relative rounded-[2.15rem]">
      <motion.div
        ref={cardRef}
        layout
        onPointerDown={handlePointerStart}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
        style={{ x }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        transition={{
          opacity: { duration: 0.18, ease: 'easeOut' },
          scale: { duration: 0.22, ease: 'easeOut' },
          layout: { duration: 0.3, ease: 'easeOut' }
        }}
        className={cn(
          'relative flex w-full touch-pan-y select-none gap-2 rounded-[2.15rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] px-3.5 text-left shadow-[0_18px_34px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-colors duration-200',
          expanded ? 'min-h-[4.15rem] items-start py-2' : 'h-[4.5rem] items-center py-1.5',
          notification.read
            ? 'hover:bg-white'
            : 'hover:bg-white'
        )}
      >
        <motion.button
          layout="position"
          type="button"
          onClick={handleOpen}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <motion.div layout="position" className={cn(
            'flex h-11 w-11 shrink-0 self-center items-center justify-center rounded-[1.45rem]',
            typeIconShell(notification)
          )}>
            {categoryIcon(notification)}
          </motion.div>
          <motion.div layout="position" className={cn('min-w-0 flex-1', !expanded && 'self-center')}>
            <motion.div layout="position" className={cn('flex gap-2', expanded ? 'items-start' : 'items-center')}>
              <motion.p layout="position" className={cn(
                'min-w-0 flex-1 text-[13px] leading-5 text-slate-950',
                expanded ? 'whitespace-normal break-words' : 'truncate',
                notification.read ? 'font-bold' : 'font-extrabold'
              )}>
                {notification.title}
              </motion.p>
              <motion.p layout="position" className="shrink-0 text-[10px] text-slate-500">{notification.time}</motion.p>
            </motion.div>
            <motion.p layout="position" className={cn(
              'text-[11px] leading-4 text-slate-700',
              expanded ? 'mt-0.5 whitespace-pre-wrap' : 'mt-0.5 line-clamp-1'
            )}>
              {notification.message}
            </motion.p>
          </motion.div>
        </motion.button>

        <motion.div layout="position" className="flex shrink-0 self-center items-center gap-0.5 pl-0.5">
          {!notification.read && <span className="h-2 w-2 rounded-full bg-accent" />}
          <button
            type="button"
            onPointerDown={(event) => {
              event.stopPropagation()
              onToggleExpand()
            }}
            onClick={(event) => {
              event.stopPropagation()
            }}
            className="rounded-full p-1 text-slate-500 transition-colors hover:bg-black/5"
            aria-label={expanded ? 'Collapse notification' : 'Expand notification'}
            data-notification-interactive="true"
          >
            <ChevronDown size={16} className={cn('transition-transform duration-200', expanded && 'rotate-180')} />
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null)
  const [dismissingDirections, setDismissingDirections] = useState<Record<string, 1 | -1>>({})
  const [dismissDistances, setDismissDistances] = useState<Record<string, number>>({})
  const [mounted, setMounted] = useState(false)
  const notifications = useUIStore((state) => state.notifications)
  const notificationsLoading = useUIStore((state) => state.notificationsLoading)
  const fetchNotifications = useUIStore((state) => state.fetchNotifications)
  const markAllRead = useUIStore((state) => state.markAllRead)
  const markRead = useUIStore((state) => state.markRead)
  const deleteNotification = useUIStore((state) => state.deleteNotification)
  const navigate = useNavigate()
  const unread = notifications.filter((n) => !n.read).length
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    void fetchNotifications()
  }, [fetchNotifications, open])

  useEffect(() => {
    if (!expandedNotificationId) return
    if (!notifications.some((notification) => notification.id === expandedNotificationId)) {
      setExpandedNotificationId(null)
    }
  }, [expandedNotificationId, notifications])

  useEffect(() => {
    setDismissingDirections((current) => {
      const activeIds = new Set(notifications.map((notification) => notification.id))
      return Object.fromEntries(
        Object.entries(current).filter(([id]) => activeIds.has(id))
      ) as Record<string, 1 | -1>
    })
    setDismissDistances((current) => {
      const activeIds = new Set(notifications.map((notification) => notification.id))
      return Object.fromEntries(
        Object.entries(current).filter(([id]) => activeIds.has(id))
      ) as Record<string, number>
    })
  }, [notifications])

  const handleNotificationOpen = (notification: Notification) => {
    void markRead(notification.id)
    setOpen(false)
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    }
  }

  const handleDismissStart = (id: string, direction: number) => {
    setExpandedNotificationId((current) => (current === id ? null : current))
    const viewportWidth = typeof window === 'undefined' ? 480 : window.innerWidth
    const dismissDistance = viewportWidth + 240
    setDismissingDirections((current) => {
      if (current[id]) return current
      return { ...current, [id]: direction >= 0 ? 1 : -1 }
    })
    setDismissDistances((current) => {
      if (current[id]) return current
      return { ...current, [id]: dismissDistance }
    })
  }

  const handleDismissComplete = (id: string) => {
    setDismissingDirections((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    setDismissDistances((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    void deleteNotification(id)
  }

  return (
    <div className="relative" ref={triggerRef}>
      <button onClick={() => setOpen((v) => !v)}
        className="theme-pill apple-glass relative rounded-full p-1.5 text-light-ink-secondary transition-colors hover:bg-white/80 hover:text-light-ink-primary dark:border-white/15 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800/90 dark:hover:text-white">
        <Bell size={16} className="text-light-ink-secondary dark:text-dark-ink-secondary" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {mounted ? createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-[130] bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.22),transparent_18%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.14),transparent_14%),radial-gradient(circle_at_24%_78%,rgba(34,197,94,0.14),transparent_18%),radial-gradient(circle_at_80%_76%,rgba(168,85,247,0.14),transparent_18%),rgba(15,23,42,0.32)] backdrop-blur-[34px] supports-[backdrop-filter]:backdrop-saturate-150"
              />

              <motion.div initial={{ opacity: 0, scale: 0.985, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -60 }} transition={{ duration: 0.2 }}
                ref={panelRef}
                onClick={() => setOpen(false)}
                className="fixed inset-x-2 top-14 bottom-3 z-[140] overflow-visible rounded-[2.4rem] bg-[linear-gradient(180deg,rgba(99,102,241,0.18),rgba(15,23,42,0.22)),rgba(255,255,255,0.38)] px-1 py-3 shadow-[0_28px_80px_rgba(15,23,42,0.24)] border border-white/30 backdrop-blur-[30px] sm:inset-x-auto sm:right-5 sm:top-20 sm:bottom-auto sm:w-[24rem]"
                style={{ width: 'min(24rem, calc(100vw - 1rem))' }}
              >
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <div className="absolute -left-8 top-16 h-28 w-28 rounded-full bg-lime-400/20 blur-3xl" />
                  <div className="absolute right-0 top-28 h-32 w-32 rounded-full bg-amber-200/20 blur-3xl" />
                  <div className="absolute left-10 bottom-16 h-28 w-28 rounded-full bg-cyan-400/20 blur-3xl" />
                  <div className="absolute right-10 bottom-8 h-24 w-24 rounded-full bg-violet-400/20 blur-3xl" />
                </div>
                <div className="relative flex h-full flex-col overflow-visible">
                  <div className="flex items-start justify-between gap-3 px-1 pb-3 pt-1" onClick={(e) => e.stopPropagation()}>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-950">Notifications</p>
                      <p className="mt-0.5 text-[11px] text-slate-700">
                        {unread > 0 ? `${unread} unread update${unread === 1 ? '' : 's'}` : 'All caught up'}
                      </p>
                    </div>
                    {unread > 0 && (
                      <button onClick={markAllRead}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/80 bg-white/72 px-2.5 py-1 text-[11px] font-semibold text-slate-800 transition-colors hover:bg-white">
                        <CheckCheck size={12} /> Mark all read
                      </button>
                    )}
                  </div>
                  <div 
                    className="slim-scrollbar flex-1 overflow-y-auto overscroll-y-contain overflow-x-visible px-2 pb-0.5 pt-2"
                    onScroll={(e) => {
                      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
                      // If overscrolled at the bottom by more than 20px (iOS bounce), close the panel
                      if (scrollTop + clientHeight > scrollHeight + 20) {
                        setOpen(false)
                      }
                    }}
                  >
                    {!notificationsLoading && notifications.length === 0 && (
                      <div className="rounded-[1.75rem] border border-white/70 bg-white/64 px-4 py-8 text-center backdrop-blur-xl">
                        <p className="text-sm font-medium text-slate-900">No notifications yet</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Your updates will appear here for this account.
                        </p>
                      </div>
                    )}
                    {notificationsLoading && (
                      <div className="rounded-[1.75rem] border border-white/70 bg-white/64 px-4 py-8 text-center backdrop-blur-xl">
                        <p className="text-sm text-slate-600">Loading notifications...</p>
                      </div>
                    )}
                    {notifications.length > 0 && (
                      <div className="space-y-2.5 overflow-visible px-0.5">
                        <AnimatePresence initial={false}>
                          {notifications.map((n) => {
                            const dismissDirection = dismissingDirections[n.id]
                            const dismissDistance = dismissDistances[n.id] ?? 640
                            const dismissing = Boolean(dismissDirection)
                            const dismissOffset = dismissDirection ? dismissDirection * dismissDistance : 0

                            return (
                              <motion.div
                                key={n.id}
                                layout="position"
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={dismissing
                                  ? { x: dismissOffset, opacity: 0, scale: 0.96, height: 'auto', marginBottom: 0 }
                                  : { opacity: 1, x: 0, y: 0, scale: 1, height: 'auto', marginBottom: 0 }
                                }
                                exit={{ opacity: 0, x: dismissOffset, scale: 0.96, height: 0, marginBottom: 0 }}
                                transition={{
                                  x: dismissing
                                    ? { duration: 0.38, ease: [0.22, 1, 0.36, 1] }
                                    : { duration: 0.18, ease: 'easeOut' },
                                  opacity: { duration: dismissing ? 0.24 : 0.18, ease: 'easeOut' },
                                  scale: { duration: dismissing ? 0.28 : 0.18, ease: 'easeOut' },
                                  height: { duration: dismissing ? 0.18 : 0.18, ease: 'easeOut', delay: dismissing ? 0.34 : 0 },
                                  marginBottom: { duration: dismissing ? 0.18 : 0.18, ease: 'easeOut', delay: dismissing ? 0.34 : 0 },
                                }}
                                onAnimationComplete={() => {
                                  if (dismissing) {
                                    handleDismissComplete(n.id)
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="overflow-visible"
                              >
                                <NotificationCard
                                  notification={n}
                                  expanded={expandedNotificationId === n.id}
                                  dismissing={dismissing}
                                  onToggleExpand={() => setExpandedNotificationId((current) => current === n.id ? null : n.id)}
                                  onOpen={() => handleNotificationOpen(n)}
                                  onDelete={(direction) => handleDismissStart(n.id, direction)}
                                />
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      ) : null}
    </div>
  )
}
