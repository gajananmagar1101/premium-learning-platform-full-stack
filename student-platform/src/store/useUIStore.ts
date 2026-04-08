import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Notification, Toast } from '@/types'

const defaultNotifications: Notification[] = [
  { id: 'n1', title: 'New Submission', message: 'Alice submitted Algebra Midterm', time: '2m ago', read: false, type: 'info' },
  { id: 'n2', title: 'Assessment Graded', message: 'Physics Lab results are ready', time: '1h ago', read: false, type: 'success' },
  { id: 'n3', title: 'Upcoming Deadline', message: 'World History Quiz in 3 days', time: '3h ago', read: true, type: 'warning' },
  { id: 'n4', title: 'New Student', message: 'Frank Wilson joined the class', time: '1d ago', read: true, type: 'info' },
]

interface UIState {
  darkMode: boolean
  toggleDarkMode: () => void
  notifications: Notification[]
  markAllRead: () => void
  markRead: (id: string) => void
  toasts: Toast[]
  addToast: (message: string, type: Toast['type']) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      darkMode: false,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      notifications: defaultNotifications,
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) })),
      toasts: [],
      addToast: (message, type) => {
        const id = `t${Date.now()}`
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
      },
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    { name: 'ui-store', partialize: (s) => ({ darkMode: s.darkMode }) }
  )
)
