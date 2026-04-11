import { useNavigate } from 'react-router-dom'
import { GraduationCap, ShieldCheck, User, BarChart3, BookOpen, Users } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  { icon: BarChart3, label: 'Placement Analytics' },
  { icon: BookOpen, label: 'Lab & Theory Work' },
  { icon: Users, label: 'B.Tech Cohorts' },
]

export function Login() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-light-base dark:bg-dark-base flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl mb-4 shadow-glow">
            <GraduationCap size={30} className="text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-light-ink-primary dark:text-dark-ink-primary">B.Tech Hub</h1>
          <p className="text-sm text-light-ink-muted dark:text-dark-ink-muted mt-1">Engineering academic workspace for departments, learners, and outcomes</p>
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            {features.map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-light-card2 dark:bg-dark-card2 border border-light-border dark:border-dark-border text-xs text-light-ink-secondary dark:text-dark-ink-secondary font-medium">
                <Icon size={11} className="text-indigo-400" /> {label}
              </span>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="card p-6">
          <p className="text-sm font-semibold text-light-ink-secondary dark:text-dark-ink-secondary mb-2 text-center">Enter the B.Tech portal</p>
          <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted text-center mb-6">Choose the workspace you want to continue with</p>

          <div className="space-y-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/login/admin')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all group">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl group-hover:bg-indigo-500/30 transition-colors">
                <ShieldCheck size={22} className="text-indigo-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">Faculty / Program Admin</p>
                <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Manage cohorts, assignments, and performance insights</p>
              </div>
              <span className="text-indigo-400 font-bold">→</span>
            </motion.button>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/login/student')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all group">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors">
                <User size={22} className="text-emerald-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-light-ink-primary dark:text-dark-ink-primary">B.Tech Learner</p>
                <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted">Track progress, submissions, and semester performance</p>
              </div>
              <span className="text-emerald-400 font-bold">→</span>
            </motion.button>
          </div>

          <p className="text-xs text-light-ink-muted dark:text-dark-ink-muted text-center mt-5">
            No account?{' '}
            <button onClick={() => navigate('/register')} className="text-indigo-400 hover:text-indigo-300 font-medium">
              Create one →
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
