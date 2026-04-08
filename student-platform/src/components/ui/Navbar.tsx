import { Menu, Moon, Sun } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useUIStore } from '@/store/useUIStore'
import { NotificationPanel } from './NotificationPanel'
import { SearchBar } from './SearchBar'

interface NavbarProps { onMenuClick: () => void; title: string }

export function Navbar({ onMenuClick, title }: NavbarProps) {
  const { user } = useAuthStore()
  const { darkMode, toggleDarkMode } = useUIStore()

  return (
    <header className="sticky top-0 z-20 bg-light-card dark:bg-dark-card border-b border-light-border dark:border-dark-border px-4 lg:px-6 py-3 flex items-center gap-3 shadow-card">
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-xl hover:bg-light-hover dark:hover:bg-dark-hover transition-colors text-light-ink-secondary dark:text-dark-ink-secondary">
        <Menu size={20} />
      </button>

      <h1 className="text-base font-bold text-light-ink-primary dark:text-dark-ink-primary mr-2">{title}</h1>

      <div className="flex-1">
        <SearchBar />
      </div>

      <div className="flex items-center gap-1">
        <button onClick={toggleDarkMode} title="Toggle theme"
          className="p-2 rounded-xl hover:bg-light-hover dark:hover:bg-dark-hover transition-colors">
          {darkMode
            ? <Sun size={17} className="text-amber-400" />
            : <Moon size={17} className="text-light-ink-secondary dark:text-dark-ink-secondary" />}
        </button>

        <NotificationPanel />

        <div className="flex items-center gap-2 pl-3 border-l border-light-border dark:border-dark-border ml-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-glow-sm">
            {user?.name.charAt(0)}
          </div>
          <span className="hidden sm:block text-sm font-medium text-light-ink-primary dark:text-dark-ink-primary">{user?.name}</span>
        </div>
      </div>
    </header>
  )
}
