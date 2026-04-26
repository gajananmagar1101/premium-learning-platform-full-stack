import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from '@/components/ui/Navbar'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { motion, AnimatePresence } from 'framer-motion'
import { useAssessmentStore } from '@/store/useAssessmentStore'

const pageTitles: Record<string, string> = {
  '/dashboard':        'Dashboard',
  '/assessments':      'Assignments',
  '/quizzes':          'Quizzes',
  '/quizzes/create':   'Create Quiz',
  '/students':         'B.Tech Cohorts',
  '/reports':          'Reports',
  '/profile':          'Profile',
  '/student-dashboard':'Learner Dashboard',
}

export function DashboardLayout() {
  const { pathname } = useLocation()
  const fetchAssessments = useAssessmentStore((state) => state.fetchAssessments)
  const title = pathname.startsWith('/quizzes/attempt/')
    ? 'Attempt Quiz'
    : pathname.startsWith('/students/class')
      ? 'Class Learners'
      : pathname.startsWith('/students/profile/')
        ? 'Learner Profile'
        : pageTitles[pathname] ?? 'EduTrack'

  if (import.meta.env.DEV) {
    console.count(`[Render] DashboardLayout (${pathname})`)
  }

  useEffect(() => {
    fetchAssessments()
  }, [fetchAssessments])

  return (
    <div className="h-screen bg-light-base dark:bg-dark-base flex overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Navbar title={title} />
        <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={pathname}
              className="min-w-0"
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
