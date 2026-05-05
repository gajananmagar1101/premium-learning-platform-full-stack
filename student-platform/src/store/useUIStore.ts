import { create } from 'zustand/react'
import type { StateCreator } from 'zustand/vanilla'
import { persist } from 'zustand/middleware'
import type { Notification, Toast } from '@/types'
import { notificationAPI } from '@/lib/services'

interface UIState {
  darkMode: boolean
  notifications: Notification[]
  notificationsLoading: boolean
  toggleDarkMode: () => void
  fetchNotifications: () => Promise<void>
  markAllRead: () => Promise<void>
  markRead: (id: string) => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  toasts: Toast[]
  addToast: (message: string, type: Toast['type']) => void
  removeToast: (id: string) => void
}

const extractBetween = (text: string, prefix: string, suffix: string) => {
  const start = text.indexOf(prefix)
  if (start === -1) return ''
  const contentStart = start + prefix.length
  const end = text.indexOf(suffix, contentStart)
  if (end === -1) return ''
  return text.slice(contentStart, end).trim()
}

const inferNotificationCategory = (title: string, message: string): Notification['category'] => {
  const titleText = title.toLowerCase()
  const messageText = message.toLowerCase()

  if (titleText.includes('assignment') && titleText.includes('submission')) return 'submission'
  if (titleText.includes('quiz') && titleText.includes('submission')) return 'quiz-submission'
  if (titleText.includes('marks')) return 'marks'
  if (titleText.includes('assignment')) return 'assignment'
  if (titleText.includes('quiz')) return 'quiz'
  if (titleText.includes('profile')) return 'profile'
  if (titleText.includes('access')) return 'access'
  if (messageText.includes('assignment')) return 'assignment'
  if (messageText.includes('quiz')) return 'quiz'
  return 'general'
}

const inferNotificationActionUrl = (category: Notification['category'], title: string, message: string) => {
  if (category === 'assignment') {
    const assignmentTitle = extractBetween(message, '', ' has ')
    return assignmentTitle ? `/assessments?search=${encodeURIComponent(assignmentTitle)}` : '/assessments'
  }

  if (category === 'marks') {
    const assignmentTitle = extractBetween(message, 'Your marks for ', ' are now available.')
    return assignmentTitle ? `/assessments?search=${encodeURIComponent(assignmentTitle)}` : '/assessments'
  }

  if (category === 'submission') {
    const assignmentTitle = extractBetween(message, 'submitted ', '.') || extractBetween(message, 'updated submission for ', '.')
    return assignmentTitle ? `/assessments?search=${encodeURIComponent(assignmentTitle)}` : '/assessments'
  }

  if (category === 'quiz') {
    const quizTitle = extractBetween(message, '', ' is available in your quizzes.') || extractBetween(message, '', ' has been updated.')
    return quizTitle ? `/quizzes?search=${encodeURIComponent(quizTitle)}` : '/quizzes'
  }

  if (category === 'quiz-submission') {
    const quizTitle = extractBetween(message, 'submitted ', '.') || extractBetween(message, "'s ", ' attempt was auto-submitted')
    return quizTitle ? `/quizzes?attemptSearch=${encodeURIComponent(quizTitle)}` : '/quizzes'
  }

  if (category === 'profile' || category === 'access') {
    return '/profile'
  }

  if (title.toLowerCase().includes('faculty')) {
    return '/faculty'
  }

  return undefined
}

const formatNotificationTime = (createdAt?: string) => {
  if (!createdAt) return ''
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const normalizeNotification = (raw: unknown): Notification | null => {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const id = String(item.id ?? item._id ?? '')
  if (!id) return null
  return {
    id,
    title: String(item.title ?? 'Notification'),
    message: String(item.message ?? ''),
    type: item.type === 'success' || item.type === 'warning' ? item.type : 'info',
    category: (
      item.category === 'assignment'
      || item.category === 'quiz'
      || item.category === 'submission'
      || item.category === 'quiz-submission'
      || item.category === 'marks'
      || item.category === 'profile'
      || item.category === 'access'
    )
      ? item.category
      : inferNotificationCategory(String(item.title ?? 'Notification'), String(item.message ?? '')),
    actionUrl: typeof item.actionUrl === 'string' && item.actionUrl.trim()
      ? item.actionUrl
      : inferNotificationActionUrl(
          (
            item.category === 'assignment'
            || item.category === 'quiz'
            || item.category === 'submission'
            || item.category === 'quiz-submission'
            || item.category === 'marks'
            || item.category === 'profile'
            || item.category === 'access'
          )
            ? item.category
            : inferNotificationCategory(String(item.title ?? 'Notification'), String(item.message ?? '')),
          String(item.title ?? 'Notification'),
          String(item.message ?? '')
        ),
    read: Boolean(item.read),
    time: formatNotificationTime(typeof item.createdAt === 'string' ? item.createdAt : undefined),
  }
}

const uiStoreCreator = persist<UIState>(
    (set, get) => ({
      darkMode: false,
      notifications: [],
      notificationsLoading: false,

      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

      fetchNotifications: async () => {
        set({ notificationsLoading: true })
        try {
          const response = await notificationAPI.getAll()
          const notifications = Array.isArray(response.data?.notifications)
            ? response.data.notifications
                .map(normalizeNotification)
                .filter((item: Notification | null): item is Notification => item !== null)
            : []
          set({ notifications })
        } catch {
          set({ notifications: [] })
        } finally {
          set({ notificationsLoading: false })
        }
      },

      markAllRead: async () => {
        const previousNotifications = get().notifications
        set((state) => ({
          notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
        }))
        try {
          await notificationAPI.markAllRead()
        } catch {
          set({ notifications: previousNotifications })
        }
      },

      markRead: async (id) => {
        const previousNotifications = get().notifications
        set((state) => ({
          notifications: state.notifications.map((notification) => (
            notification.id === id ? { ...notification, read: true } : notification
          )),
        }))
        try {
          await notificationAPI.markRead(id)
        } catch {
          set({ notifications: previousNotifications })
        }
      },

      deleteNotification: async (id) => {
        const previousNotifications = get().notifications
        set((state) => ({
          notifications: state.notifications.filter((notification) => notification.id !== id),
        }))
        try {
          await notificationAPI.delete(id)
        } catch {
          set({ notifications: previousNotifications })
        }
      },

      toasts: [],
      addToast: (message, type) => {
        const id = `t${Date.now()}`
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
        setTimeout(() => {
          const { removeToast } = get()
          removeToast(id)
        }, 3500)
      },
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
    }),
    {
      name: 'ui-store',
      partialize: ((state: UIState) => ({ darkMode: state.darkMode })) as never,
    }
  ) as unknown as StateCreator<UIState, [], []>

export const useUIStore = create<UIState>()(uiStoreCreator)
