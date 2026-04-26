import { useMemo } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BookOpenCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Moon,
  PencilLine,
  SearchCheck,
  Sun,
  UserCircle2,
  UsersRound,
} from 'lucide-react'
import { LayoutGroup, motion } from 'framer-motion'
import { useAuthStore } from '@/store/useAuthStore'
import { useUIStore } from '@/store/useUIStore'
import { NotificationPanel } from './NotificationPanel'
import { SearchBar } from './SearchBar'
import { cn } from '@/lib/utils'

interface NavbarProps { title: string }

type TopLink = { to: string; label: string; icon: typeof LayoutDashboard }

const isLinkActive = (pathname: string, to: string) => {
  if (to === '/dashboard') return pathname === '/dashboard'
  if (to === '/student-dashboard') return pathname === '/student-dashboard'
  if (to === '/quizzes') return pathname === '/quizzes' || pathname.startsWith('/quizzes/')
  if (to === '/students') return pathname === '/students' || pathname.startsWith('/students/')
  return pathname === to
}

export function Navbar({ title }: NavbarProps) {
  const { user, logout } = useAuthStore()
  const { darkMode, toggleDarkMode } = useUIStore()
  const navigate = useNavigate()
  const location = useLocation()
  const initial = user?.name?.charAt(0).toUpperCase() ?? 'U'
  const roleLabel = user?.role === 'admin' ? 'Program Admin' : 'B.Tech Learner'

  const topLinks = useMemo<TopLink[]>(() => {
    if (user?.role === 'admin') {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/assessments', label: 'Assignments', icon: BookOpenCheck },
        { to: '/quizzes', label: 'Quizzes', icon: SearchCheck },
        { to: '/students', label: 'B.Tech Cohorts', icon: UsersRound },
        { to: '/reports', label: 'Reports', icon: BarChart3 },
      ]
    }

    return [
      { to: '/student-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/assessments', label: 'Assignments', icon: BookOpenCheck },
      { to: '/quizzes', label: 'Quizzes', icon: SearchCheck },
      { to: '/profile', label: 'Profile', icon: UserCircle2 },
    ]
  }, [user?.role])

  const menuItems = useMemo(() => {
    if (user?.role === 'admin') {
      return [
        { to: '/profile', icon: UserCircle2, label: 'My Profile' },
        { to: '/profile?mode=edit', icon: PencilLine, label: 'Edit Profile' },
        { to: '/dashboard', icon: LayoutDashboard, label: 'Go to Dashboard' },
      ]
    }

    return [
      { to: '/profile', icon: UserCircle2, label: 'My Profile' },
      { to: '/profile?mode=edit', icon: PencilLine, label: 'Edit Profile' },
      { to: '/student-dashboard', icon: LayoutDashboard, label: 'Go to Dashboard' },
    ]
  }, [user?.role])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="top-navbar sticky top-0 z-20 border-b border-white/45 bg-white/75 shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-[#071225]/95">
      <div className="flex items-center gap-3 px-3 py-3 lg:px-6">
        <div className="order-last">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="profile-pill flex shrink-0 items-center gap-2 rounded-full border border-indigo-300/70 bg-gradient-to-r from-white/85 to-indigo-50/80 px-3 py-2 text-left shadow-sm transition-colors hover:from-white hover:to-indigo-100 dark:border-indigo-500/40 dark:from-slate-900/90 dark:to-indigo-950/80 dark:hover:to-indigo-900/80"
              aria-label="Open profile menu"
            >
              <div className="glass-icon h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-glow-sm">
                {initial}
              </div>
              <span className="hidden max-w-40 truncate text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary md:block">{user?.name}</span>
            </motion.button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={10}
              className="z-50 w-72 overflow-hidden rounded-2xl border border-light-border bg-light-card p-2 shadow-2xl dark:border-dark-border dark:bg-dark-card"
            >
              <div className="mb-1 rounded-xl border border-light-border bg-light-card2/70 p-3 dark:border-dark-border dark:bg-dark-card2/80">
                <p className="truncate text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">{user?.name}</p>
                <p className="truncate text-xs text-light-ink-muted dark:text-dark-ink-muted">{user?.email}</p>
                <span className="mt-2 inline-block rounded-full bg-indigo-500/12 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  {roleLabel}
                </span>
              </div>

              <div className="space-y-1">
                {menuItems.map(({ to, icon: Icon, label }) => (
                  <DropdownMenu.Item
                    key={to}
                    onSelect={() => navigate(to)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none transition-colors',
                      isLinkActive(location.pathname, to.split('?')[0])
                        ? 'bg-indigo-500/12 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                        : 'text-light-ink-secondary hover:bg-light-hover dark:text-dark-ink-secondary dark:hover:bg-dark-hover'
                    )}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </DropdownMenu.Item>
                ))}
              </div>

              <DropdownMenu.Separator className="my-2 h-px bg-light-border dark:bg-dark-border" />

              <button
                onClick={handleLogout}
                className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
              >
                <span className="inline-flex items-center gap-2">
                  <LogOut size={16} />
                  Logout
                </span>
              </button>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        </div>

        <button
          onClick={() => navigate(user?.role === 'admin' ? '/dashboard' : '/student-dashboard')}
          className="brand-pill glass-surface flex shrink-0 items-center gap-2 rounded-full px-2.5 py-2 transition-colors hover:bg-white/80 dark:border-white/15 dark:bg-slate-900/85 dark:text-white dark:hover:bg-slate-800/90"
          title={title}
        >
          <span className="glass-icon h-8 w-8 rounded-full">
            <GraduationCap size={16} />
          </span>
          <span className="hidden text-sm font-bold text-light-ink-primary dark:text-dark-ink-primary sm:block">B.Tech Hub</span>
        </button>

        <nav className="hide-scrollbar min-w-0 flex-1 overflow-x-auto">
          <LayoutGroup id="top-navigation">
          <div className="nav-switch flex w-max items-center gap-1 rounded-full border border-white/60 bg-white/60 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/20 dark:bg-slate-900/80 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_34px_rgba(0,0,0,0.3)]">
            {topLinks.map((link) => {
              const Icon = link.icon
              const active = isLinkActive(location.pathname, link.to)
              return (
              <NavLink
                key={link.to}
                to={link.to}
                className={cn(
                  'nav-switch-link relative isolate inline-flex items-center gap-2 overflow-hidden rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200',
                  active
                    ? 'is-active text-indigo-600 dark:text-white'
                    : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="nav-active-pill absolute inset-0 -z-10 rounded-full bg-indigo-50/95 shadow-[0_8px_24px_rgba(79,70,229,0.28)] ring-2 ring-indigo-500/80 dark:bg-indigo-500/45 dark:shadow-[0_8px_28px_rgba(99,102,241,0.26)] dark:ring-indigo-300/50"
                    transition={{ type: 'spring', stiffness: 460, damping: 38, mass: 0.8 }}
                  />
                )}
                <Icon size={16} className={cn('shrink-0 transition-colors duration-200', active && 'text-indigo-500 dark:text-indigo-100')} />
                <span className="relative">{link.label}</span>
              </NavLink>
              )
            })}
          </div>
          </LayoutGroup>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <SearchBar />
          <button
            onClick={toggleDarkMode}
            title="Toggle theme"
            className="theme-pill glass-surface rounded-full p-2 text-light-ink-secondary transition-colors hover:bg-white/80 hover:text-light-ink-primary dark:border-white/15 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800/90 dark:hover:text-white"
          >
            {darkMode
              ? <Sun size={17} className="text-amber-400" />
              : <Moon size={17} className="text-light-ink-secondary dark:text-dark-ink-secondary" />}
          </button>
          <NotificationPanel />
        </div>
      </div>
    </header>
  )
}
