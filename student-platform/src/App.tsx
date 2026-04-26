import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useUIStore } from '@/store/useUIStore'

const DashboardLayout = lazy(() => import('@/layouts/DashboardLayout').then((module) => ({ default: module.DashboardLayout })))
const Login = lazy(() => import('@/pages/Login').then((module) => ({ default: module.Login })))
const AdminLogin = lazy(() => import('@/pages/AdminLogin').then((module) => ({ default: module.AdminLogin })))
const StudentLogin = lazy(() => import('@/pages/StudentLogin').then((module) => ({ default: module.StudentLogin })))
const Register = lazy(() => import('@/pages/Register').then((module) => ({ default: module.Register })))
const Dashboard = lazy(() => import('@/pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const Assessments = lazy(() => import('@/pages/Assessments').then((module) => ({ default: module.Assessments })))
const Students = lazy(() => import('@/pages/Students').then((module) => ({ default: module.Students })))
const Reports = lazy(() => import('@/pages/Reports').then((module) => ({ default: module.Reports })))
const Profile = lazy(() => import('@/pages/Profile').then((module) => ({ default: module.Profile })))
const StudentDashboard = lazy(() => import('@/pages/StudentDashboard').then((module) => ({ default: module.StudentDashboard })))
const SubjectAssignmentsPage = lazy(() => import('@/pages/SubjectAssignmentsPage').then((module) => ({ default: module.SubjectAssignmentsPage })))
const ClassStudentsPage = lazy(() => import('@/pages/ClassStudentsPage').then((module) => ({ default: module.ClassStudentsPage })))
const Quizzes = lazy(() => import('@/pages/Quizzes').then((module) => ({ default: module.Quizzes })))
const StudentProfilePage = lazy(() => import('@/pages/StudentProfilePage').then((module) => ({ default: module.StudentProfilePage })))

function AppShellFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-light-bg px-4 dark:bg-dark-bg">
      <div className="rounded-2xl border border-light-border bg-white/80 px-5 py-3 text-sm text-light-ink-muted shadow-sm dark:border-dark-border dark:bg-dark-card dark:text-dark-ink-muted">
        Loading...
      </div>
    </div>
  )
}

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
  const { darkMode, fetchNotifications } = useUIStore()

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
    if (user) {
      void fetchNotifications()
    }
  }, [fetchNotifications, user])

  return (
    <BrowserRouter>
      <Suspense fallback={<AppShellFallback />}>
        <Routes>
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/login/admin" element={<GuestRoute><AdminLogin /></GuestRoute>} />
          <Route path="/login/student" element={<GuestRoute><StudentLogin /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/quizzes" element={<Quizzes />} />
            <Route path="/quizzes/create" element={<Quizzes />} />
            <Route path="/quizzes/attempt/:quizId" element={<Quizzes />} />
            <Route path="/assessments/subject" element={<ProtectedRoute adminOnly><SubjectAssignmentsPage /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute adminOnly><Students /></ProtectedRoute>} />
            <Route path="/students/class" element={<ProtectedRoute adminOnly><ClassStudentsPage /></ProtectedRoute>} />
            <Route path="/students/profile/:studentId" element={<ProtectedRoute adminOnly><StudentProfilePage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/student-dashboard" element={<StudentDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? '/dashboard' : '/student-dashboard') : '/login'} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
