import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import { Navbar } from '@/components/ui/Navbar'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/useAuthStore'
import { isStaffRole } from '@/lib/roles'

const pageTitles: Record<string, string> = {
  '/dashboard':        'Dashboard',
  '/assessments':      'Assignments',
  '/quizzes':          'Quizzes',
  '/quizzes/create':   'Create Quiz',
  '/subjects':         'Subjects',
  '/students':         'B.Tech Cohorts',
  '/faculty':          'Faculty Management',
  '/reports':          'Reports',
  '/faculty-requests': 'Faculty Requests',
  '/profile':          'Profile',
  '/student-performance': 'My Performance',
  '/student-dashboard':'Learner Dashboard',
}

export function DashboardLayout() {
  const { pathname } = useLocation()
  const title = pathname.startsWith('/quizzes/attempt/')
    ? 'Attempt Quiz'
    : pathname.startsWith('/student-performance/assignments')
      ? 'Assignment History'
      : pathname.startsWith('/student-performance/quizzes')
        ? 'Quiz History'
    : pathname.startsWith('/students/class')
      ? 'Class Learners'
      : pathname.startsWith('/students/profile/') && pathname.endsWith('/assignments')
        ? 'Submitted Assignments'
        : pathname.startsWith('/students/profile/') && pathname.endsWith('/quizzes')
          ? 'Quiz Attempts'
          : pathname.startsWith('/students/profile/') && pathname.endsWith('/history')
            ? 'System Score History'
            : pathname.startsWith('/students/profile/')
              ? 'Learner Profile'
              : pageTitles[pathname] ?? 'EduTrack'

  const navigate = useNavigate()
  const role = useAuthStore(s => s.user?.role)
  const touchStartRef = useRef<{ x: number, y: number } | null>(null)

  const getSwipeRoutes = () => {
    if (isStaffRole(role)) {
      return ['/dashboard', '/assessments', '/quizzes', '/subjects', '/students', '/faculty']
    }
    return ['/student-dashboard', '/assessments', '/quizzes', '/student-performance']
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const deltaX = endX - touchStartRef.current.x
    const deltaY = endY - touchStartRef.current.y
    touchStartRef.current = null

    if (window.innerWidth >= 1024) return

    if (Math.abs(deltaX) > 100 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      let node = e.target as HTMLElement | null
      while (node && node !== e.currentTarget) {
        if (node.scrollWidth > node.clientWidth) {
          const style = window.getComputedStyle(node)
          if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
            return
          }
        }
        node = node.parentElement
      }

      const swipeRoutes = getSwipeRoutes()
      if (!swipeRoutes.includes(pathname)) return

      const currentIndex = swipeRoutes.indexOf(pathname)
      if (deltaX < 0 && currentIndex < swipeRoutes.length - 1) {
        navigate(swipeRoutes[currentIndex + 1])
      } else if (deltaX > 0 && currentIndex > 0) {
        navigate(swipeRoutes[currentIndex - 1])
      }
    }
  }

  return (
    <div className="h-screen bg-light-base dark:bg-dark-base flex overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Navbar title={title} />
        <main 
          className="portal-scroll-region slim-scrollbar flex-1 overflow-x-hidden overflow-y-auto p-2.5 sm:p-3.5 lg:p-5"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait">
            <motion.div key={pathname}
              className="min-w-0 min-h-full pb-4"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
