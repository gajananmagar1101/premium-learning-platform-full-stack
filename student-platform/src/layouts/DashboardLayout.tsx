import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/ui/Sidebar'
import { Navbar } from '@/components/ui/Navbar'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { motion, AnimatePresence } from 'framer-motion'
import { useAssessmentStore } from '@/store/useAssessmentStore'

const pageTitles: Record<string, string> = {
  '/dashboard':        'Dashboard',
  '/assessments':      'Assignments',
  '/students':         'Students',
  '/reports':          'Reports',
  '/profile':          'Profile',
  '/student-dashboard':'My Dashboard',
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const fetchAssessments = useAssessmentStore((state) => state.fetchAssessments)
  const title = pageTitles[pathname] ?? 'EduTrack'

  if (import.meta.env.DEV) {
    console.count(`[Render] DashboardLayout (${pathname})`)
  }

  useEffect(() => {
    fetchAssessments()
  }, [fetchAssessments])

  return (
    <div className="h-screen bg-light-base dark:bg-dark-base flex overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} title={title} />
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
