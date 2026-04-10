import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import type { User } from '@/types'
import { authAPI } from '@/lib/services'

interface AuthState {
  user: User | null
  token: string | null
  loginError: string | null
  loading: boolean
  hydrated: boolean
  markHydrated: () => void
  login: (email: string, password: string) => Promise<boolean>
  register: (data: { name: string; email: string; password: string; role: string; grade?: string }) => Promise<boolean>
  setUser: (user: User | null) => void
  logout: () => void
  clearError: () => void
}

const normalizeUser = (user: User & { _id?: string; role?: string }): User => ({
  ...user,
  id: user._id ?? user.id,
  role: (user.role?.toLowerCase() === 'admin' ? 'admin' : 'student'),
})

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      loginError: null,
      loading: false,
      hydrated: false,
      markHydrated: () => set({ hydrated: true }),

      login: async (email, password) => {
        set({ loading: true, loginError: null })
        try {
          const res = await authAPI.login({ email, password })
          const { token, user } = res.data
          const normalizedUser = normalizeUser(user)
          localStorage.setItem('token', token)
          set({ user: normalizedUser, token, loading: false, loginError: null })
          return true
        } catch (err: unknown) {
          const msg = axios.isAxiosError(err)
            ? err.response?.data?.message ?? (err.request ? 'Cannot reach the server. Make sure the backend deployment is running and reachable.' : err.message)
            : 'Login failed'
          set({ loginError: msg, loading: false })
          return false
        }
      },

      register: async (data) => {
        set({ loading: true, loginError: null })
        try {
          const res = await authAPI.register(data)
          const { token, user } = res.data
          const normalizedUser = normalizeUser(user)
          localStorage.setItem('token', token)
          set({ user: normalizedUser, token, loading: false, loginError: null })
          return true
        } catch (err: unknown) {
          const msg = axios.isAxiosError(err)
            ? err.response?.data?.message ?? (err.request ? 'Cannot reach the server. Make sure the backend deployment is running and reachable.' : err.message)
            : 'Registration failed'
          set({ loginError: msg, loading: false })
          return false
        }
      },

      setUser: (user) => set({ user: user ? normalizeUser(user) : null }),

      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, token: null, loginError: null, loading: false })
      },

      clearError: () => set({ loginError: null }),
    }),
    {
      name: 'auth-store',
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        state?.clearError()
        state?.markHydrated()
      },
    }
  )
)
