import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { Navbar } from '@/components/ui/Navbar'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { motion, AnimatePresence, useMotionValue, animate, useTransform, MotionValue } from 'framer-motion'
import { useAuthStore } from '@/store/useAuthStore'
import { isStaffRole } from '@/lib/roles'

const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Assessments = lazy(() => import('@/pages/Assessments').then((m) => ({ default: m.Assessments })))
const Quizzes = lazy(() => import('@/pages/Quizzes').then((m) => ({ default: m.Quizzes })))
const Subjects = lazy(() => import('@/pages/Subjects').then((m) => ({ default: m.Subjects })))
const Students = lazy(() => import('@/pages/Students').then((m) => ({ default: m.Students })))
const FacultyRequests = lazy(() => import('@/pages/FacultyRequests').then((m) => ({ default: m.FacultyRequests })))
const Reports = lazy(() => import('@/pages/Reports').then((m) => ({ default: m.Reports })))
const StudentDashboard = lazy(() => import('@/pages/StudentDashboard').then((m) => ({ default: m.StudentDashboard })))
const StudentPlannerPage = lazy(() => import('@/pages/StudentPlannerPage').then((m) => ({ default: m.StudentPlannerPage })))

const routeComponents: Record<string, React.ReactNode> = {
  '/dashboard': <Dashboard />,
  '/assessments': <Assessments />,
  '/quizzes': <Quizzes />,
  '/subjects': <Subjects />,
  '/students': <Students />,
  '/faculty': <FacultyRequests />,
  '/reports': <Reports />,
  '/student-dashboard': <StudentDashboard />,
  '/student-planner': <StudentPlannerPage />,
}

function TabFallback() {
  return <div className="flex h-full w-full items-center justify-center text-sm text-light-ink-muted">Loading...</div>
}

function LazyTab({ isNear, children }: { isNear: boolean; children: React.ReactNode }) {
  const [hasRendered, setHasRendered] = useState(isNear)
  
  if (isNear && !hasRendered) {
    setHasRendered(true)
  }

  if (!hasRendered) return null
  return (
    <div className="h-full w-full overflow-x-hidden overflow-y-auto portal-scroll-region slim-scrollbar p-2.5 sm:p-3.5 lg:p-5" style={{ display: isNear ? 'block' : 'none' }}>
      {children}
    </div>
  )
}

function AnimatedTab({ 
  idx, 
  trackX, 
  windowWidth, 
  children 
}: { 
  idx: number; 
  trackX: MotionValue<number>; 
  windowWidth: number; 
  children: React.ReactNode 
}) {
  const scale = useTransform(
    trackX,
    [-(idx + 1) * windowWidth, -idx * windowWidth, -(idx - 1) * windowWidth],
    [0.93, 1, 0.93],
    { clamp: true }
  )
  const opacity = useTransform(
    trackX,
    [-(idx + 1) * windowWidth, -idx * windowWidth, -(idx - 1) * windowWidth],
    [0.4, 1, 0.4],
    { clamp: true }
  )
  const blurValue = useTransform(
    trackX,
    [-(idx + 1) * windowWidth, -idx * windowWidth, -(idx - 1) * windowWidth],
    [4, 0, 4],
    { clamp: true }
  )
  const filter = useTransform(blurValue, (val) => `blur(${val}px)`)
  
  return (
    <motion.div 
      style={{ 
        scale, 
        opacity, 
        filter,
        willChange: 'transform, opacity, filter',
      }} 
      className="h-full w-full origin-center"
    >
      {children}
    </motion.div>
  )
}

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
  const [slideDir, setSlideDir] = useState(1)

  const getSwipeRoutes = () => {
    if (isStaffRole(role)) {
      const routes = ['/dashboard', '/assessments', '/quizzes', '/subjects', '/students']
      if (role === 'admin') routes.push('/faculty')
      routes.push('/reports')
      return routes
    }
    return ['/student-dashboard', '/assessments', '/quizzes', '/student-planner']
  }

  const swipeRoutes = getSwipeRoutes()
  const isSwipeRoute = swipeRoutes.includes(pathname)
  const currentIndex = isSwipeRoute ? swipeRoutes.indexOf(pathname) : -1

  const trackX = useMotionValue(0)
  const isSwipingRef = useRef(false)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 375)

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
      if (!isSwipingRef.current && currentIndex !== -1) {
        trackX.set(currentIndex * -window.innerWidth)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [currentIndex, trackX])

  useEffect(() => {
    if (!isSwipingRef.current && currentIndex !== -1) {
      animate(trackX, currentIndex * -windowWidth, { type: 'spring', stiffness: 400, damping: 40 })
    }
  }, [currentIndex, trackX, windowWidth])

  useEffect(() => {
    const mainElement = document.getElementById('dashboard-swipe-area')
    if (!mainElement || window.innerWidth >= 1024) return

    let startX = 0
    let startY = 0
    let startTrackX = 0
    let isSwiping = false
    let isHorizontal = false

    const swipeRoutes = getSwipeRoutes()
    if (!swipeRoutes.includes(pathname)) return
    const currentIndex = swipeRoutes.indexOf(pathname)

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches[0].clientX < 30 || e.touches[0].clientX > window.innerWidth - 30) {
        return // Ignore edge swipes to let iOS do its thing if needed, or catch it.
      }
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      startTrackX = trackX.get()
      isSwiping = true
      isSwipingRef.current = true
      isHorizontal = false
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isSwiping) return
      
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY

      if (!isHorizontal && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        let node = e.target as HTMLElement | null
        let inScrollable = false
        while (node && node !== mainElement) {
          if (node.scrollWidth > node.clientWidth) {
            const style = window.getComputedStyle(node)
            if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
              inScrollable = true
              break
            }
          }
          node = node.parentElement
        }
        
        if (inScrollable) {
           isSwiping = false
           isSwipingRef.current = false
           return
        }
        
        isHorizontal = true
      } else if (!isHorizontal && Math.abs(dy) > 10) {
        isSwiping = false
        isSwipingRef.current = false
        return
      }

      if (isHorizontal) {
        if (e.cancelable) {
          e.preventDefault() // Block browser back/forward and pull-to-refresh
        }
        
        trackX.set(startTrackX + dx)
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!isSwiping || !isHorizontal) {
        isSwiping = false
        isSwipingRef.current = false
        isHorizontal = false
        return
      }
      const dragDistance = trackX.get() - startTrackX
      let visualStartIndex = Math.round(-startTrackX / windowWidth)
      
      if (dragDistance < -50 && visualStartIndex < swipeRoutes.length - 1) {
        visualStartIndex += 1
      } else if (dragDistance > 50 && visualStartIndex > 0) {
        visualStartIndex -= 1
      }
      
      // Clamp just in case
      visualStartIndex = Math.max(0, Math.min(visualStartIndex, swipeRoutes.length - 1))

      animate(trackX, visualStartIndex * -windowWidth, { type: 'spring', stiffness: 400, damping: 40 })
      
      if (visualStartIndex !== currentIndex) {
        navigate(swipeRoutes[visualStartIndex])
      }
      
      isSwiping = false
      isSwipingRef.current = false
      isHorizontal = false
    }

    mainElement.addEventListener('touchstart', onTouchStart, { passive: false })
    mainElement.addEventListener('touchmove', onTouchMove, { passive: false })
    mainElement.addEventListener('touchend', onTouchEnd)

    return () => {
      mainElement.removeEventListener('touchstart', onTouchStart)
      mainElement.removeEventListener('touchmove', onTouchMove)
      mainElement.removeEventListener('touchend', onTouchEnd)
    }
  }, [pathname, navigate, role, trackX, currentIndex, swipeRoutes])

  const variants = {
    enter: { opacity: 0, scale: 0.98 },
    center: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 }
  }

  return (
    <div className="h-screen bg-light-base dark:bg-dark-base flex flex-col overflow-hidden touch-pan-y overscroll-x-none">
      <Navbar title={title} />
      
      <main id="dashboard-swipe-area" className="flex-1 relative overflow-hidden">
        {isSwipeRoute ? (
          <motion.div 
            style={{ x: trackX, width: `${swipeRoutes.length * 100}%` }}
            className="flex h-full min-h-full flex-nowrap"
          >
            {swipeRoutes.map((route, idx) => (
              <div key={route} style={{ width: `${100 / swipeRoutes.length}%` }} className="h-full shrink-0">
                <AnimatedTab idx={idx} trackX={trackX} windowWidth={windowWidth}>
                  <LazyTab isNear={Math.abs(idx - currentIndex) <= 1}>
                    <Suspense fallback={<TabFallback />}>
                      {routeComponents[route]}
                    </Suspense>
                  </LazyTab>
                </AnimatedTab>
              </div>
            ))}
          </motion.div>
        ) : (
          <div className="h-full w-full overflow-y-auto portal-scroll-region slim-scrollbar p-2.5 sm:p-3.5 lg:p-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div 
                key={pathname}
                className="w-full min-h-full pb-4"
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>
      
      <ToastContainer />
    </div>
  )
}
