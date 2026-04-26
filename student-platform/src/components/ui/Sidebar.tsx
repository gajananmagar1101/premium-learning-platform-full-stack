import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Users, BarChart3, User, X, LogOut, BrainCircuit } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/useAuthStore'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import kluHeaderLogo from '@/assets/klu-header-logo.png'
import { submitActiveQuizOnLogout } from '@/lib/quizSession'

const adminLinks = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/assessments', icon: ClipboardList,   label: 'Assignments' },
  { to: '/quizzes',     icon: BrainCircuit,    label: 'Quizzes' },
  { to: '/students',    icon: Users,           label: 'B.Tech Cohorts' },
  { to: '/reports',     icon: BarChart3,       label: 'Reports' },
  { to: '/profile',     icon: User,            label: 'Profile' },
]

const studentLinks = [
  { to: '/student-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/assessments',       icon: ClipboardList,   label: 'Assignments' },
  { to: '/quizzes',           icon: BrainCircuit,    label: 'Quizzes' },
  { to: '/profile',           icon: User,            label: 'Profile' },
]

interface SidebarProps { open: boolean; onClose: () => void }

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, token, logout } = useAuthStore()
  const navigate = useNavigate()
  const links = user?.role === 'admin' ? adminLinks : studentLinks
  const roleLabel = user?.role === 'admin' ? 'Program Admin' : 'B.Tech Learner'

  const handleLogout = async () => {
    await submitActiveQuizOnLogout(user, token)
    logout()
    navigate('/login')
  }

  const content = (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-light-border dark:border-dark-border">
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/60 bg-white/75 p-1 shadow-sm">
          <img src={kluHeaderLogo} alt="KL University" className="h-full w-full object-contain" />
        </div>
        <div>
          <p className="text-sm font-bold text-light-ink-primary dark:text-dark-ink-primary">KL U</p>
          <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Academic Command Center</p>
        </div>
        <button onClick={onClose} className="ml-auto lg:hidden p-1.5 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover text-light-ink-muted dark:text-dark-ink-muted">
          <X size={15} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={onClose}
            className={({ isActive }) => cn('nav-link', isActive && 'active')}>
            {({ isActive }) => (
              <>
                <div className={cn('p-1.5 rounded-lg transition-colors',
                  isActive ? 'bg-accent/20' : 'bg-light-card2 dark:bg-dark-card2')}>
                  <Icon size={15} className={isActive ? 'text-indigo-400' : 'text-light-ink-muted dark:text-dark-ink-muted'} />
                </div>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="mt-auto px-3 py-4 border-t border-light-border dark:border-dark-border space-y-1 bg-light-card dark:bg-dark-card">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary truncate">{user?.name}</p>
            <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">{roleLabel}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-light-ink-muted dark:text-dark-ink-muted hover:bg-red-500/10 hover:text-red-400 transition-colors">
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-light-card dark:bg-dark-card border-r border-light-border dark:border-dark-border h-screen overflow-hidden shrink-0">
        {content}
      </aside>

      {/* Mobile */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose} className="fixed inset-0 bg-black/60 z-30 lg:hidden" />
            <motion.aside
              initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-60 bg-light-card dark:bg-dark-card border-r border-light-border dark:border-dark-border shadow-2xl z-40 lg:hidden">
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
