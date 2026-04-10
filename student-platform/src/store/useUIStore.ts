import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Notification, Toast, User } from '@/types'
import { useAuthStore } from './useAuthStore'

type NotificationInput = Pick<Notification, 'title' | 'message' | 'type'> & { time?: string }
type UserSummary = Pick<User, 'id' | 'name' | 'role' | 'grade' | 'email'> & { _id?: string }
type NotificationTargetOptions = { excludeUserIds?: string[] }

interface UIState {
  darkMode: boolean
  toggleDarkMode: () => void
  notifications: Notification[]
  notificationsByUser: Record<string, Notification[]>
  knownUsers: Record<string, UserSummary>
  syncNotifications: (userId?: string | null) => void
  registerUsers: (users: UserSummary[]) => void
  addNotification: (notification: NotificationInput) => void
  addNotificationForUsers: (userIds: string[], notification: NotificationInput, options?: NotificationTargetOptions) => void
  addNotificationForRole: (role: User['role'], notification: NotificationInput, options?: NotificationTargetOptions) => void
  deleteNotification: (id: string) => void
  markAllRead: () => void
  markRead: (id: string) => void
  toasts: Toast[]
  addToast: (message: string, type: Toast['type']) => void
  removeToast: (id: string) => void
}

const getActiveUserId = () => {
  const user = useAuthStore.getState().user
  return user?._id ?? user?.id ?? null
}

const getNotificationsForUser = (
  notificationsByUser: Record<string, Notification[]>,
  userId?: string | null
) => {
  if (!userId) return []
  return notificationsByUser[userId] ?? []
}

const formatNotificationTime = () =>
  new Date().toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const buildNotification = (notification: NotificationInput): Notification => ({
  id: `n${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
  title: notification.title,
  message: notification.message,
  type: notification.type,
  time: notification.time ?? formatNotificationTime(),
  read: false,
})

const pushNotificationForUser = (
  notificationsByUser: Record<string, Notification[]>,
  userId: string,
  notification: Notification
) => ({
  ...notificationsByUser,
  [userId]: [notification, ...getNotificationsForUser(notificationsByUser, userId)].slice(0, 30),
})

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      darkMode: false,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      notifications: [],
      notificationsByUser: {},
      knownUsers: {},
      syncNotifications: (userId) => set((state) => ({
        notifications: getNotificationsForUser(state.notificationsByUser, userId ?? getActiveUserId()),
      })),
      registerUsers: (users) => set((state) => {
        const nextKnownUsers = { ...state.knownUsers }
        for (const user of users) {
          const userId = user._id ?? user.id
          if (!userId) continue
          nextKnownUsers[userId] = {
            ...user,
            id: userId,
            _id: userId,
          }
        }
        return { knownUsers: nextKnownUsers }
      }),
      addNotification: (notification) => set((state) => {
        const userId = getActiveUserId()
        if (!userId) return { notifications: state.notifications }

        const nextNotification = buildNotification(notification)
        const notificationsByUser = pushNotificationForUser(state.notificationsByUser, userId, nextNotification)
        const notifications = getNotificationsForUser(notificationsByUser, userId)
        return { notifications, notificationsByUser }
      }),
      addNotificationForUsers: (userIds, notification, options) => set((state) => {
        const excludedUserIds = new Set((options?.excludeUserIds ?? []).filter(Boolean))
        const uniqueUserIds = [...new Set(userIds.filter((userId) => userId && !excludedUserIds.has(userId)))]
        if (uniqueUserIds.length === 0) return { notifications: state.notifications }

        let notificationsByUser = state.notificationsByUser
        for (const userId of uniqueUserIds) {
          notificationsByUser = pushNotificationForUser(notificationsByUser, userId, buildNotification(notification))
        }

        const activeUserId = getActiveUserId()
        return {
          notifications: getNotificationsForUser(notificationsByUser, activeUserId),
          notificationsByUser,
        }
      }),
      addNotificationForRole: (role, notification, options) => set((state) => {
        const excludedUserIds = new Set((options?.excludeUserIds ?? []).filter(Boolean))
        const userIds = Object.values(state.knownUsers)
          .filter((user) => user.role === role && !excludedUserIds.has(user.id))
          .map((user) => user.id)

        if (userIds.length === 0) return { notifications: state.notifications }

        let notificationsByUser = state.notificationsByUser
        for (const userId of userIds) {
          notificationsByUser = pushNotificationForUser(notificationsByUser, userId, buildNotification(notification))
        }

        const activeUserId = getActiveUserId()
        return {
          notifications: getNotificationsForUser(notificationsByUser, activeUserId),
          notificationsByUser,
        }
      }),
      deleteNotification: (id) => set((state) => {
        const userId = getActiveUserId()
        if (!userId) return { notifications: state.notifications }

        const notifications = getNotificationsForUser(state.notificationsByUser, userId)
          .filter((notification) => notification.id !== id)

        return {
          notifications,
          notificationsByUser: {
            ...state.notificationsByUser,
            [userId]: notifications,
          },
        }
      }),
      markAllRead: () => set((state) => {
        const userId = getActiveUserId()
        if (!userId) return { notifications: [] }

        const notifications = getNotificationsForUser(state.notificationsByUser, userId)
          .map((notification) => ({ ...notification, read: true }))

        return {
          notifications,
          notificationsByUser: {
            ...state.notificationsByUser,
            [userId]: notifications,
          },
        }
      }),
      markRead: (id) => set((state) => {
        const userId = getActiveUserId()
        if (!userId) return { notifications: state.notifications }

        const notifications = getNotificationsForUser(state.notificationsByUser, userId)
          .map((notification) => notification.id === id ? { ...notification, read: true } : notification)

        return {
          notifications,
          notificationsByUser: {
            ...state.notificationsByUser,
            [userId]: notifications,
          },
        }
      }),
      toasts: [],
      addToast: (message, type) => {
        const id = `t${Date.now()}`
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500)
      },
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'ui-store',
      partialize: (s) => ({
        darkMode: s.darkMode,
        notificationsByUser: s.notificationsByUser,
        knownUsers: s.knownUsers,
      }),
    }
  )
)
