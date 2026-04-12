import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useUIStore } from '@/store/useUIStore'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { Login } from '@/pages/Login'
import { AdminLogin } from '@/pages/AdminLogin'
import { StudentLogin } from '@/pages/StudentLogin'
import { Register } from '@/pages/Register'
import { Dashboard } from '@/pages/Dashboard'
import { Assessments } from '@/pages/Assessments'
import { Students } from '@/pages/Students'
import { Reports } from '@/pages/Reports'
import { Profile } from '@/pages/Profile'
import { StudentDashboard } from '@/pages/StudentDashboard'
import { SubjectAssignmentsPage } from '@/pages/SubjectAssignmentsPage'
import { ClassStudentsPage } from '@/pages/ClassStudentsPage'
import { Quizzes } from '@/pages/Quizzes'

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, hydrated } = useAuthStore()
  if (!hydrated) return null
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/student-dashboard" replace />
  return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuthStore()
  if (!hydrated) return null
  if (user) return <Navigate to={user.role === 'admin' ? '/dashboard' : '/student-dashboard'} replace />
  return <>{children}</>
}

export default function App() {
  const { user, hydrated, markHydrated } = useAuthStore()
  const { darkMode, syncNotifications, registerUsers } = useUIStore()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    if (!hydrated) {
      markHydrated()
    }
  }, [hydrated, markHydrated])

  useEffect(() => {
    syncNotifications(user?._id ?? user?.id ?? null)
  }, [syncNotifications, user?._id, user?.id])

  useEffect(() => {
    if (user) {
      registerUsers([user])
    }
  }, [registerUsers, user])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/login/admin" element={<GuestRoute><AdminLogin /></GuestRoute>} />
        <Route path="/login/student" element={<GuestRoute><StudentLogin /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

        {/* Protected app routes */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/quizzes/create" element={<Quizzes />} />
          <Route path="/quizzes/attempt/:quizId" element={<Quizzes />} />
          <Route path="/assessments/subject" element={<ProtectedRoute adminOnly><SubjectAssignmentsPage /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute adminOnly><Students /></ProtectedRoute>} />
          <Route path="/students/class" element={<ProtectedRoute adminOnly><ClassStudentsPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? '/dashboard' : '/student-dashboard') : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
